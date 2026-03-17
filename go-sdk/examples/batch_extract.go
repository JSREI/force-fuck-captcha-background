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
		fmt.Println("Usage: go run batch_extract.go <background_dir> <input_dir> <output_json>")
		fmt.Println("Example: go run batch_extract.go ./backgrounds ./captcha_images ./batch_result.json")
		os.Exit(1)
	}

	backgroundDir := os.Args[1]
	inputDir := os.Args[2]
	outputJSON := os.Args[3]

	// Create SDK
	recognizer := sdk.NewCaptchaRecognizer(nil)

	// Build background index
	fmt.Println("Building background index...")
	_, err := recognizer.BuildBackgroundIndex(backgroundDir, true, nil)
	if err != nil {
		log.Fatalf("Failed to build background index: %v", err)
	}

	// Create batch processor
	processor := sdk.NewBatchProcessor(recognizer)

	// Extract features
	fmt.Println("Extracting glyph features...")
	result, err := processor.ExtractFontGlyphFeatures(
		inputDir,
		32, 32, // target size
		true,   // recursive
		nil,    // all extensions
		0,      // no limit
		false,  // don't include payload
		true,   // continue on error
	)
	if err != nil {
		log.Fatalf("Batch extraction failed: %v", err)
	}

	// Print summary
	fmt.Printf("\nBatch extraction complete!\n")
	fmt.Printf("Total files: %d\n", result.TotalFiles)
	fmt.Printf("Processed: %d\n", result.ProcessedFiles)
	fmt.Printf("Success: %d\n", result.SuccessCount)
	fmt.Printf("Errors: %d\n", result.ErrorCount)

	// Save results
	resultJSON, err := json.MarshalIndent(result, "", "  ")
	if err != nil {
		log.Fatalf("Failed to marshal results: %v", err)
	}

	if err := os.WriteFile(outputJSON, resultJSON, 0644); err != nil {
		log.Fatalf("Failed to write results: %v", err)
	}

	fmt.Printf("Results saved to: %s\n", outputJSON)

	// Print error details if any
	if result.ErrorCount > 0 {
		fmt.Println("\nErrors:")
		for _, item := range result.Items {
			if item.Status == "error" && item.Error != nil {
				fmt.Printf("  %s: %s\n", filepath.Base(item.CaptchaPath), *item.Error)
			}
		}
	}
}
