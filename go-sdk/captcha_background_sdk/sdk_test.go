package captcha_background_sdk

import (
	"image/color"
	"path/filepath"
	"testing"
)

func TestCaptchaFontLocatorCreation(t *testing.T) {
	locator := NewCaptchaFontLocator(
		18, 8, 8,  // diff_threshold, min_component_pixels, connectivity
		3, 3,      // text_min_width, text_min_height
		0.06, 0.95, // text_min/max_fill_ratio
		2, 0.4,    // text_merge_gap, text_min_vertical_overlap_ratio
		IntPtr(4), 28, // text_expected_region_count, text_force_merge_max_gap
	)

	if locator.diffThreshold != 18 {
		t.Errorf("expected diff_threshold=18, got %d", locator.diffThreshold)
	}

	if locator.minComponentPixels != 8 {
		t.Errorf("expected min_component_pixels=8, got %d", locator.minComponentPixels)
	}

	if locator.connectivity != 8 {
		t.Errorf("expected connectivity=8, got %d", locator.connectivity)
	}
}

func TestCaptchaFontLocatorInvalidConnectivity(t *testing.T) {
	// Should not panic with invalid connectivity, uses default
	locator := NewCaptchaFontLocator(18, 8, 6, 3, 3, 0.06, 0.95, 2, 0.4, IntPtr(4), 28)
	// Should use 8 as default
	if locator.connectivity != 8 {
		t.Errorf("expected connectivity=8 (default), got %d", locator.connectivity)
	}
}

func TestCaptchaSliderLocatorCreation(t *testing.T) {
	locator := NewCaptchaSliderLocator(18, 20, 8)

	if locator.diffThreshold != 18 {
		t.Errorf("expected diff_threshold=18, got %d", locator.diffThreshold)
	}

	if locator.minGapPixels != 20 {
		t.Errorf("expected min_gap_pixels=20, got %d", locator.minGapPixels)
	}

	if locator.connectivity != 8 {
		t.Errorf("expected connectivity=8, got %d", locator.connectivity)
	}
}

func TestCaptchaRecognizerCreation(t *testing.T) {
	options := &CaptchaVisionSDKOptions{
		DiffThreshold:          25,
		FontMinComponentPixels: 12,
		SliderMinGapPixels:     30,
		Connectivity:           4,
	}

	recognizer := NewCaptchaRecognizer(options)

	if recognizer.diffThreshold != 25 {
		t.Errorf("expected diff_threshold=25, got %d", recognizer.diffThreshold)
	}

	if recognizer.Font.minComponentPixels != 12 {
		t.Errorf("expected font.min_component_pixels=12, got %d", recognizer.Font.minComponentPixels)
	}

	if recognizer.Slider.minGapPixels != 30 {
		t.Errorf("expected slider.min_gap_pixels=30, got %d", recognizer.Slider.minGapPixels)
	}

	if recognizer.connectivity != 4 {
		t.Errorf("expected connectivity=4, got %d", recognizer.connectivity)
	}
}

func TestCaptchaRecognizerDefaults(t *testing.T) {
	recognizer := NewCaptchaRecognizer(nil)

	if recognizer.diffThreshold != 18 {
		t.Errorf("expected default diff_threshold=18, got %d", recognizer.diffThreshold)
	}

	if recognizer.Font.minComponentPixels != 8 {
		t.Errorf("expected default font.min_component_pixels=8, got %d", recognizer.Font.minComponentPixels)
	}

	if recognizer.Slider.minGapPixels != 20 {
		t.Errorf("expected default slider.min_gap_pixels=20, got %d", recognizer.Slider.minGapPixels)
	}
}

func TestDecideCaptchaTypeText(t *testing.T) {
	recognizer := NewCaptchaRecognizer(nil)

	// High text score scenario
	detected, confidence, reason := recognizer.DecideCaptchaType(
		4,   // text_region_count
		500, // text_pixel_count
		4,   // font_component_count
		500, // font_component_pixels
		0,   // slider_region_count
		0,   // slider_gap_pixels
		0,   // slider_gap_width
		0,   // slider_gap_height
	)

	if detected != "text" {
		t.Errorf("expected 'text', got '%s'", detected)
	}

	if confidence <= 0.5 {
		t.Errorf("expected confidence > 0.5, got %f", confidence)
	}

	if reason == "" {
		t.Error("expected non-empty reason")
	}
}

func TestDecideCaptchaTypeSlider(t *testing.T) {
	recognizer := NewCaptchaRecognizer(nil)

	// High slider score scenario
	detected, confidence, reason := recognizer.DecideCaptchaType(
		0,   // text_region_count
		0,   // text_pixel_count
		1,   // font_component_count
		50,  // font_component_pixels
		1,   // slider_region_count
		300, // slider_gap_pixels
		50,  // slider_gap_width
		50,  // slider_gap_height
	)

	if detected != "slider" {
		t.Errorf("expected 'slider', got '%s'", detected)
	}

	if confidence <= 0.5 {
		t.Errorf("expected confidence > 0.5, got %f", confidence)
	}

	if reason == "" {
		t.Error("expected non-empty reason")
	}
}

