package captcha_background_sdk

import (
	"image/color"
	"testing"
)

func TestExtractComponentsSingleComponent(t *testing.T) {
	width, height := 10, 10

	// Create mask with single 2x2 component
	mask := make([]bool, width*height)
	colors := make([]color.RGBA, width*height)

	// Component at center
	mask[4*width+4] = true
	mask[4*width+5] = true
	mask[5*width+4] = true
	mask[5*width+5] = true
	colors[4*width+4] = color.RGBA{R: 255, G: 0, B: 0, A: 255}
	colors[4*width+5] = color.RGBA{R: 255, G: 0, B: 0, A: 255}
	colors[5*width+4] = color.RGBA{R: 255, G: 0, B: 0, A: 255}
	colors[5*width+5] = color.RGBA{R: 255, G: 0, B: 0, A: 255}

	components := ExtractComponents(
		mask, colors, width, height,
		4, 1, true, false,
	)

	if len(components) != 1 {
		t.Errorf("expected 1 component, got %d", len(components))
	}

	if components[0].PixelCount != 4 {
		t.Errorf("expected pixel count 4, got %d", components[0].PixelCount)
	}
}

func TestExtractComponentsMultiple(t *testing.T) {
	width, height := 10, 10

	mask := make([]bool, width*height)
	colors := make([]color.RGBA, width*height)

	// Two separate components
	mask[2*width+2] = true
	mask[7*width+7] = true
	colors[2*width+2] = color.RGBA{R: 255, G: 0, B: 0, A: 255}
	colors[7*width+7] = color.RGBA{R: 0, G: 255, B: 0, A: 255}

	components := ExtractComponents(
		mask, colors, width, height,
		4, 1, true, false,
	)

	if len(components) != 2 {
		t.Errorf("expected 2 components, got %d", len(components))
	}
}

func TestExtractComponentsMinSize(t *testing.T) {
	width, height := 10, 10

	mask := make([]bool, width*height)
	colors := make([]color.RGBA, width*height)

	// Single pixel
	mask[5*width+5] = true
	colors[5*width+5] = color.RGBA{R: 255, G: 0, B: 0, A: 255}

	// With min_component_pixels=2, should be filtered out
	components := ExtractComponents(
		mask, colors, width, height,
		4, 2, true, false,
	)

	if len(components) != 0 {
		t.Errorf("expected 0 components with min_size=2, got %d", len(components))
	}

	// With min_component_pixels=1, should be kept
	components = ExtractComponents(
		mask, colors, width, height,
		4, 1, true, false,
	)

	if len(components) != 1 {
		t.Errorf("expected 1 component with min_size=1, got %d", len(components))
	}
}

func TestExtractComponentsConnectivity4(t *testing.T) {
	width, height := 10, 10

	mask := make([]bool, width*height)
	colors := make([]color.RGBA, width*height)

	// Diagonal pixels (not connected with 4-connectivity)
	mask[5*width+5] = true
	mask[6*width+6] = true
	colors[5*width+5] = color.RGBA{R: 255, G: 0, B: 0, A: 255}
	colors[6*width+6] = color.RGBA{R: 255, G: 0, B: 0, A: 255}

	// With 4-connectivity, should be 2 components
	components := ExtractComponents(
		mask, colors, width, height,
		4, 1, true, false,
	)

	if len(components) != 2 {
		t.Errorf("expected 2 components with 4-connectivity, got %d", len(components))
	}

	// With 8-connectivity, should be 1 component
	components = ExtractComponents(
		mask, colors, width, height,
		8, 1, true, false,
	)

	if len(components) != 1 {
		t.Errorf("expected 1 component with 8-connectivity, got %d", len(components))
	}
}

func TestExtractComponentsColorSensitive(t *testing.T) {
	width, height := 10, 10

	mask := make([]bool, width*height)
	colors := make([]color.RGBA, width*height)

	// Two adjacent pixels with different colors
	mask[5*width+5] = true
	mask[5*width+6] = true
	colors[5*width+5] = color.RGBA{R: 255, G: 0, B: 0, A: 255}
	colors[5*width+6] = color.RGBA{R: 0, G: 255, B: 0, A: 255}

	// With color_sensitive=true, should be 2 components
	components := ExtractComponents(
		mask, colors, width, height,
		4, 1, true, true,
	)

	if len(components) != 2 {
		t.Errorf("expected 2 components with color_sensitive=true, got %d", len(components))
	}

	// With color_sensitive=false, should be 1 component
	components = ExtractComponents(
		mask, colors, width, height,
		4, 1, true, false,
	)

	if len(components) != 1 {
		t.Errorf("expected 1 component with color_sensitive=false, got %d", len(components))
	}
}
