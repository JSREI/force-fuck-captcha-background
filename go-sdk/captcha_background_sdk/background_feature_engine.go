package captcha_background_sdk

import (
	"math"
)

// BackgroundFeatureEngine extracts texture and deep learning features from background images.
// These features can be used for background classification, similarity matching,
// and quality assessment.
type BackgroundFeatureEngine struct{}

// NewBackgroundFeatureEngine creates a new background feature extractor.
func NewBackgroundFeatureEngine() *BackgroundFeatureEngine {
	return &BackgroundFeatureEngine{}
}

// ExtractTextureMetrics extracts texture analysis metrics from a background image.
// It computes histograms, edge densities, and energy distributions across image regions.
//
// Parameters:
//   - pixels: The background image pixels
//   - gridRows: Number of rows for spatial grid division
//   - gridCols: Number of columns for spatial grid division
//   - histogramBins: Number of bins for grayscale histogram
//   - edgeThreshold: Threshold for edge detection
//
// Returns a BackgroundTextureResult containing histograms, edge maps, and energy metrics.
func (e *BackgroundFeatureEngine) ExtractTextureMetrics(
	pixels *RGBAPixels,
	gridRows int,
	gridCols int,
	histogramBins int,
	edgeThreshold float64,
) *BackgroundTextureResult {
	w, h := pixels.Width, pixels.Height

	// Convert to grayscale
	gray := make([][]float64, h)
	for y := 0; y < h; y++ {
		gray[y] = make([]float64, w)
		for x := 0; x < w; x++ {
			c := pixels.GetPixel(x, y)
			// Standard grayscale conversion
			gray[y][x] = 0.299*float64(c.R) + 0.587*float64(c.G) + 0.114*float64(c.B)
		}
	}

	// Calculate histogram
	histogram := make([]float64, histogramBins)
	for y := 0; y < h; y++ {
		for x := 0; x < w; x++ {
			bin := int(gray[y][x] / 256.0 * float64(histogramBins))
			if bin >= histogramBins {
				bin = histogramBins - 1
			}
			histogram[bin]++
		}
	}

	// Normalize histogram
	totalPixels := float64(w * h)
	for i := range histogram {
		histogram[i] /= totalPixels
	}

	// Calculate mean and std
	meanIntensity := 0.0
	for y := 0; y < h; y++ {
		for x := 0; x < w; x++ {
			meanIntensity += gray[y][x]
		}
	}
	meanIntensity /= totalPixels

	variance := 0.0
	for y := 0; y < h; y++ {
		for x := 0; x < w; x++ {
			diff := gray[y][x] - meanIntensity
			variance += diff * diff
		}
	}
	variance /= totalPixels
	stdIntensity := math.Sqrt(variance)

	// Calculate entropy
	entropy := 0.0
	for _, p := range histogram {
		if p > 0 {
			entropy -= p * math.Log2(p)
		}
	}

	// Calculate edge density using simple gradient
	edgeCount := 0
	edgePixels := 0
	for y := 1; y < h-1; y++ {
		for x := 1; x < w-1; x++ {
			// Simple Sobel-like gradient
			dx := gray[y][x+1] - gray[y][x-1]
			dy := gray[y+1][x] - gray[y-1][x]
			gradient := math.Sqrt(dx*dx + dy*dy)

			if gradient > edgeThreshold {
				edgeCount++
			}
			edgePixels++
		}
	}

	edgeDensity := 0.0
	if edgePixels > 0 {
		edgeDensity = float64(edgeCount) / float64(edgePixels)
	}

	// Calculate grid energy
	gridEnergy := make([]float64, gridRows*gridCols)
	cellWidth := w / gridCols
	cellHeight := h / gridRows

	for gy := 0; gy < gridRows; gy++ {
		for gx := 0; gx < gridCols; gx++ {
			cellSum := 0.0
			cellPixels := 0

			startY := gy * cellHeight
			endY := startY + cellHeight
			if endY > h {
				endY = h
			}

			startX := gx * cellWidth
			endX := startX + cellWidth
			if endX > w {
				endX = w
			}

			for y := startY; y < endY; y++ {
				for x := startX; x < endX; x++ {
					cellSum += gray[y][x]
					cellPixels++
				}
			}

			if cellPixels > 0 {
				gridEnergy[gy*gridCols+gx] = cellSum / float64(cellPixels)
			}
		}
	}

	return &BackgroundTextureResult{
		ImageSize:     [2]int{w, h},
		MeanIntensity: meanIntensity,
		StdIntensity:  stdIntensity,
		Entropy:       entropy,
		EdgeDensity:   edgeDensity,
		Histogram:     histogram,
		GridEnergy:    gridEnergy,
		Stats: map[string]float64{
			"mean_intensity": meanIntensity,
			"std_intensity":  stdIntensity,
			"entropy":        entropy,
			"edge_density":   edgeDensity,
		},
	}
}

