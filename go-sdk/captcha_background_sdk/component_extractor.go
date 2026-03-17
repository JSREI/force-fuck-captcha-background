package captcha_background_sdk

import (
	"image/color"
)

// Component represents a connected component extracted from a diff mask.
// A component is a group of adjacent pixels that differ from the background.
type Component struct {
	Color      RGB    // Average color of the component (RGB)
	BBox       BBox   // Bounding box [left, top, right, bottom] of the component
	PixelCount int    // Total number of pixels in the component
	Pixels     []Pixel // Coordinates of all pixels in the component (optional based on includePixels)
}

// ExtractComponents extracts connected components from a diff mask using flood fill algorithm.
// Components are groups of adjacent pixels that differ from the background.
//
// Parameters:
//   - mask: Boolean array indicating which pixels differ from background
//   - colors: RGBA colors of the differing pixels
//   - width, height: Dimensions of the image
//   - connectivity: Pixel connectivity (4 or 8). 4-connectivity checks N/S/E/W neighbors;
//                   8-connectivity also includes diagonal neighbors
//   - minComponentPixels: Minimum pixel count for a component to be included
//   - includePixels: If true, include individual pixel coordinates in the result
//   - colorSensitive: If true, split components by color similarity
//
// Returns a slice of Component structs sorted by bounding box left coordinate.
func ExtractComponents(
	mask []bool,
	colors []color.RGBA,
	width, height int,
	connectivity int,
	minComponentPixels int,
	includePixels bool,
	colorSensitive bool,
) []Component {
	if connectivity != 4 && connectivity != 8 {
		connectivity = 8
	}

	visited := make([]bool, width*height)
	var components []Component

	for y := 0; y < height; y++ {
		for x := 0; x < width; x++ {
			idx := y*width + x
			if !mask[idx] || visited[idx] {
				continue
			}

			// Start flood fill from this pixel
			component := floodFill(
				mask, colors, visited,
				width, height,
				x, y,
				connectivity,
				includePixels,
				colorSensitive,
			)

			if component.PixelCount >= minComponentPixels {
				components = append(components, component)
			}
		}
	}

	return components
}

// floodFill performs flood fill to find a connected component
func floodFill(
	mask []bool,
	colors []color.RGBA,
	visited []bool,
	width, height int,
	startX, startY int,
	connectivity int,
	includePixels bool,
	colorSensitive bool,
) Component {
	var pixels []Pixel
	var pixelColors []color.RGBA
	minX, minY := startX, startY
	maxX, maxY := startX, startY

	// BFS queue
	queue := []Pixel{{startX, startY}}
	visited[startY*width+startX] = true

	var directions []Pixel
	if connectivity == 4 {
		directions = []Pixel{{0, -1}, {1, 0}, {0, 1}, {-1, 0}}
	} else {
		directions = []Pixel{
			{-1, -1}, {0, -1}, {1, -1},
			{-1, 0},           {1, 0},
			{-1, 1},  {0, 1},  {1, 1},
		}
	}

	startIdx := startY*width + startX
	refColor := colors[startIdx]

	for len(queue) > 0 {
		// Pop from queue
		p := queue[0]
		queue = queue[1:]

		pixels = append(pixels, p)
		idx := p[1]*width + p[0]
		pixelColors = append(pixelColors, colors[idx])

		if p[0] < minX {
			minX = p[0]
		}
		if p[0] > maxX {
			maxX = p[0]
		}
		if p[1] < minY {
			minY = p[1]
		}
		if p[1] > maxY {
			maxY = p[1]
		}

		// Check neighbors
		for _, d := range directions {
			nx, ny := p[0]+d[0], p[1]+d[1]
			if nx < 0 || nx >= width || ny < 0 || ny >= height {
				continue
			}

			nidx := ny*width + nx
			if visited[nidx] || !mask[nidx] {
				continue
			}

			// Color check if color-sensitive
			if colorSensitive {
				nc := colors[nidx]
				if !colorsEqual(nc, refColor) {
					continue
				}
			}

			visited[nidx] = true
			queue = append(queue, Pixel{nx, ny})
		}
	}

	// Compute average color
	avgColor := computeAverageColor(pixelColors)

	result := Component{
		Color:      avgColor,
		BBox:       BBox{minX, minY, maxX, maxY},
		PixelCount: len(pixels),
	}

	if includePixels {
		result.Pixels = pixels
	}

	return result
}

// colorsEqual checks if two colors are equal
func colorsEqual(c1, c2 color.RGBA) bool {
	return c1.R == c2.R && c1.G == c2.G && c1.B == c2.B && c1.A == c2.A
}

// computeAverageColor computes the average color of a list of colors
func computeAverageColor(colors []color.RGBA) RGB {
	if len(colors) == 0 {
		return RGB{0, 0, 0}
	}

	var sumR, sumG, sumB int
	for _, c := range colors {
		sumR += int(c.R)
		sumG += int(c.G)
		sumB += int(c.B)
	}

	n := len(colors)
	return RGB{sumR / n, sumG / n, sumB / n}
}
