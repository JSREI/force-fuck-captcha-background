package captcha_background_sdk

import (
	"math"
)

// GlyphFeatureExtractor extracts machine learning features from font glyphs.
// It resizes glyph bitmaps to standardized dimensions and computes feature vectors
// suitable for training classifiers or neural networks.
type GlyphFeatureExtractor struct{}

// NewGlyphFeatureExtractor creates a new glyph feature extractor.
func NewGlyphFeatureExtractor() *GlyphFeatureExtractor {
	return &GlyphFeatureExtractor{}
}

// ExtractFeatures extracts machine learning features from a glyph.
// It resizes the glyph bitmap to target dimensions and computes a feature vector.
//
// Parameters:
//   - glyph: The font glyph to extract features from
//   - targetWidth: Target width for the resized bitmap
//   - targetHeight: Target height for the resized bitmap
//   - keepAspectRatio: If true, preserve aspect ratio by adding padding
//
// Returns a FontGlyphFeature containing the resized bitmap, feature vector, and density metrics.
func (e *GlyphFeatureExtractor) ExtractFeatures(
	glyph *FontGlyph,
	targetWidth int,
	targetHeight int,
	keepAspectRatio bool,
) *FontGlyphFeature {
	// Resize bitmap to target size
	resizedBitmap := e.resizeBitmap(glyph.Bitmap2D, targetWidth, targetHeight, keepAspectRatio)

	// Convert to 1D vector
	vector1D := make([]int, targetWidth*targetHeight)
	for y := 0; y < targetHeight; y++ {
		for x := 0; x < targetWidth; x++ {
			vector1D[y*targetWidth+x] = resizedBitmap[y][x]
		}
	}

	// Calculate density
	totalPixels := targetWidth * targetHeight
	filledPixels := 0
	for _, v := range vector1D {
		if v > 0 {
			filledPixels++
		}
	}
	density := float64(filledPixels) / float64(totalPixels)

	return &FontGlyphFeature{
		RectIndex:       glyph.RectIndex,
		BBox:            glyph.BBox,
		Width:           glyph.Width,
		Height:          glyph.Height,
		Color:           glyph.Color,
		PixelCount:      glyph.PixelCount,
		Density:         density,
		Bitmap2D:        glyph.Bitmap2D,
		ResizedBitmap2D: resizedBitmap,
		Vector1D:        vector1D,
	}
}

// resizeBitmap resizes a bitmap to target dimensions
func (e *GlyphFeatureExtractor) resizeBitmap(
	src [][]int,
	targetWidth int,
	targetHeight int,
	keepAspectRatio bool,
) [][]int {
	srcHeight := len(src)
	srcWidth := 0
	if srcHeight > 0 {
		srcWidth = len(src[0])
	}

	if srcWidth == 0 || srcHeight == 0 {
		// Empty bitmap, return zeros
		result := make([][]int, targetHeight)
		for y := 0; y < targetHeight; y++ {
			result[y] = make([]int, targetWidth)
		}
		return result
	}

	// Calculate scale factors
	scaleX := float64(targetWidth) / float64(srcWidth)
	scaleY := float64(targetHeight) / float64(srcHeight)

	if keepAspectRatio {
		// Use the smaller scale to fit within target
		scale := math.Min(scaleX, scaleY)
		scaleX = scale
		scaleY = scale
	}

	// Create output bitmap
	result := make([][]int, targetHeight)
	for y := 0; y < targetHeight; y++ {
		result[y] = make([]int, targetWidth)
	}

	// Nearest neighbor sampling
	for y := 0; y < targetHeight; y++ {
		for x := 0; x < targetWidth; x++ {
			srcX := int(float64(x) / scaleX)
			srcY := int(float64(y) / scaleY)

			if srcX >= 0 && srcX < srcWidth && srcY >= 0 && srcY < srcHeight {
				result[y][x] = src[srcY][srcX]
			}
		}
	}

	return result
}

// ExtractFeaturesFromGlyphs extracts features from multiple glyphs
func (e *GlyphFeatureExtractor) ExtractFeaturesFromGlyphs(
	glyphs []FontGlyph,
	targetWidth int,
	targetHeight int,
	keepAspectRatio bool,
) []FontGlyphFeature {
	var features []FontGlyphFeature
	for i := range glyphs {
		feature := e.ExtractFeatures(&glyphs[i], targetWidth, targetHeight, keepAspectRatio)
		features = append(features, *feature)
	}
	return features
}

// AlignGlyphsToSlots aligns glyphs to fixed slots
func AlignGlyphsToSlots(
	glyphs []FontGlyph,
	slotCount int,
	targetWidth int,
	targetHeight int,
	keepAspectRatio bool,
) *FontGlyphSlotExtractResult {
	extractor := NewGlyphFeatureExtractor()
	features := extractor.ExtractFeaturesFromGlyphs(glyphs, targetWidth, targetHeight, keepAspectRatio)

	// Sort features by x position (left to right)
	for i := 0; i < len(features); i++ {
		for j := i + 1; j < len(features); j++ {
			if features[j].BBox[0] < features[i].BBox[0] {
				features[i], features[j] = features[j], features[i]
			}
		}
	}

	// Create slots
	slots := make([]FontGlyphSlot, slotCount)
	filledCount := 0

	for i := 0; i < slotCount; i++ {
		slots[i] = FontGlyphSlot{
			SlotIndex: i,
			Present:   false,
			Vector1D:  make([]int, targetWidth*targetHeight),
		}
	}

	// Assign features to slots (simple: first N glyphs go to first N slots)
	for i, feature := range features {
		if i >= slotCount {
			break
		}
		slots[i] = FontGlyphSlot{
			SlotIndex: i,
			Present:   true,
			RectIndex: &feature.RectIndex,
			BBox:      &feature.BBox,
			Vector1D:  feature.Vector1D,
			Density:   feature.Density,
		}
		filledCount++
	}

	return &FontGlyphSlotExtractResult{
		SlotCount:  slotCount,
		Slots:      slots,
		TargetSize: [2]int{targetWidth, targetHeight},
		Stats: map[string]int{
			"filled_slots": filledCount,
			"total_glyphs": len(glyphs),
		},
	}
}
