package captcha_background_sdk

import (
	"encoding/json"
	"fmt"
	"image/color"
	"os"
	"path/filepath"
	"sort"
)

// LocalRestoreRunner executes the local background restoration workflow.
// It groups similar captcha images by their corner pixels, then uses majority voting
// to reconstruct the original background image from multiple captcha variants.
type LocalRestoreRunner struct {
	config LocalRestoreConfig // Configuration for the restoration process
}

// NewLocalRestoreRunner creates a new runner for local background restoration.
// The config specifies input/output directories, grouping strategy, and processing options.
func NewLocalRestoreRunner(config LocalRestoreConfig) *LocalRestoreRunner {
	return &LocalRestoreRunner{config: config}
}

// Run executes the complete local restore workflow.
// It performs the following steps:
//   1. Clears output directory if requested
//   2. Collects all image files from input directory
//   3. Groups images by "bucket ID" (derived from image properties)
//   4. For each bucket, performs majority voting to restore the background
//   5. Saves restored backgrounds and metadata
//
// Returns a LocalRestoreSummary with statistics about the restoration process.
func (r *LocalRestoreRunner) Run() (*LocalRestoreSummary, error) {
	config := r.config

	// Clear output if requested
	if config.ClearOutputBeforeRun {
		if err := os.RemoveAll(config.OutputDir); err != nil {
			return nil, fmt.Errorf("failed to clear output directory: %w", err)
		}
	}

	// Create output directory
	if err := os.MkdirAll(config.OutputDir, 0755); err != nil {
		return nil, fmt.Errorf("failed to create output directory: %w", err)
	}

	// Collect image files
	files, err := r.collectImageFiles(config.InputDir, config.Recursive)
	if err != nil {
		return nil, fmt.Errorf("failed to collect image files: %w", err)
	}

	if len(files) == 0 {
		return nil, fmt.Errorf("no image files found in input directory")
	}

	// Group files by bucket ID
	buckets := r.groupByBucket(files, config)

	// Process each bucket
	var bucketSummaries []BucketSummary
	totalImages := 0
	outputFiles := 0

	bucketIDs := make([]string, 0, len(buckets))
	for id := range buckets {
		bucketIDs = append(bucketIDs, id)
	}
	sort.Strings(bucketIDs)

	processedCount := 0
	for _, bucketID := range bucketIDs {
		if config.StopChecker != nil && config.StopChecker() {
			break
		}

		bucket := buckets[bucketID]
		totalImages += len(bucket)

		outputPath, err := r.restoreBucket(bucketID, bucket, config)
		if err != nil {
			// Log error but continue
			fmt.Fprintf(os.Stderr, "Error restoring bucket %s: %v\n", bucketID, err)
			continue
		}

		bucketSummaries = append(bucketSummaries, BucketSummary{
			BucketID:   bucketID,
			ImageCount: len(bucket),
			ImagePaths: bucket,
			OutputPath: outputPath,
		})

		if outputPath != "" {
			outputFiles++
		}

		processedCount++
		if config.ProgressCallback != nil {
			config.ProgressCallback(processedCount, len(bucketIDs), outputPath)
		}
	}

	// Generate summary
	summary := &LocalRestoreSummary{
		BucketCount: len(bucketSummaries),
		OutputFiles: outputFiles,
		TotalImages: totalImages,
		Buckets:     bucketSummaries,
		OutputDir:   config.OutputDir,
	}

	// Save summary JSON
	summaryPath := filepath.Join(config.OutputDir, "summary.json")
	summaryJSON, err := json.MarshalIndent(summary, "", "  ")
	if err != nil {
		return nil, fmt.Errorf("failed to marshal summary: %w", err)
	}

	if err := os.WriteFile(summaryPath, summaryJSON, 0644); err != nil {
		return nil, fmt.Errorf("failed to write summary: %w", err)
	}
	summary.SummaryPath = summaryPath

	return summary, nil
}

// collectImageFiles collects all image files from input directory
func (r *LocalRestoreRunner) collectImageFiles(inputDir string, recursive bool) ([]string, error) {
	var files []string

	walkFunc := func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}

		if info.IsDir() {
			if !recursive && path != inputDir {
				return filepath.SkipDir
			}
			return nil
		}

		if IsImageFile(path) {
			absPath, err := filepath.Abs(path)
			if err != nil {
				return err
			}
			files = append(files, absPath)
		}

		return nil
	}

	if err := filepath.Walk(inputDir, walkFunc); err != nil {
		return nil, err
	}

	return files, nil
}

// groupByBucket groups files by their bucket ID (group_id)
func (r *LocalRestoreRunner) groupByBucket(files []string, config LocalRestoreConfig) map[string][]string {
	buckets := make(map[string][]string)

	for _, path := range files {
		if config.StopChecker != nil && config.StopChecker() {
			break
		}

		groupID, err := ComputeGroupID(path)
		if err != nil {
			// Skip files that can't be processed
			continue
		}

		buckets[groupID] = append(buckets[groupID], path)
	}

	return buckets
}

// restoreBucket restores a single bucket by voting
func (r *LocalRestoreRunner) restoreBucket(bucketID string, files []string, config LocalRestoreConfig) (string, error) {
	if len(files) == 0 {
		return "", nil
	}

	// Load all images in bucket
	var images []*RGBAPixels
	for _, path := range files {
		pixels, err := LoadRgbaPixels(path)
		if err != nil {
			continue
		}
		images = append(images, pixels)
	}

	if len(images) == 0 {
		return "", fmt.Errorf("no valid images in bucket")
	}

	// All images should have same dimensions
	width := images[0].Width
	height := images[0].Height

	// Vote for each pixel position
	restoredPixels := r.voteForPixels(images, width, height)

	// Save restored image
	safeBucketID := sanitizeFilename(bucketID)
	outputPath := filepath.Join(config.OutputDir, safeBucketID+".png")

	if err := SavePng(restoredPixels, outputPath); err != nil {
		return "", fmt.Errorf("failed to save restored image: %w", err)
	}

	return outputPath, nil
}

// voteForPixels votes for the best pixel value at each position
func (r *LocalRestoreRunner) voteForPixels(images []*RGBAPixels, width, height int) *RGBAPixels {
	restored := CreateTransparentImage(width, height)

	for y := 0; y < height; y++ {
		for x := 0; x < width; x++ {
			// Count occurrences of each color
			type colorKey struct{ R, G, B, A uint8 }
			colorCounts := make(map[colorKey]int)
			for _, img := range images {
				if x < img.Width && y < img.Height {
					c := img.GetPixel(x, y)
					key := colorKey{c.R, c.G, c.B, c.A}
					colorCounts[key]++
				}
			}

			// Find the most common color
			var bestColor colorKey
			maxCount := 0
			for color, count := range colorCounts {
				if count > maxCount {
					maxCount = count
					bestColor = color
				}
			}

			restored.SetPixel(x, y, color.RGBA{
				R: bestColor.R,
				G: bestColor.G,
				B: bestColor.B,
				A: bestColor.A,
			})
		}
	}

	return restored
}

// sanitizeFilename sanitizes a string for use as a filename
func sanitizeFilename(s string) string {
	// Replace problematic characters
	result := ""
	for _, c := range s {
		switch c {
		case '/', '\\', ':', '*', '?', '"', '<', '>', '|':
			result += "_"
		default:
			result += string(c)
		}
	}
	return result
}

// RunLocalRestore is a convenience function to run local restore
func RunLocalRestore(config LocalRestoreConfig) (*LocalRestoreSummary, error) {
	runner := NewLocalRestoreRunner(config)
	return runner.Run()
}