// ExtractDeepVector extracts deep feature vector from background
func (e *BackgroundFeatureEngine) ExtractDeepVector(
	pixels *RGBAPixels,
	levels []int,
	edgeThreshold float64,
) *BackgroundDeepFeatureResult {
	w, h := pixels.Width, pixels.Height

	// Convert to grayscale
	gray := make([][]float64, h)
	for y := 0; y < h; y++ {
		gray[y] = make([]float64, w)
		for x := 0; x < w; x++ {
			c := pixels.GetPixel(x, y)
			gray[y][x] = 0.299*float64(c.R) + 0.587*float64(c.G) + 0.114*float64(c.B)
		}
	}

	var vector []float64
	patchCount := 0

	for _, level := range levels {
		if level <= 0 {
			continue
		}

		// Divide image into level x level patches
		patchWidth := w / level
		patchHeight := h / level

		for py := 0; py < level; py++ {
			for px := 0; px < level; px++ {
				startX := px * patchWidth
				startY := py * patchHeight
				endX := startX + patchWidth
				endY := startY + patchHeight

				if endX > w {
					endX = w
				}
				if endY > h {
					endY = h
				}

				// Calculate patch statistics
				patchMean := 0.0
				patchPixels := 0

				for y := startY; y < endY; y++ {
					for x := startX; x < endX; x++ {
						patchMean += gray[y][x]
						patchPixels++
					}
				}

				if patchPixels > 0 {
					patchMean /= float64(patchPixels)
				}

				// Calculate patch std
				patchVar := 0.0
				for y := startY; y < endY; y++ {
					for x := startX; x < endX; x++ {
						diff := gray[y][x] - patchMean
						patchVar += diff * diff
					}
				}
				patchStd := 0.0
				if patchPixels > 0 {
					patchStd = math.Sqrt(patchVar / float64(patchPixels))
				}

				// Calculate patch edge density
				patchEdges := 0
				patchEdgePixels := 0
				for y := startY + 1; y < endY-1; y++ {
					for x := startX + 1; x < endX-1; x++ {
						dx := gray[y][x+1] - gray[y][x-1]
						dy := gray[y+1][x] - gray[y-1][x]
						gradient := math.Sqrt(dx*dx + dy*dy)

						if gradient > edgeThreshold {
							patchEdges++
						}
						patchEdgePixels++
					}
				}

				patchEdgeDensity := 0.0
				if patchEdgePixels > 0 {
					patchEdgeDensity = float64(patchEdges) / float64(patchEdgePixels)
				}

				// Add to vector
				vector = append(vector, patchMean/255.0) // Normalize
				vector = append(vector, patchStd/255.0)
				vector = append(vector, patchEdgeDensity)

				patchCount++
			}
		}
	}

	return &BackgroundDeepFeatureResult{
		ImageSize:  [2]int{w, h},
		Levels:     levels,
		PatchCount: patchCount,
		Vector1D:   vector,
		Stats: map[string]float64{
			"vector_length": float64(len(vector)),
			"patch_count":   float64(patchCount),
		},
	}
}
