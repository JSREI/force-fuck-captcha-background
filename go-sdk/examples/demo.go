package main

import (
	"encoding/json"
	"fmt"
	"log"
	"os"

	sdk "github.com/JSREI/force-fuck-captcha-background/go-sdk/captcha_background_sdk"
)

func main() {
	if len(os.Args) < 3 {
		fmt.Println("Usage: go run demo.go <background_dir> <captcha_path>")
		fmt.Println("Example: go run demo.go ./backgrounds ./captcha.png")
		os.Exit(1)
	}

	backgroundDir := os.Args[1]
	captchaPath := os.Args[2]

	// Create SDK with default options
	recognizer := sdk.NewCaptchaRecognizer(nil)

	// Build background index
	fmt.Println("Building background index...")
	index, err := recognizer.BuildBackgroundIndex(backgroundDir, true, nil)
	if err != nil {
		log.Fatalf("Failed to build background index: %v", err)
	}
	fmt.Printf("Indexed %d backgrounds\n", len(index))

	// Recognize text
	fmt.Println("\nRecognizing text...")
	textResult, err := recognizer.RecognizeText(captchaPath, true)
	if err != nil {
		log.Printf("Text recognition failed: %v", err)
	} else {
		fmt.Printf("Found %d text regions\n", len(textResult.Regions))
		for i, region := range textResult.Regions {
			fmt.Printf("  Region %d: bbox=(%d,%d,%d,%d), pixels=%d\n",
				i+1,
				region.BBox[0], region.BBox[1], region.BBox[2], region.BBox[3],
				region.PixelCount)
		}
	}

	// Recognize font components
	fmt.Println("\nRecognizing font components...")
	fontResult, err := recognizer.RecognizeFont(captchaPath, true)
	if err != nil {
		log.Printf("Font recognition failed: %v", err)
	} else {
		fmt.Printf("Found %d font components\n", len(fontResult.Components))
		for i, comp := range fontResult.Components {
			fmt.Printf("  Component %d: bbox=(%d,%d,%d,%d), color=(%d,%d,%d), pixels=%d\n",
				i+1,
				comp.BBox[0], comp.BBox[1], comp.BBox[2], comp.BBox[3],
				comp.Color[0], comp.Color[1], comp.Color[2],
				comp.PixelCount)
		}
	}

	// Recognize slider
	fmt.Println("\nRecognizing slider...")
	sliderResult, err := recognizer.RecognizeSlider(captchaPath)
	if err != nil {
		log.Printf("Slider recognition failed: %v", err)
	} else {
		if sliderResult.Gap != nil {
			fmt.Printf("Found slider gap: center=(%d,%d), size=%dx%d, pixels=%d\n",
				sliderResult.Gap.Center[0], sliderResult.Gap.Center[1],
				sliderResult.Gap.BBox[2]-sliderResult.Gap.BBox[0]+1,
				sliderResult.Gap.BBox[3]-sliderResult.Gap.BBox[1]+1,
				sliderResult.Gap.PixelCount)
		} else {
			fmt.Println("No slider gap found")
		}
	}

	// Auto-detect captcha type
	fmt.Println("\nAuto-detecting captcha type...")
	autoResult, err := recognizer.RecognizeAuto(captchaPath, nil, true)
	if err != nil {
		log.Printf("Auto detection failed: %v", err)
	} else {
		fmt.Printf("Detected type: %s (confidence: %.2f)\n", autoResult.DetectedType, autoResult.Confidence)
		fmt.Printf("Reason: %s\n", autoResult.Reason)

		// Print stats
		statsJSON, _ := json.MarshalIndent(autoResult.Stats, "", "  ")
		fmt.Printf("Stats:\n%s\n", string(statsJSON))
	}

	// Restore background
	fmt.Println("\nRestoring background...")
	outputPath := "./restored_background.png"
	restored, err := recognizer.RestoreBackgroundByCaptcha(captchaPath, &outputPath)
	if err != nil {
		log.Printf("Background restore failed: %v", err)
	} else {
		fmt.Printf("Restored background: %s\n", restored.BackgroundPath)
		if restored.OutputPath != nil {
			fmt.Printf("Output saved to: %s\n", *restored.OutputPath)
		}
	}

	// Background texture analysis
	fmt.Println("\nAnalyzing background texture...")
	pixels, err := sdk.LoadRgbaPixels(captchaPath)
	if err != nil {
		log.Printf("Failed to load image: %v", err)
	} else {
		engine := sdk.NewBackgroundFeatureEngine()
		texture := engine.ExtractTextureMetrics(pixels, 4, 4, 16, 18.0)
		fmt.Printf("Texture metrics:\n")
		fmt.Printf("  Mean intensity: %.4f\n", texture.MeanIntensity)
		fmt.Printf("  Std intensity: %.4f\n", texture.StdIntensity)
		fmt.Printf("  Entropy: %.4f\n", texture.Entropy)
		fmt.Printf("  Edge density: %.4f\n", texture.EdgeDensity)
	}

	// Extract glyphs
	fmt.Println("\nExtracting glyphs...")
	glyphExtractor := sdk.NewFontGlyphExtractor(recognizer.Font)
	glyphResult, err := glyphExtractor.ExtractGlyphs(captchaPath, false, false)
	if err != nil {
		log.Printf("Glyph extraction failed: %v", err)
	} else {
		fmt.Printf("Extracted %d glyphs\n", len(glyphResult.Glyphs))

		// Extract features
		featureExtractor := sdk.NewGlyphFeatureExtractor()
		features := featureExtractor.ExtractFeaturesFromGlyphs(
			glyphResult.Glyphs,
			32, 32, true,
		)
		fmt.Printf("Extracted %d feature vectors (32x32)\n", len(features))
	}

	fmt.Println("\nDemo complete!")
}
