package captcha_background_sdk

import (
	"image/color"
	"path/filepath"
	"testing"
)

func TestGroupIDFromPixels(t *testing.T) {
	// Create a simple 4x4 image with known corner colors
	pixels := CreateTransparentImage(4, 4)

	// Set corner colors
	// Left-top: (255, 0, 0)
	pixels.SetPixel(0, 0, color.RGBA{R: 255, G: 0, B: 0, A: 255})
	// Right-top: (0, 255, 0)
	pixels.SetPixel(3, 0, color.RGBA{R: 0, G: 255, B: 0, A: 255})
	// Left-bottom: (0, 0, 255)
	pixels.SetPixel(0, 3, color.RGBA{R: 0, G: 0, B: 255, A: 255})
	// Right-bottom: (255, 255, 255)
	pixels.SetPixel(3, 3, color.RGBA{R: 255, G: 255, B: 255, A: 255})

	groupID := GroupIDFromPixels(pixels)

	// Expected format: 4x4|255,0,0|0,255,0|0,0,255|255,255,255
	expected := "4x4|255,0,0|0,255,0|0,0,255|255,255,255"
	if groupID != expected {
		t.Errorf("expected %s, got %s", expected, groupID)
	}
}

func TestComputeGroupID(t *testing.T) {
	// Create temp directory
	tmpDir := t.TempDir()

	// Create test image
	pixels := CreateTransparentImage(10, 10)
	pixels.SetPixel(0, 0, color.RGBA{R: 100, G: 150, B: 200, A: 255})

	imgPath := filepath.Join(tmpDir, "test.png")
	if err := SavePng(pixels, imgPath); err != nil {
		t.Fatalf("failed to save test image: %v", err)
	}

	groupID, err := ComputeGroupID(imgPath)
	if err != nil {
		t.Fatalf("ComputeGroupID failed: %v", err)
	}

	// Check format
	if len(groupID) == 0 {
		t.Error("groupID should not be empty")
	}

	// Should contain dimensions
	if len(groupID) < 5 || groupID[:5] != "10x10" {
		t.Errorf("expected dimensions 10x10, got %s", groupID)
	}
}

func TestComputeGroupIDNonexistent(t *testing.T) {
	_, err := ComputeGroupID("/nonexistent/path.png")
	if err == nil {
		t.Error("expected error for nonexistent file")
	}
}
