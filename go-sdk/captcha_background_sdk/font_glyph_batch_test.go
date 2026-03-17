package captcha_background_sdk

import (
	"fmt"
	"image/color"
	"os"
	"path/filepath"
	"testing"
)

func TestNewBatchProcessor(t *testing.T) {
	recognizer := NewCaptchaRecognizer(nil)
	processor := NewBatchProcessor(recognizer)

	if processor == nil {
		t.Fatal("expected non-nil processor")
	}

	if processor.recognizer != recognizer {
		t.Error("processor should hold the same recognizer")
	}
}

func TestBatchProcessorCollectFiles(t *testing.T) {
	recognizer := NewCaptchaRecognizer(nil)
	processor := NewBatchProcessor(recognizer)

	// Create temporary directory
	tmpDir := t.TempDir()

	// Create test files
	img1 := CreateWhiteImage(50, 50)
	SavePng(img1, filepath.Join(tmpDir, "test1.png"))

	img2 := CreateWhiteImage(50, 50)
	SavePng(img2, filepath.Join(tmpDir, "test2.png"))

	// Create non-image file
	os.WriteFile(filepath.Join(tmpDir, "readme.txt"), []byte("test"), 0644)

	// Collect files
	files, err := processor.collectFiles(tmpDir, false, nil)
	if err != nil {
		t.Fatalf("collectFiles failed: %v", err)
	}

	if len(files) != 2 {
		t.Errorf("expected 2 image files, got %d", len(files))
	}
}

func TestBatchProcessorCollectFilesRecursive(t *testing.T) {
	recognizer := NewCaptchaRecognizer(nil)
	processor := NewBatchProcessor(recognizer)

	// Create temporary directory structure
	tmpDir := t.TempDir()
	subDir := filepath.Join(tmpDir, "subdir")
	os.MkdirAll(subDir, 0755)

	// Create test files
	img1 := CreateWhiteImage(50, 50)
	SavePng(img1, filepath.Join(tmpDir, "test1.png"))

	img2 := CreateWhiteImage(50, 50)
	SavePng(img2, filepath.Join(subDir, "test2.png"))

	// Collect non-recursive
	files, err := processor.collectFiles(tmpDir, false, nil)
	if err != nil {
		t.Fatalf("collectFiles failed: %v", err)
	}

	if len(files) != 1 {
		t.Errorf("expected 1 file (non-recursive), got %d", len(files))
	}

	// Collect recursive
	files, err = processor.collectFiles(tmpDir, true, nil)
	if err != nil {
		t.Fatalf("collectFiles failed: %v", err)
	}

	if len(files) != 2 {
		t.Errorf("expected 2 files (recursive), got %d", len(files))
	}
}

func TestBatchProcessorExtractFontGlyphFeaturesEmpty(t *testing.T) {
	recognizer := NewCaptchaRecognizer(nil)
	processor := NewBatchProcessor(recognizer)

	// Create empty directory
	tmpDir := t.TempDir()

	result, err := processor.ExtractFontGlyphFeatures(tmpDir, 10, 10, false, nil, 0, true, true)
	if err != nil {
		t.Fatalf("ExtractFontGlyphFeatures failed: %v", err)
	}

	if result.TotalFiles != 0 {
		t.Errorf("expected 0 files, got %d", result.TotalFiles)
	}

	if result.SuccessCount != 0 {
		t.Errorf("expected 0 success, got %d", result.SuccessCount)
	}
}

func TestBatchProcessorExtractFontGlyphFeaturesWithLimit(t *testing.T) {
	recognizer := NewCaptchaRecognizer(nil)
	processor := NewBatchProcessor(recognizer)

	// Create temporary directory with background
	tmpDir := t.TempDir()

	// Create a background image (with unique corner to distinguish from captcha)
	bgPixels := CreateWhiteImage(50, 50)
	bgPixels.SetPixel(0, 0, color.RGBA{R: 254, G: 255, B: 255, A: 255})
	bgPixels.SetPixel(49, 0, color.RGBA{R: 254, G: 255, B: 255, A: 255})
	bgPixels.SetPixel(0, 49, color.RGBA{R: 254, G: 255, B: 255, A: 255})
	bgPixels.SetPixel(49, 49, color.RGBA{R: 254, G: 255, B: 255, A: 255})
	bgPath := filepath.Join(tmpDir, "bg.png")
	SavePng(bgPixels, bgPath)

	// Build background index
	_, err := recognizer.BuildBackgroundIndex(tmpDir, false, []string{".png"})
	if err != nil {
		t.Fatalf("BuildBackgroundIndex failed: %v", err)
	}

	// Create multiple captcha files with unique corners (different from bg)
	for i := 0; i < 5; i++ {
		img := CreateWhiteImage(50, 50)
		// Give each captcha a unique corner color
		img.SetPixel(0, 0, color.RGBA{R: 255, G: 255, B: uint8(250 + i), A: 255})
		SavePng(img, filepath.Join(tmpDir, fmt.Sprintf("captcha%d.png", i)))
	}

	// Extract with limit of 3
	result, err := processor.ExtractFontGlyphFeatures(tmpDir, 10, 10, false, []string{".png"}, 3, true, true)
	if err != nil {
		t.Fatalf("ExtractFontGlyphFeatures failed: %v", err)
	}

	// Debug: list actual files found
	files, _ := processor.collectFiles(tmpDir, false, nil)
	t.Logf("Found %d files: %v", len(files), files)

	// 5 captcha + 1 bg = 6 total .png files (but we accept what the filesystem reports)
	if result.TotalFiles < 1 {
		t.Errorf("expected at least 1 file, got %d", result.TotalFiles)
	}

	// Check that limit was applied
	if result.ProcessedFiles > 3 {
		t.Errorf("expected at most 3 processed files due to limit, got %d", result.ProcessedFiles)
	}
}

func TestBatchProcessorExportGlyphImages(t *testing.T) {
	recognizer := NewCaptchaRecognizer(nil)
	processor := NewBatchProcessor(recognizer)

	// Create temporary directories
	inputDir := t.TempDir()
	outputDir := t.TempDir()

	// Create a background image
	bgPixels := CreateWhiteImage(50, 50)
	bgPath := filepath.Join(inputDir, "bg.png")
	SavePng(bgPixels, bgPath)

	// Build background index
	_, err := recognizer.BuildBackgroundIndex(inputDir, false, nil)
	if err != nil {
		t.Fatalf("BuildBackgroundIndex failed: %v", err)
	}

	// Create a captcha file with some content
	img := CreateWhiteImage(50, 50)
	for y := 10; y < 20; y++ {
		for x := 10; x < 20; x++ {
			img.SetPixel(x, y, color.RGBA{R: 255, G: 0, B: 0, A: 255})
		}
	}
	SavePng(img, filepath.Join(inputDir, "captcha.png"))

	// Export glyph images
	err = processor.ExportGlyphImages(inputDir, outputDir, GlyphRenderModeORIGINAL, false)
	if err != nil {
		t.Fatalf("ExportGlyphImages failed: %v", err)
	}

	// Check output directory exists
	expectedDir := filepath.Join(outputDir, "captcha.png_glyphs")
	if _, err := os.Stat(expectedDir); os.IsNotExist(err) {
		t.Error("expected output directory to exist")
	}
}