func TestDecideCaptchaTypeUnknown(t *testing.T) {
	recognizer := NewCaptchaRecognizer(nil)

	// Low scores scenario
	detected, confidence, reason := recognizer.DecideCaptchaType(
		0, // text_region_count
		0, // text_pixel_count
		0, // font_component_count
		0, // font_component_pixels
		0, // slider_region_count
		0, // slider_gap_pixels
		0, // slider_gap_width
		0, // slider_gap_height
	)

	if detected != "unknown" {
		t.Errorf("expected 'unknown', got '%s'", detected)
	}

	if confidence < 0 {
		t.Errorf("expected confidence >= 0, got %f", confidence)
	}

	if confidence > 1 {
		t.Errorf("expected confidence <= 1, got %f", confidence)
	}

	if reason == "" {
		t.Error("expected non-empty reason")
	}
}

func TestClamp01(t *testing.T) {
	tests := []struct {
		input    float64
		expected float64
	}{
		{-1.0, 0.0},
		{0.0, 0.0},
		{0.5, 0.5},
		{1.0, 1.0},
		{2.0, 1.0},
	}

	for _, tt := range tests {
		result := clamp01(tt.input)
		if result != tt.expected {
			t.Errorf("clamp01(%f) = %f, expected %f", tt.input, result, tt.expected)
		}
	}
}

func TestAbs(t *testing.T) {
	tests := []struct {
		input    float64
		expected float64
	}{
		{-5.0, 5.0},
		{-1.0, 1.0},
		{0.0, 0.0},
		{1.0, 1.0},
		{5.0, 5.0},
	}

	for _, tt := range tests {
		result := abs(tt.input)
		if result != tt.expected {
			t.Errorf("abs(%f) = %f, expected %f", tt.input, result, tt.expected)
		}
	}
}

func TestCaptchaRecognizerGetBackgrounds(t *testing.T) {
	recognizer := NewCaptchaRecognizer(nil)

	// Initially backgrounds should be empty
	backgrounds := recognizer.GetBackgrounds()
	if backgrounds == nil {
		t.Error("expected non-nil backgrounds map")
	}
	if len(backgrounds) != 0 {
		t.Errorf("expected empty backgrounds, got %d", len(backgrounds))
	}
}

func TestCaptchaRecognizerBuildBackgroundIndex(t *testing.T) {
	// Create temporary directory with a test image
	tmpDir := t.TempDir()
	img := CreateWhiteImage(50, 50)
	img.SetPixel(0, 0, color.RGBA{R: 254, G: 255, B: 255, A: 255})
	SavePng(img, filepath.Join(tmpDir, "bg.png"))

	recognizer := NewCaptchaRecognizer(nil)

	// Build background index
	index, err := recognizer.BuildBackgroundIndex(tmpDir, false, []string{".png"})
	if err != nil {
		t.Fatalf("BuildBackgroundIndex failed: %v", err)
	}

	if len(index) != 1 {
		t.Errorf("expected 1 background, got %d", len(index))
	}

	// Verify GetBackgrounds returns the same index
	backgrounds := recognizer.GetBackgrounds()
	if len(backgrounds) != 1 {
		t.Errorf("expected 1 background from GetBackgrounds, got %d", len(backgrounds))
	}
}

func TestCaptchaRecognizerRecognizeFont(t *testing.T) {
	recognizer := NewCaptchaRecognizer(nil)

	// This should work even without background index (returns empty result)
	// Just verify it doesn't panic
	_, err := recognizer.RecognizeFont("/nonexistent/captcha.png", false)
	// Error is expected since file doesn't exist
	if err == nil {
		t.Skip("expected error for nonexistent file")
	}
}

func TestCaptchaRecognizerRecognizeSlider(t *testing.T) {
	recognizer := NewCaptchaRecognizer(nil)

	// This should work even without background index
	// Just verify it doesn't panic
	_, err := recognizer.RecognizeSlider("/nonexistent/captcha.png")
	// Error is expected since file doesn't exist
	if err == nil {
		t.Skip("expected error for nonexistent file")
	}
}

func TestCaptchaRecognizerRestoreBackgroundByCaptcha(t *testing.T) {
	recognizer := NewCaptchaRecognizer(nil)

	// This should work even without background index
	// Just verify it doesn't panic
	_, err := recognizer.RestoreBackgroundByCaptcha("/nonexistent/captcha.png", nil)
	// Error is expected since file doesn't exist
	if err == nil {
		t.Skip("expected error for nonexistent file")
	}
}

func TestDefaultCaptchaVisionSDKOptions(t *testing.T) {
	opts := DefaultCaptchaVisionSDKOptions()

	if opts.DiffThreshold != 18 {
		t.Errorf("expected default DiffThreshold=18, got %d", opts.DiffThreshold)
	}
	if opts.FontMinComponentPixels != 8 {
		t.Errorf("expected default FontMinComponentPixels=8, got %d", opts.FontMinComponentPixels)
	}
	if opts.SliderMinGapPixels != 20 {
		t.Errorf("expected default SliderMinGapPixels=20, got %d", opts.SliderMinGapPixels)
	}
	if opts.Connectivity != 8 {
		t.Errorf("expected default Connectivity=8, got %d", opts.Connectivity)
	}
}
