package captcha_background_sdk

import (
	"testing"
)

func TestNewGlyphFeatureExtractor(t *testing.T) {
	extractor := NewGlyphFeatureExtractor()
	if extractor == nil {
		t.Fatal("expected non-nil extractor")
	}
}

func TestExtractFeatures(t *testing.T) {
	extractor := NewGlyphFeatureExtractor()

	// Create a simple 3x3 glyph bitmap
	bitmap := [][]int{
		{1, 1, 0},
		{1, 0, 1},
		{0, 1, 1},
	}

	glyph := FontGlyph{
		RectIndex:  0,
		BBox:       BBox{0, 0, 2, 2},
		Width:      3,
		Height:     3,
		Color:      RGB{255, 0, 0},
		PixelCount: 5,
		Bitmap2D:   bitmap,
	}

	feature := extractor.ExtractFeatures(&glyph, 5, 5, false)

	if feature.RectIndex != 0 {
		t.Errorf("expected rect index 0, got %d", feature.RectIndex)
	}

	if feature.Width != 3 {
		t.Errorf("expected width 3, got %d", feature.Width)
	}

	if feature.Height != 3 {
		t.Errorf("expected height 3, got %d", feature.Height)
	}

	if len(feature.Vector1D) != 25 { // 5x5
		t.Errorf("expected vector length 25, got %d", len(feature.Vector1D))
	}

	if len(feature.ResizedBitmap2D) != 5 {
		t.Errorf("expected resized bitmap height 5, got %d", len(feature.ResizedBitmap2D))
	}

	// Check density (5 pixels out of 9 in original = ~0.56)
	// After resize to 5x5, should still have similar density
	if feature.Density <= 0 || feature.Density > 1 {
		t.Errorf("expected density between 0 and 1, got %f", feature.Density)
	}
}

func TestExtractFeaturesFromGlyphs(t *testing.T) {
	extractor := NewGlyphFeatureExtractor()

	glyphs := []FontGlyph{
		{
			RectIndex: 0,
			BBox:      BBox{0, 0, 2, 2},
			Width:     3,
			Height:    3,
			Bitmap2D:  [][]int{{1, 0, 0}, {0, 1, 0}, {0, 0, 1}},
		},
		{
			RectIndex: 1,
			BBox:      BBox{5, 5, 7, 7},
			Width:     3,
			Height:    3,
			Bitmap2D:  [][]int{{0, 1, 0}, {1, 1, 1}, {0, 1, 0}},
		},
	}

	features := extractor.ExtractFeaturesFromGlyphs(glyphs, 5, 5, false)

	if len(features) != 2 {
		t.Errorf("expected 2 features, got %d", len(features))
	}
}

func TestResizeBitmap(t *testing.T) {
	extractor := NewGlyphFeatureExtractor()

	// Create a simple 2x2 bitmap
	src := [][]int{
		{1, 0},
		{0, 1},
	}

	// Resize to 4x4
	resized := extractor.resizeBitmap(src, 4, 4, false)

	if len(resized) != 4 {
		t.Errorf("expected height 4, got %d", len(resized))
	}

	if len(resized[0]) != 4 {
		t.Errorf("expected width 4, got %d", len(resized[0]))
	}
}

func TestResizeBitmapEmpty(t *testing.T) {
	extractor := NewGlyphFeatureExtractor()

	// Empty bitmap
	src := [][]int{}

	resized := extractor.resizeBitmap(src, 5, 5, false)

	if len(resized) != 5 {
		t.Errorf("expected height 5 for empty source, got %d", len(resized))
	}

	// Should be all zeros
	for y := 0; y < 5; y++ {
		for x := 0; x < 5; x++ {
			if resized[y][x] != 0 {
				t.Errorf("expected 0 at (%d,%d), got %d", x, y, resized[y][x])
			}
		}
	}
}

func TestAlignGlyphsToSlots(t *testing.T) {
	glyphs := []FontGlyph{
		{
			RectIndex: 0,
			BBox:      BBox{10, 0, 12, 2}, // x=10
			Width:     3,
			Height:    3,
			Bitmap2D:  [][]int{{1, 0, 0}, {0, 1, 0}, {0, 0, 1}},
		},
		{
			RectIndex: 1,
			BBox:      BBox{0, 0, 2, 2}, // x=0 (will be first after sort)
			Width:     3,
			Height:    3,
			Bitmap2D:  [][]int{{0, 1, 0}, {1, 1, 1}, {0, 1, 0}},
		},
	}

	result := AlignGlyphsToSlots(glyphs, 4, 5, 5, false)

	if result.SlotCount != 4 {
		t.Errorf("expected 4 slots, got %d", result.SlotCount)
	}

	if len(result.Slots) != 4 {
		t.Errorf("expected 4 slots in array, got %d", len(result.Slots))
	}

	// After sorting by x position, glyph with BBox[0]=0 should be in slot 0
	if !result.Slots[0].Present {
		t.Error("expected slot 0 to be present")
	}

	// Glyph with BBox[0]=10 should be in slot 1
	if !result.Slots[1].Present {
		t.Error("expected slot 1 to be present")
	}

	// Slots 2 and 3 should be empty
	if result.Slots[2].Present {
		t.Error("expected slot 2 to be empty")
	}
	if result.Slots[3].Present {
		t.Error("expected slot 3 to be empty")
	}

	if result.Stats["filled_slots"] != 2 {
		t.Errorf("expected 2 filled slots, got %d", result.Stats["filled_slots"])
	}

	if result.Stats["total_glyphs"] != 2 {
		t.Errorf("expected 2 total glyphs, got %d", result.Stats["total_glyphs"])
	}
}

func TestAlignGlyphsToSlotsMoreThanSlots(t *testing.T) {
	// Create 5 glyphs but only 3 slots
	glyphs := make([]FontGlyph, 5)
	for i := 0; i < 5; i++ {
		glyphs[i] = FontGlyph{
			RectIndex: i,
			BBox:      BBox{i * 10, 0, i*10 + 2, 2},
			Width:     3,
			Height:    3,
			Bitmap2D:  [][]int{{1, 0, 0}, {0, 1, 0}, {0, 0, 1}},
		}
	}

	result := AlignGlyphsToSlots(glyphs, 3, 5, 5, false)

	if result.SlotCount != 3 {
		t.Errorf("expected 3 slots, got %d", result.SlotCount)
	}

	// Should only fill first 3 slots
	if result.Stats["filled_slots"] != 3 {
		t.Errorf("expected 3 filled slots, got %d", result.Stats["filled_slots"])
	}
}

func TestAlignGlyphsToSlotsEmpty(t *testing.T) {
	result := AlignGlyphsToSlots([]FontGlyph{}, 4, 5, 5, false)

	if result.SlotCount != 4 {
		t.Errorf("expected 4 slots, got %d", result.SlotCount)
	}

	if result.Stats["filled_slots"] != 0 {
		t.Errorf("expected 0 filled slots, got %d", result.Stats["filled_slots"])
	}

	if result.Stats["total_glyphs"] != 0 {
		t.Errorf("expected 0 total glyphs, got %d", result.Stats["total_glyphs"])
	}
}
