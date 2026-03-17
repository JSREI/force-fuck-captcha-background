package captcha_background_sdk

import (
	"testing"
)

func TestVersion(t *testing.T) {
	if Version == "" {
		t.Error("version should not be empty")
	}
}

func TestCaptchaVisionSDKAlias(t *testing.T) {
	// Test that CaptchaVisionSDK is a valid alias
	sdk := CaptchaVisionSDK(nil)
	if sdk == nil {
		t.Fatal("expected non-nil SDK")
	}

	// Check default values
	if sdk.diffThreshold != 18 {
		t.Errorf("expected default diff_threshold=18, got %d", sdk.diffThreshold)
	}
}

func TestNewCaptchaTextLocator(t *testing.T) {
	locator := NewCaptchaTextLocator(
		18, 8, 8,
		3, 3, 0.06, 0.95,
		2, 0.4, IntPtr(4), 28,
	)

	if locator == nil {
		t.Fatal("expected non-nil locator")
	}

	if locator.diffThreshold != 18 {
		t.Errorf("expected diff_threshold=18, got %d", locator.diffThreshold)
	}

	if locator.minComponentPixels != 8 {
		t.Errorf("expected min_component_pixels=8, got %d", locator.minComponentPixels)
	}
}

func TestNewCaptchaGapLocator(t *testing.T) {
	locator := NewCaptchaGapLocator(18, 20, 8)

	if locator == nil {
		t.Fatal("expected non-nil locator")
	}

	if locator.diffThreshold != 18 {
		t.Errorf("expected diff_threshold=18, got %d", locator.diffThreshold)
	}

	if locator.minGapPixels != 20 {
		t.Errorf("expected min_gap_pixels=20, got %d", locator.minGapPixels)
	}
}
