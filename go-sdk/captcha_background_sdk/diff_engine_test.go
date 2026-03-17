package captcha_background_sdk

import (
	"image/color"
	"testing"
)

func TestBuildDiffIdentical(t *testing.T) {
	// Create two identical images
	width, height := 10, 10
	capPixels := CreateWhiteImage(width, height)
	bgPixels := CreateWhiteImage(width, height)

	diff := BuildDiff(capPixels, bgPixels, 18)

	// Should have no differences
	count := diff.CountDiffPixels()
	if count != 0 {
		t.Errorf("expected 0 diff pixels for identical images, got %d", count)
	}
}

func TestBuildDiffDifferent(t *testing.T) {
	// Create two different images
	width, height := 10, 10
	capPixels := CreateWhiteImage(width, height)
	bgPixels := CreateBlackImage(width, height)

	diff := BuildDiff(capPixels, bgPixels, 10)

	// Should have differences
	count := diff.CountDiffPixels()
	if count == 0 {
		t.Error("expected diff pixels for different images")
	}

	// All pixels should be different
	if count != width*height {
		t.Errorf("expected %d diff pixels, got %d", width*height, count)
	}
}

func TestBuildDiffWithThreshold(t *testing.T) {
	// Create two nearly identical images
	width, height := 10, 10
	capPixels := CreateWhiteImage(width, height)
	bgPixels := CreateWhiteImage(width, height)

	// Modify one pixel slightly
	capPixels.SetPixel(5, 5, color.RGBA{R: 254, G: 255, B: 255, A: 255})

	// With high threshold, should not detect difference
	diff := BuildDiff(capPixels, bgPixels, 5)
	count := diff.CountDiffPixels()
	if count != 0 {
		t.Errorf("expected no diff with high threshold, got %d", count)
	}

	// With low threshold (0), should detect difference
	diff = BuildDiff(capPixels, bgPixels, 0)
	count = diff.CountDiffPixels()
	if count == 0 {
		t.Error("expected diff with low threshold")
	}
}

func TestDiffResultCountDiffPixels(t *testing.T) {
	mask := []bool{true, false, true, false, true}
	diff := &DiffResult{
		Mask: mask,
	}

	count := diff.CountDiffPixels()
	if count != 3 {
		t.Errorf("expected 3, got %d", count)
	}
}
