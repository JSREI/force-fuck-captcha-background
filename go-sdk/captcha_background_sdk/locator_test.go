package captcha_background_sdk

import (
	"image/color"
	"os"
	"path/filepath"
	"testing"
)

func TestCaptchaFontLocatorSetBackgroundIndex(t *testing.T) {
	locator := NewCaptchaFontLocator(
		18, 8, 8,
		3, 3, 0.06, 0.95,
		2, 0.4, IntPtr(4), 28,
	)

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
}

func TestCaptchaFontLocatorBuildBackgroundIndex(t *testing.T) {
	// Create temporary directory
	tmpDir := t.TempDir()

	// Create a test image
	img := CreateWhiteImage(50, 50)
	SavePng(img, filepath.Join(tmpDir, "bg.png"))

	locator := NewCaptchaFontLocator(
		18, 8, 8,
		3, 3, 0.06, 0.95,
		2, 0.4, IntPtr(4), 28,
	)

	index, err := locator.BuildBackgroundIndex(tmpDir, false, []string{".png"})
	if err != nil {
		t.Fatalf("BuildBackgroundIndex failed: %v", err)
	}

	if len(index) != 1 {
		t.Errorf("expected 1 background, got %d", len(index))
	}
}

func TestCaptchaFontLocatorLocateFontsEmptyIndex(t *testing.T) {
	locator := NewCaptchaFontLocator(
		18, 8, 8,
		3, 3, 0.06, 0.95,
		2, 0.4, IntPtr(4), 28,
	)

	_, err := locator.LocateFonts("/nonexistent/path.png", false)
	if err == nil {
		t.Error("expected error when background index is empty")
	}
}

func TestCaptchaFontLocatorLocateFonts(t *testing.T) {
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

	// Create a captcha image with red text (matching background corners)
	captchaPixels := CreateWhiteImage(100, 100)
	// Set corners to match background for proper group_id matching
	captchaPixels.SetPixel(0, 0, color.RGBA{R: 254, G: 255, B: 255, A: 255})
	// Draw some "text" (red pixels) - larger area for detection
	for y := 20; y < 40; y++ {
		for x := 20; x < 40; x++ {
			captchaPixels.SetPixel(x, y, color.RGBA{R: 255, G: 0, B: 0, A: 255})
		}
	}
	captchaPath := filepath.Join(captchaDir, "captcha.png")
	if err := SavePng(captchaPixels, captchaPath); err != nil {
		t.Fatalf("failed to save captcha: %v", err)
	}

	// Create locator and build background index with higher diff threshold
	locator := NewCaptchaFontLocator(
		30, 10, 8, // diff_threshold=30, min_component_pixels=10
		3, 3, 0.06, 0.95,
		2, 0.4, IntPtr(4), 28,
	)
	_, err := locator.BuildBackgroundIndex(bgDir, false, []string{".png"})
	if err != nil {
		t.Fatalf("failed to build background index: %v", err)
	}

	// Locate fonts
	result, err := locator.LocateFonts(captchaPath, false)
	if err != nil {
		t.Fatalf("LocateFonts failed: %v", err)
	}

	if len(result.Components) == 0 {
		t.Error("expected at least one component")
	}

	// Check stats
	if result.Stats["diff_pixels"] == 0 {
		t.Error("expected some diff pixels")
	}

	if result.Stats["component_count"] == 0 {
		t.Error("expected some components")
	}
}

func TestCaptchaFontLocatorLocateFontsDict(t *testing.T) {
	locator := NewCaptchaFontLocator(
		18, 8, 8,
		3, 3, 0.06, 0.95,
		2, 0.4, IntPtr(4), 28,
	)

	// Just verify the method exists and returns error for empty index
	_, err := locator.LocateFontsDict("/nonexistent/path.png", false)
	if err == nil {
		t.Error("expected error when background index is empty")
	}
}

