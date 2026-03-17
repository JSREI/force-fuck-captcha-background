package captcha_background_sdk

import (
	"image/color"
	"os"
	"path/filepath"
	"testing"
)

func TestCaptchaSliderLocatorSetBackgroundIndex(t *testing.T) {
	locator := NewCaptchaSliderLocator(18, 20, 8)

	index := map[string]BackgroundMeta{
		"10x10|255,255,255|0,0,0|0,0,0|0,0,0": {
			GroupID:   "10x10|255,255,255|0,0,0|0,0,0|0,0,0",
			ImagePath: "/path/to/bg.png",
			Width:     10,
			Height:    10,
		},
	}

	locator.SetBackgroundIndex(index)

	bg := locator.GetBackgrounds()
	if len(bg) != 1 {
		t.Errorf("expected 1 background, got %d", len(bg))
	}

	meta, ok := bg["10x10|255,255,255|0,0,0|0,0,0|0,0,0"]
	if !ok {
		t.Error("expected background with specific group_id to exist")
	}

	if meta.ImagePath != "/path/to/bg.png" {
		t.Errorf("expected path /path/to/bg.png, got %s", meta.ImagePath)
	}
}

func TestCaptchaSliderLocatorLocateGap(t *testing.T) {
	// Create temporary directory
	tmpDir := t.TempDir()
	bgDir := filepath.Join(tmpDir, "backgrounds")
	captchaDir := filepath.Join(tmpDir, "captchas")
	os.MkdirAll(bgDir, 0755)
	os.MkdirAll(captchaDir, 0755)

	// Create a background image (white with unique corner)
	bgPixels := CreateWhiteImage(100, 100)
	bgPixels.SetPixel(0, 0, color.RGBA{R: 254, G: 255, B: 255, A: 255}) // Slightly different corner
	bgPath := filepath.Join(bgDir, "bg.png")
	if err := SavePng(bgPixels, bgPath); err != nil {
		t.Fatalf("failed to save background: %v", err)
	}

	// Create a captcha image with a "gap" (black rectangle) - matching background corners
	captchaPixels := CreateWhiteImage(100, 100)
	// Set corners to match background for proper group_id matching
	captchaPixels.SetPixel(0, 0, color.RGBA{R: 254, G: 255, B: 255, A: 255})
	// Draw a larger black rectangle at position (20, 40) - 20x20
	for y := 40; y < 60; y++ {
		for x := 20; x < 40; x++ {
			captchaPixels.SetPixel(x, y, color.RGBA{R: 0, G: 0, B: 0, A: 255})
		}
	}
	captchaPath := filepath.Join(captchaDir, "captcha.png")
	if err := SavePng(captchaPixels, captchaPath); err != nil {
		t.Fatalf("failed to save captcha: %v", err)
	}

	// Create locator and build background index with lower minGapPixels
	locator := NewCaptchaSliderLocator(30, 10, 8) // diff_threshold=30, min_gap_pixels=10
	_, err := locator.BuildBackgroundIndex(bgDir, false, []string{".png"})
	if err != nil {
		t.Fatalf("failed to build background index: %v", err)
	}

	// Locate gap
	result, err := locator.LocateGap(captchaPath)
	if err != nil {
		t.Fatalf("LocateGap failed: %v", err)
	}

	if result.Gap == nil {
		t.Fatal("expected gap to be found")
	}

	// Check gap dimensions (should be around the black rectangle)
	if result.Gap.BBox[0] < 15 || result.Gap.BBox[0] > 25 {
		t.Errorf("expected gap x0 around 20, got %d", result.Gap.BBox[0])
	}

	if result.Gap.BBox[1] < 35 || result.Gap.BBox[1] > 45 {
		t.Errorf("expected gap y0 around 40, got %d", result.Gap.BBox[1])
	}

	if result.Gap.PixelCount < 300 {
		t.Errorf("expected pixel count >= 300, got %d", result.Gap.PixelCount)
	}
}

func TestCaptchaSliderLocatorLocateGapNoBackground(t *testing.T) {
	locator := NewCaptchaSliderLocator(18, 20, 8)

	// Try to locate without building background index
	_, err := locator.LocateGap("/nonexistent/path.png")
	if err == nil {
		t.Error("expected error when background index is empty")
	}
}

