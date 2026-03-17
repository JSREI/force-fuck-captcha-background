package captcha_background_sdk

import (
	"fmt"
	"os"
	"path/filepath"
)

// BatchProcessor processes multiple captcha images in batch mode.
// It extracts glyph features from all images in a directory and aligns them
// to standardized dimensions for machine learning applications.
type BatchProcessor struct {
	recognizer *CaptchaRecognizer // Reference to the captcha recognizer with background index
}

// NewBatchProcessor creates a new batch processor using the provided recognizer.
// The recognizer must have a background index built before processing.
func NewBatchProcessor(recognizer *CaptchaRecognizer) *BatchProcessor {
	return &BatchProcessor{recognizer: recognizer}
}

// ExtractFontGlyphFeatures extracts glyph features from all captcha images in a directory.
// It collects all matching files, extracts glyphs from each, and aligns them to target dimensions.
//
// Parameters:
//   - inputDir: Directory containing captcha images
//   - targetWidth: Target width for extracted glyph bitmaps
//   - targetHeight: Target height for extracted glyph bitmaps
//   - recursive: If true, recursively scan subdirectories
//   - exts: List of file extensions to process (e.g., [".png", ".jpg"])
//   - limit: Maximum number of files to process (0 = unlimited)
//   - includePayload: If true, include binary payload data in results
//   - continueOnError: If true, continue processing if individual files fail
//
// Returns a BatchGlyphExtractResult containing extracted features and statistics.
func (p *BatchProcessor) ExtractFontGlyphFeatures(
	inputDir string,
	targetWidth int,
	targetHeight int,
	recursive bool,
	exts []string,
	limit int,
	includePayload bool,
	continueOnError bool,
) (*BatchGlyphExtractResult, error) {
	// Collect files
	files, err := p.collectFiles(inputDir, recursive, exts)
	if err != nil {
		return nil, err
	}

	if limit > 0 && len(files) > limit {
		files = files[:limit]
	}

	var items []BatchGlyphExtractItem
	successCount := 0
	errorCount := 0

	for _, path := range files {
		glyphExtractor := NewFontGlyphExtractor(p.recognizer.Font)
		glyphResult, err := glyphExtractor.ExtractGlyphs(path, false, false)

		if err != nil {
			errorCount++
			errStr := err.Error()
			items = append(items, BatchGlyphExtractItem{
				CaptchaPath: path,
				Status:      "error",
				Error:       &errStr,
			})
			if !continueOnError {
				break
			}
			continue
		}

		// Extract features
		featureExtractor := NewGlyphFeatureExtractor()
		features := featureExtractor.ExtractFeaturesFromGlyphs(
			glyphResult.Glyphs,
			targetWidth,
			targetHeight,
			true,
		)

		featureResult := &FontGlyphFeatureExtractResult{
			GroupID:        glyphResult.GroupID,
			BackgroundPath: glyphResult.BackgroundPath,
			ImageSize:      glyphResult.ImageSize,
			TargetSize:     [2]int{targetWidth, targetHeight},
			GlyphFeatures:  features,
			Stats: map[string]int{
				"glyph_count": len(features),
			},
		}

		successCount++
		item := BatchGlyphExtractItem{
			CaptchaPath: path,
			Status:      "ok",
			GroupID:     &glyphResult.GroupID,
			GlyphCount:  len(features),
			Result:      featureResult,
		}
		if !includePayload {
			item.Result = nil
		}
		items = append(items, item)
	}

	return &BatchGlyphExtractResult{
		InputDir:       inputDir,
		TotalFiles:     len(files),
		ProcessedFiles: len(items),
		SuccessCount:   successCount,
		ErrorCount:     errorCount,
		TargetSize:     [2]int{targetWidth, targetHeight},
		Items:          items,
	}, nil
}

// collectFiles collects all image files from a directory
func (p *BatchProcessor) collectFiles(dir string, recursive bool, exts []string) ([]string, error) {
	if len(exts) == 0 {
		exts = []string{".png", ".jpg", ".jpeg", ".gif", ".bmp"}
	}

	var files []string
	walkFunc := func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}
		if info.IsDir() {
			if !recursive && path != dir {
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

	if err := filepath.Walk(dir, walkFunc); err != nil {
		return nil, err
	}

	return files, nil
}

// ExportGlyphImages exports glyph images for all captchas in a directory
func (p *BatchProcessor) ExportGlyphImages(
	inputDir string,
	outputDir string,
	renderMode GlyphRenderMode,
	recursive bool,
) error {
	// Collect files
	files, err := p.collectFiles(inputDir, recursive, nil)
	if err != nil {
		return err
	}

	for _, path := range files {
		// Extract glyphs
		glyphExtractor := NewFontGlyphExtractor(p.recognizer.Font)
		glyphResult, err := glyphExtractor.ExtractGlyphs(path, false, false)
		if err != nil {
			continue
		}

		// Load captcha pixels
		captchaPixels, err := LoadRgbaPixels(path)
		if err != nil {
			continue
		}

		// Create output directory for this captcha
		baseName := filepath.Base(path)
		captchaDir := filepath.Join(outputDir, baseName+"_glyphs")

		// Export images
		_, err = ExportGlyphImages(
			glyphResult.Glyphs,
			captchaPixels,
			captchaDir,
			"glyph",
			renderMode,
		)
		if err != nil {
			fmt.Fprintf(os.Stderr, "Error exporting glyphs for %s: %v\n", path, err)
		}
	}

	return nil
}