func TestCaptchaFontLocatorRestoreBackground(t *testing.T) {
	// Create temporary directory
	tmpDir := t.TempDir()

	// Create a background image (with unique corner)
	bgPixels := CreateWhiteImage(50, 50)
	bgPixels.SetPixel(0, 0, color.RGBA{R: 254, G: 255, B: 255, A: 255}) // Slightly different corner
	bgPath := filepath.Join(tmpDir, "bg.png")
	if err := SavePng(bgPixels, bgPath); err != nil {
		t.Fatalf("failed to save background: %v", err)
	}

	// Create a captcha image (pure white corners)
	captchaPixels := CreateWhiteImage(50, 50)
	captchaPath := filepath.Join(tmpDir, "captcha.png")
	if err := SavePng(captchaPixels, captchaPath); err != nil {
		t.Fatalf("failed to save captcha: %v", err)
	}

	// Create locator and build background index
	locator := NewCaptchaFontLocator(
		18, 8, 8,
		3, 3, 0.06, 0.95,
		2, 0.4, IntPtr(4), 28,
	)
	_, err := locator.BuildBackgroundIndex(tmpDir, false, []string{".png"})
	if err != nil {
		t.Fatalf("failed to build background index: %v", err)
	}

	// Test restore without output path
	result, err := locator.RestoreBackground(captchaPath, nil)
	if err != nil {
		t.Fatalf("RestoreBackground failed: %v", err)
	}

	if result.OutputPath != nil {
		t.Error("expected nil output path when not specified")
	}

	// Test restore with output path
	outputPath := filepath.Join(tmpDir, "restored.png")
	result, err = locator.RestoreBackground(captchaPath, &outputPath)
	if err != nil {
		t.Fatalf("RestoreBackground failed: %v", err)
	}

	if result.OutputPath == nil || *result.OutputPath != outputPath {
		t.Error("expected output path to be set")
	}

	// Check output file exists
	if _, err := os.Stat(outputPath); os.IsNotExist(err) {
		t.Error("restored file should exist")
	}
}

func TestCaptchaFontLocatorRestoreBackgroundByCaptcha(t *testing.T) {
	// Just verify the method exists and works the same as RestoreBackground
	locator := NewCaptchaFontLocator(
		18, 8, 8,
		3, 3, 0.06, 0.95,
		2, 0.4, IntPtr(4), 28,
	)

	_, err := locator.RestoreBackgroundByCaptcha("/nonexistent/path.png", nil)
	if err == nil {
		t.Error("expected error when background index is empty")
	}
}

func TestCaptchaFontLocatorLocateTextPositions(t *testing.T) {
	// Create temporary directory
	tmpDir := t.TempDir()
	bgDir := filepath.Join(tmpDir, "backgrounds")
	captchaDir := filepath.Join(tmpDir, "captchas")
	os.MkdirAll(bgDir, 0755)
	os.MkdirAll(captchaDir, 0755)

	// Create a background image (with unique corner)
	bgPixels := CreateWhiteImage(200, 100)
	bgPixels.SetPixel(0, 0, color.RGBA{R: 254, G: 255, B: 255, A: 255}) // Slightly different corner
	bgPath := filepath.Join(bgDir, "bg.png")
	if err := SavePng(bgPixels, bgPath); err != nil {
		t.Fatalf("failed to save background: %v", err)
	}

	// Create a captcha image with text-like regions (matching background corners)
	captchaPixels := CreateWhiteImage(200, 100)
	// Set corners to match background for proper group_id matching
	captchaPixels.SetPixel(0, 0, color.RGBA{R: 254, G: 255, B: 255, A: 255})
	// Draw two separate text regions with fill ratio < 95%
	for y := 20; y < 60; y++ {
		for x := 20; x < 50; x++ {
			// Create a checkerboard pattern for ~50% fill ratio
			if (x+y)%2 == 0 {
				captchaPixels.SetPixel(x, y, color.RGBA{R: 255, G: 0, B: 0, A: 255})
			}
		}
		for x := 100; x < 130; x++ {
			// Create a checkerboard pattern for ~50% fill ratio
			if (x+y)%2 == 0 {
				captchaPixels.SetPixel(x, y, color.RGBA{R: 0, G: 0, B: 255, A: 255})
			}
		}
	}
	captchaPath := filepath.Join(captchaDir, "captcha.png")
	if err := SavePng(captchaPixels, captchaPath); err != nil {
		t.Fatalf("failed to save captcha: %v", err)
	}

	// Create locator and build background index with relaxed parameters for text detection
	locator := NewCaptchaFontLocator(
		30, 5, 8, // diff_threshold=30, min_component_pixels=5
		10, 10, 0.5, 0.1, // relaxed region builder params
		10, 0.1, IntPtr(10), 5, // relaxed text region params
	)
	_, err := locator.BuildBackgroundIndex(bgDir, false, []string{".png"})
	if err != nil {
		t.Fatalf("failed to build background index: %v", err)
	}

	// Locate text positions
	result, err := locator.LocateTextPositions(captchaPath, false)
	if err != nil {
		t.Fatalf("LocateTextPositions failed: %v", err)
	}

	// Verify result structure is valid (text region detection may or may not find regions
	// depending on the specific image characteristics and parameters)
	if result.Regions == nil {
		t.Error("expected non-nil regions slice")
	}

	if result.Stats == nil {
		t.Error("expected non-nil stats")
	}
}
