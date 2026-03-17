package main

import (
	"encoding/json"
	"fmt"
	"log"
	"os"
	"path/filepath"

	sdk "github.com/JSREI/force-fuck-captcha-background/go-sdk/captcha_background_sdk"
)

func main() {
	if len(os.Args) < 4 {
		fmt.Println("Usage: go run local_restore.go <input_dir> <output_dir>")
		fmt.Println("Example: go run local_restore.go ./captcha_images ./restored_backgrounds")
		os.Exit(1)
	}

	inputDir := os.Args[1]
	outputDir := os.Args[2]

	// Progress callback
	progressCallback := func(processed, total int, currentPath string) {
		percent := float64(processed) * 100.0 / float64(total)
		fmt.Printf("\rProgress: %.1f%% (%d/%d) - %s", percent, processed, total, filepath.Base(currentPath))
	}

	// Create config
	config := sdk.LocalRestoreConfig{
		InputDir:               inputDir,
		OutputDir:              outputDir,
		ClearOutputBeforeRun:   true,
		Recursive:              true,
		MaxErrorItems:          200,
		ProgressCallback:       progressCallback,
	}

	fmt.Println("Starting local restore...")

	// Run restore
	summary, err := sdk.RunLocalRestore(config)
	if err != nil {
		log.Fatalf("Local restore failed: %v", err)
	}

	fmt.Println("\n\nLocal restore complete!")
	fmt.Printf("Total images: %d\n", summary.TotalImages)
	fmt.Printf("Bucket count: %d\n", summary.BucketCount)
	fmt.Printf("Output files: %d\n", summary.OutputFiles)

	// Print bucket details
	fmt.Println("\nBucket details:")
	for _, bucket := range summary.Buckets {
		fmt.Printf("  %s: %d images -> %s\n", bucket.BucketID, bucket.ImageCount, bucket.OutputPath)
	}

	// Save summary JSON
	summaryPath := filepath.Join(outputDir, "restore_summary.json")
	summaryData, err := json.MarshalIndent(summary, "", "  ")
	if err != nil {
		log.Printf("Failed to marshal summary: %v", err)
	} else {
		if err := os.WriteFile(summaryPath, summaryData, 0644); err != nil {
			log.Printf("Failed to write summary: %v", err)
		} else {
			fmt.Printf("\nSummary saved to: %s\n", summaryPath)
		}
	}
}