func TestCaptchaSliderLocatorLocateGapGroupIDNotFound(t *testing.T) {
	// Create temporary directory
	tmpDir := t.TempDir()

	// Create a background image
	bgPixels := CreateWhiteImage(50, 50)
	bgPath := filepath.Join(tmpDir, "bg.png")
	if err := SavePng(bgPixels, bgPath); err != nil {
		t.Fatalf("failed to save background: %v", err)
	}

	// Create a different sized captcha
	captchaPixels := CreateWhiteImage(30, 30)
	captchaPath := filepath.Join(tmpDir, "captcha.png")
	if err := SavePng(captchaPixels, captchaPath); err != nil {
		t.Fatalf("failed to save captcha: %v", err)
	}

	// Create locator and build background index with only 50x50 image
	locator := NewCaptchaSliderLocator(18, 20, 8)
	_, err := locator.BuildBackgroundIndex(tmpDir, false, []string{".png"})
	if err != nil {
		t.Fatalf("failed to build background index: %v", err)
	}

	// Remove captcha so we get file not found
	os.Remove(captchaPath)

	// Try to locate - should fail because captcha file doesn't exist
	_, err = locator.LocateGap(captchaPath)
	if err == nil {
		t.Error("expected error when captcha file doesn't exist")
	}
}

func TestCaptchaSliderLocatorLocateGapSizeMismatch(t *testing.T) {
	// Create temporary directory
	tmpDir := t.TempDir()
	bgDir := filepath.Join(tmpDir, "backgrounds")
	captchaDir := filepath.Join(tmpDir, "captchas")
	os.MkdirAll(bgDir, 0755)
	os.MkdirAll(captchaDir, 0755)

	// Create a background image (100x100)
	bgPixels := CreateWhiteImage(100, 100)
	bgPath := filepath.Join(bgDir, "bg.png")
	if err := SavePng(bgPixels, bgPath); err != nil {
		t.Fatalf("failed to save background: %v", err)
	}

	// Create a different sized captcha (50x50 - different group_id)
	captchaPixels := CreateWhiteImage(50, 50)
	captchaPath := filepath.Join(captchaDir, "captcha.png")
	if err := SavePng(captchaPixels, captchaPath); err != nil {
		t.Fatalf("failed to save captcha: %v", err)
	}

	// Create locator and build background index
	locator := NewCaptchaSliderLocator(30, 10, 8)
	_, err := locator.BuildBackgroundIndex(bgDir, false, []string{".png"})
	if err != nil {
		t.Fatalf("failed to build background index: %v", err)
	}

	// Try to locate - should fail because 50x50 captcha has different group_id than 100x100 background
	_, err = locator.LocateGap(captchaPath)
	if err == nil {
		t.Error("expected error when group_id not found in background index")
	}
}

func TestCaptchaSliderLocatorLocateGapWithPixels(t *testing.T) {
	// Create temporary directory
	tmpDir := t.TempDir()
	bgDir := filepath.Join(tmpDir, "backgrounds")
	captchaDir := filepath.Join(tmpDir, "captchas")
	os.MkdirAll(bgDir, 0755)
	os.MkdirAll(captchaDir, 0755)

	// Create a background image (with unique corner)
	bgPixels := CreateWhiteImage(100, 100)
	bgPixels.SetPixel(0, 0, color.RGBA{R: 254, G: 255, B: 255, A: 255}) // Slightly different corner
	bgPath := filepath.Join(bgDir, "bg.png")
	if err := SavePng(bgPixels, bgPath); err != nil {
		t.Fatalf("failed to save background: %v", err)
	}

	// Create a captcha image with a "gap" (matching background corners)
	captchaPixels := CreateWhiteImage(100, 100)
	// Set corners to match background for proper group_id matching
	captchaPixels.SetPixel(0, 0, color.RGBA{R: 254, G: 255, B: 255, A: 255})
	// Draw a larger black rectangle
	for y := 40; y < 60; y++ {
		for x := 20; x < 40; x++ {
			captchaPixels.SetPixel(x, y, color.RGBA{R: 0, G: 0, B: 0, A: 255})
		}
	}
	captchaPath := filepath.Join(captchaDir, "captcha.png")
	if err := SavePng(captchaPixels, captchaPath); err != nil {
		t.Fatalf("failed to save captcha: %v", err)
	}

	// Create locator and build background index
	locator := NewCaptchaSliderLocator(30, 10, 8)
	_, err := locator.BuildBackgroundIndex(bgDir, false, []string{".png"})
	if err != nil {
		t.Fatalf("failed to build background index: %v", err)
	}

	// Locate gap with pixels
	result, err := locator.LocateGapWithPixels(captchaPath, true)
	if err != nil {
		t.Fatalf("LocateGapWithPixels failed: %v", err)
	}

	if result.Gap == nil {
		t.Fatal("expected gap to be found")
	}

	// Check stats
	if result.Stats["diff_pixels"] == 0 {
		t.Error("expected some diff pixels")
	}

	if result.Stats["component_count"] == 0 {
		t.Error("expected some components")
	}
}

func TestCaptchaSliderLocatorLocateGapDict(t *testing.T) {
	// LocateGapDict should be an alias for LocateGap
	locator := NewCaptchaSliderLocator(18, 20, 8)

	// Just verify the method exists and returns error for empty index
	_, err := locator.LocateGapDict("/nonexistent/path.png")
	if err == nil {
		t.Error("expected error when background index is empty")
	}
}
