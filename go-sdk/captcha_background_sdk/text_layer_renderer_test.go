package captcha_background_sdk

import (
	"image/color"
	"os"
	"path/filepath"
	"testing"
)

func TestRenderTextLayer(t *testing.T) {
	// Create temporary directory
	tmpDir := t.TempDir()
	outputPath := filepath.Join(tmpDir, "text_layer.png")

	// Create captcha and background images
	captchaPixels := CreateWhiteImage(50, 50)
	backgroundPixels := CreateWhiteImage(50, 50)

	// Add some differences (text pixels)
	for y := 10; y < 20; y++ {
		for x := 10; x < 20; x++ {
			captchaPixels.SetPixel(x, y, color.RGBA{R: 255, G: 0, B: 0, A: 255})
		}
	}

	// Build diff mask
	diff := BuildDiff(captchaPixels, backgroundPixels, 18)

	// Render text layer with crop
	result, err := RenderTextLayer(captchaPixels, backgroundPixels, diff.Mask, outputPath, true)
	if err != nil {
		t.Fatalf("RenderTextLayer failed: %v", err)
	}

	if result.TextBBox == nil {
		t.Fatal("expected text bbox")
	}

	if result.TextPixelCount != 100 { // 10x10 text area
		t.Errorf("expected 100 text pixels, got %d", result.TextPixelCount)
	}

	if result.OutputPath == nil || *result.OutputPath != outputPath {
		t.Error("expected output path to be set")
	}

	// Check output file exists
	if _, err := os.Stat(outputPath); os.IsNotExist(err) {
		t.Error("output file should exist")
	}

	// Check cropped dimensions
	if result.Stats["width"] != 10 {
		t.Errorf("expected cropped width 10, got %d", result.Stats["width"])
	}
	if result.Stats["height"] != 10 {
		t.Errorf("expected cropped height 10, got %d", result.Stats["height"])
	}
}

func TestRenderTextLayerNoCrop(t *testing.T) {
	// Create temporary directory
	tmpDir := t.TempDir()
	outputPath := filepath.Join(tmpDir, "text_layer.png")

	// Create captcha and background images
	captchaPixels := CreateWhiteImage(50, 50)
	backgroundPixels := CreateWhiteImage(50, 50)

	// Add some differences
	for y := 10; y < 20; y++ {
		for x := 10; x < 20; x++ {
			captchaPixels.SetPixel(x, y, color.RGBA{R: 255, G: 0, B: 0, A: 255})
		}
	}

	diff := BuildDiff(captchaPixels, backgroundPixels, 18)

	// Render without crop
	result, err := RenderTextLayer(captchaPixels, backgroundPixels, diff.Mask, outputPath, false)
	if err != nil {
		t.Fatalf("RenderTextLayer failed: %v", err)
	}

	// Check full dimensions
	if result.Stats["width"] != 50 {
		t.Errorf("expected full width 50, got %d", result.Stats["width"])
	}
	if result.Stats["height"] != 50 {
		t.Errorf("expected full height 50, got %d", result.Stats["height"])
	}
}

func TestRenderTextLayerNoDiff(t *testing.T) {
	// Create temporary directory
	tmpDir := t.TempDir()
	outputPath := filepath.Join(tmpDir, "text_layer.png")

	// Create identical captcha and background images
	captchaPixels := CreateWhiteImage(50, 50)
	backgroundPixels := CreateWhiteImage(50, 50)

	diff := BuildDiff(captchaPixels, backgroundPixels, 18)

	// Render with no differences
	result, err := RenderTextLayer(captchaPixels, backgroundPixels, diff.Mask, outputPath, true)
	if err != nil {
		t.Fatalf("RenderTextLayer failed: %v", err)
	}

	if result.TextBBox != nil {
		t.Error("expected nil text bbox when no diff")
	}

	if result.TextPixelCount != 0 {
		t.Errorf("expected 0 text pixels, got %d", result.TextPixelCount)
	}
}

