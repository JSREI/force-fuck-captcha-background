package captcha_background_sdk

import (
	"image/color"
	"math"
	"testing"
)

func TestNewBackgroundFeatureEngine(t *testing.T) {
	engine := NewBackgroundFeatureEngine()
	if engine == nil {
		t.Fatal("expected non-nil engine")
	}
}

func TestExtractTextureMetricsUniform(t *testing.T) {
	engine := NewBackgroundFeatureEngine()

	// Create uniform white image
	pixels := CreateWhiteImage(50, 50)

	result := engine.ExtractTextureMetrics(pixels, 4, 4, 16, 10.0)

	if result.ImageSize[0] != 50 || result.ImageSize[1] != 50 {
		t.Errorf("expected image size 50x50, got %dx%d", result.ImageSize[0], result.ImageSize[1])
	}

	// Uniform white should have mean close to 255
	if math.Abs(result.MeanIntensity-255) > 1 {
		t.Errorf("expected mean intensity ~255, got %f", result.MeanIntensity)
	}

	// Uniform image should have low std
	if result.StdIntensity > 1 {
		t.Errorf("expected low std for uniform image, got %f", result.StdIntensity)
	}

	// Uniform image should have low entropy
	if result.Entropy > 1 {
		t.Errorf("expected low entropy for uniform image, got %f", result.Entropy)
	}

	// Uniform image should have low edge density
	if result.EdgeDensity > 0.1 {
		t.Errorf("expected low edge density for uniform image, got %f", result.EdgeDensity)
	}

	// Check histogram
	if len(result.Histogram) != 16 {
		t.Errorf("expected 16 histogram bins, got %d", len(result.Histogram))
	}

	// Check grid energy
	if len(result.GridEnergy) != 16 { // 4x4 grid
		t.Errorf("expected 16 grid cells, got %d", len(result.GridEnergy))
	}

	// Check stats
	if _, ok := result.Stats["mean_intensity"]; !ok {
		t.Error("expected mean_intensity in stats")
	}
}

func TestExtractTextureMetricsBlack(t *testing.T) {
	engine := NewBackgroundFeatureEngine()

	// Create uniform black image
	pixels := CreateBlackImage(50, 50)

	result := engine.ExtractTextureMetrics(pixels, 4, 4, 16, 10.0)

	// Uniform black should have mean close to 0
	if result.MeanIntensity > 1 {
		t.Errorf("expected mean intensity ~0, got %f", result.MeanIntensity)
	}
}

func TestExtractTextureMetricsGradient(t *testing.T) {
	engine := NewBackgroundFeatureEngine()

	// Create gradient image
	pixels := CreateTransparentImage(50, 50)
	for y := 0; y < 50; y++ {
		for x := 0; x < 50; x++ {
			gray := uint8((x + y) * 255 / 100)
			pixels.SetPixel(x, y, color.RGBA{R: gray, G: gray, B: gray, A: 255})
		}
	}

	// Use lower edge threshold to detect the gradient edges
	result := engine.ExtractTextureMetrics(pixels, 4, 4, 16, 5.0)

	// Gradient should have higher std than uniform
	if result.StdIntensity < 10 {
		t.Errorf("expected higher std for gradient, got %f", result.StdIntensity)
	}

	// Gradient should have higher entropy
	if result.Entropy < 1 {
		t.Errorf("expected higher entropy for gradient, got %f", result.Entropy)
	}

	// Gradient should have some edges (with lower threshold)
	if result.EdgeDensity < 0.01 {
		t.Errorf("expected some edge density for gradient, got %f", result.EdgeDensity)
	}
}

func TestExtractTextureMetricsGridEnergy(t *testing.T) {
	engine := NewBackgroundFeatureEngine()

	// Create image with bright top-left and dark bottom-right
	pixels := CreateTransparentImage(50, 50)
	for y := 0; y < 50; y++ {
		for x := 0; x < 50; x++ {
			gray := uint8(255 - (x+y)*255/100)
			pixels.SetPixel(x, y, color.RGBA{R: gray, G: gray, B: gray, A: 255})
		}
	}

	result := engine.ExtractTextureMetrics(pixels, 2, 2, 16, 10.0)

	// Check grid energy varies
	topLeft := result.GridEnergy[0] // Top-left cell
	bottomRight := result.GridEnergy[3] // Bottom-right cell

	if math.Abs(topLeft-bottomRight) < 10 {
		t.Error("expected different energy in top-left vs bottom-right")
	}
}

func TestExtractDeepVector(t *testing.T) {
	engine := NewBackgroundFeatureEngine()

	// Create uniform image
	pixels := CreateWhiteImage(50, 50)

	result := engine.ExtractDeepVector(pixels, []int{2, 4}, 10.0)

	if result.ImageSize[0] != 50 || result.ImageSize[1] != 50 {
		t.Errorf("expected image size 50x50, got %dx%d", result.ImageSize[0], result.ImageSize[1])
	}

	// Check levels
	if len(result.Levels) != 2 {
		t.Errorf("expected 2 levels, got %d", len(result.Levels))
	}

	// Expected patches: 2x2 + 4x4 = 4 + 16 = 20 patches
	// Each patch contributes 3 values (mean, std, edge_density)
	expectedVectorLength := 20 * 3
	if len(result.Vector1D) != expectedVectorLength {
		t.Errorf("expected vector length %d, got %d", expectedVectorLength, len(result.Vector1D))
	}

	if result.PatchCount != 20 {
		t.Errorf("expected 20 patches, got %d", result.PatchCount)
	}

	// Check stats
	if result.Stats["vector_length"] != float64(expectedVectorLength) {
		t.Error("expected vector_length in stats")
	}
}

func TestExtractDeepVectorEmptyLevels(t *testing.T) {
	engine := NewBackgroundFeatureEngine()

	pixels := CreateWhiteImage(50, 50)

	// Test with empty levels
	result := engine.ExtractDeepVector(pixels, []int{}, 10.0)

	if len(result.Vector1D) != 0 {
		t.Errorf("expected empty vector for empty levels, got %d", len(result.Vector1D))
	}

	if result.PatchCount != 0 {
		t.Errorf("expected 0 patches for empty levels, got %d", result.PatchCount)
	}
}

func TestExtractDeepVectorInvalidLevel(t *testing.T) {
	engine := NewBackgroundFeatureEngine()

	pixels := CreateWhiteImage(50, 50)

	// Test with zero/negative level
	result := engine.ExtractDeepVector(pixels, []int{0, -1, 2}, 10.0)

	// Only level 2 should be processed
	if result.PatchCount != 4 { // 2x2 = 4 patches
		t.Errorf("expected 4 patches (ignoring invalid levels), got %d", result.PatchCount)
	}
}

func TestExtractDeepVectorUniformPatches(t *testing.T) {
	engine := NewBackgroundFeatureEngine()

	// Create uniform white image
	pixels := CreateWhiteImage(50, 50)

	result := engine.ExtractDeepVector(pixels, []int{2}, 10.0)

	// All patches should have mean close to 1.0 (normalized 255/255)
	for i, v := range result.Vector1D {
		if i%3 == 0 { // Mean values are at indices 0, 3, 6, ...
			if math.Abs(v-1.0) > 0.01 {
				t.Errorf("expected patch mean ~1.0, got %f at index %d", v, i)
			}
		}
	}
}