func TestRenderGlyphImageOriginal(t *testing.T) {
	// Create captcha image
	captchaPixels := CreateWhiteImage(50, 50)
	for y := 10; y < 20; y++ {
		for x := 10; x < 20; x++ {
			captchaPixels.SetPixel(x, y, color.RGBA{R: 255, G: 0, B: 0, A: 255})
		}
	}

	bbox := BBox{10, 10, 19, 19}
	img := RenderGlyphImage(captchaPixels, bbox, GlyphRenderModeORIGINAL)

	// Check image dimensions
	bounds := img.Bounds()
	if bounds.Dx() != 10 {
		t.Errorf("expected width 10, got %d", bounds.Dx())
	}
	if bounds.Dy() != 10 {
		t.Errorf("expected height 10, got %d", bounds.Dy())
	}
}

func TestRenderGlyphImageBlackOnTransparent(t *testing.T) {
	// Create captcha image
	captchaPixels := CreateWhiteImage(50, 50)
	for y := 10; y < 20; y++ {
		for x := 10; x < 20; x++ {
			captchaPixels.SetPixel(x, y, color.RGBA{R: 255, G: 0, B: 0, A: 255})
		}
	}

	bbox := BBox{10, 10, 19, 19}
	img := RenderGlyphImage(captchaPixels, bbox, GlyphRenderModeBLACK_ON_TRANSPARENT)

	bounds := img.Bounds()
	if bounds.Dx() != 10 {
		t.Errorf("expected width 10, got %d", bounds.Dx())
	}
	if bounds.Dy() != 10 {
		t.Errorf("expected height 10, got %d", bounds.Dy())
	}
}

func TestRenderGlyphImageBlackOnWhite(t *testing.T) {
	// Create captcha image
	captchaPixels := CreateWhiteImage(50, 50)
	for y := 10; y < 20; y++ {
		for x := 10; x < 20; x++ {
			captchaPixels.SetPixel(x, y, color.RGBA{R: 255, G: 0, B: 0, A: 255})
		}
	}

	bbox := BBox{10, 10, 19, 19}
	img := RenderGlyphImage(captchaPixels, bbox, GlyphRenderModeBLACK_ON_WHITE)

	bounds := img.Bounds()
	if bounds.Dx() != 10 {
		t.Errorf("expected width 10, got %d", bounds.Dx())
	}
	if bounds.Dy() != 10 {
		t.Errorf("expected height 10, got %d", bounds.Dy())
	}
}

func TestRenderGlyphImageWhiteOnBlack(t *testing.T) {
	// Create captcha image
	captchaPixels := CreateWhiteImage(50, 50)
	for y := 10; y < 20; y++ {
		for x := 10; x < 20; x++ {
			captchaPixels.SetPixel(x, y, color.RGBA{R: 255, G: 0, B: 0, A: 255})
		}
	}

	bbox := BBox{10, 10, 19, 19}
	img := RenderGlyphImage(captchaPixels, bbox, GlyphRenderModeWHITE_ON_BLACK)

	bounds := img.Bounds()
	if bounds.Dx() != 10 {
		t.Errorf("expected width 10, got %d", bounds.Dx())
	}
	if bounds.Dy() != 10 {
		t.Errorf("expected height 10, got %d", bounds.Dy())
	}
}

func TestSaveGlyphImage(t *testing.T) {
	// Create temporary directory
	tmpDir := t.TempDir()
	outputPath := filepath.Join(tmpDir, "glyph.png")

	// Create a simple image
	captchaPixels := CreateWhiteImage(50, 50)
	img := RenderGlyphImage(captchaPixels, BBox{10, 10, 19, 19}, GlyphRenderModeORIGINAL)

	// Save it
	err := SaveGlyphImage(img, outputPath)
	if err != nil {
		t.Fatalf("SaveGlyphImage failed: %v", err)
	}

	// Check file exists
	if _, err := os.Stat(outputPath); os.IsNotExist(err) {
		t.Error("saved glyph image should exist")
	}
}
