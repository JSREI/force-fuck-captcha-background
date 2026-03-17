package captcha_background_sdk

import (
	"math"
	"sort"
)

// TextRegionFilterConfig represents configuration for filtering and merging text regions.
// These parameters control how individual components are grouped into text regions.
type TextRegionFilterConfig struct {
	MinWidth                int     // Minimum width of a text region in pixels
	MinHeight               int     // Minimum height of a text region in pixels
	MinFillRatio            float64 // Minimum ratio of pixels to bounding box area (0.0-1.0)
	MaxFillRatio            float64 // Maximum ratio of pixels to bounding box area (0.0-1.0)
	MergeGap                int     // Maximum horizontal gap for merging adjacent regions
	MinVerticalOverlapRatio float64 // Minimum vertical overlap ratio for merging (0.0-1.0)
	ExpectedRegionCount     *int    // Expected number of text regions (e.g., 4 for 4-character captchas)
	ForceMergeMaxGap        int     // Maximum gap for forced merging to reach expected count
}

// DefaultTextRegionFilterConfig returns the default configuration for text region filtering.
// These defaults are suitable for common captcha images with 4 characters.
func DefaultTextRegionFilterConfig() TextRegionFilterConfig {
	return TextRegionFilterConfig{
		MinWidth:                    3,
		MinHeight:                   3,
		MinFillRatio:                0.06,
		MaxFillRatio:                0.95,
		MergeGap:                    2,
		MinVerticalOverlapRatio:     0.4,
		ExpectedRegionCount:         intPtr(4),
		ForceMergeMaxGap:            28,
	}
}

func intPtr(i int) *int {
	return &i
}

// BuildTextRegions builds text regions from components
func BuildTextRegions(
	components []Component,
	includePixels bool,
	config TextRegionFilterConfig,
) []TextRegion {
	if len(components) == 0 {
		return []TextRegion{}
	}

	// First, filter components by size
	var filtered []Component
	for _, c := range components {
		width := c.BBox[2] - c.BBox[0] + 1
		height := c.BBox[3] - c.BBox[1] + 1
		area := width * height
		fillRatio := float64(c.PixelCount) / float64(area)

		if width >= config.MinWidth && height >= config.MinHeight &&
			fillRatio >= config.MinFillRatio && fillRatio <= config.MaxFillRatio {
			filtered = append(filtered, c)
		}
	}

	if len(filtered) == 0 {
		return []TextRegion{}
	}

	// Group components into regions by proximity
	regions := groupComponentsIntoRegions(filtered, config.MergeGap, config.MinVerticalOverlapRatio)

	// Calculate scores
	for i := range regions {
		regions[i].Score = calculateRegionScore(regions[i])
	}

	// Sort by score (descending)
	sort.Slice(regions, func(i, j int) bool {
		return regions[i].Score > regions[j].Score
	})

	// Force merge if needed to reach expected region count
	if config.ExpectedRegionCount != nil && len(regions) > *config.ExpectedRegionCount {
		regions = forceMergeRegions(regions, *config.ExpectedRegionCount, config.ForceMergeMaxGap)
	}

	// Limit pixels if not needed
	if !includePixels {
		for i := range regions {
			regions[i].Pixels = nil
		}
	}

	return regions
}

// groupComponentsIntoRegions groups components into regions
func groupComponentsIntoRegions(
	components []Component,
	mergeGap int,
	minVerticalOverlapRatio float64,
) []TextRegion {
	if len(components) == 0 {
		return []TextRegion{}
	}

	// Use union-find to group components
	uf := newUnionFind(len(components))

	for i := 0; i < len(components); i++ {
		for j := i + 1; j < len(components); j++ {
			c1, c2 := components[i], components[j]
			if shouldMerge(c1, c2, mergeGap, minVerticalOverlapRatio) {
				uf.union(i, j)
			}
		}
	}

	// Build regions from groups
	groups := make(map[int][]Component)
	for i, c := range components {
		root := uf.find(i)
		groups[root] = append(groups[root], c)
	}

	var regions []TextRegion
	for _, group := range groups {
		region := buildRegionFromComponents(group)
		regions = append(regions, region)
	}

	return regions
}

// Helper functions for min/max with 2+ arguments
func min3(a, b, c int) int {
	return min(a, min(b, c))
}

func max3(a, b, c int) int {
	return max(a, max(b, c))
}

// shouldMerge checks if two components should be merged
func shouldMerge(c1, c2 Component, mergeGap int, minVerticalOverlapRatio float64) bool {
	// Check horizontal/vertical distance
	hDist := max3(0, c2.BBox[0]-c1.BBox[2]-1, c1.BBox[0]-c2.BBox[2]-1)
	vDist := max3(0, c2.BBox[1]-c1.BBox[3]-1, c1.BBox[1]-c2.BBox[3]-1)

	if hDist > mergeGap || vDist > mergeGap {
		return false
	}

	// Check vertical overlap
	vOverlap := min(c1.BBox[3], c2.BBox[3]) - max(c1.BBox[1], c2.BBox[1]) + 1
	h1, h2 := c1.BBox[3]-c1.BBox[1]+1, c2.BBox[3]-c2.BBox[1]+1
	minHeight := min(h1, h2)

	if minHeight > 0 {
		overlapRatio := float64(vOverlap) / float64(minHeight)
		if overlapRatio < minVerticalOverlapRatio {
			return false
		}
	}

	return true
}

// buildRegionFromComponents builds a region from a group of components
func buildRegionFromComponents(components []Component) TextRegion {
	if len(components) == 0 {
		return TextRegion{}
	}

	// Union bounding box
	minX, minY := components[0].BBox[0], components[0].BBox[1]
	maxX, maxY := components[0].BBox[2], components[0].BBox[3]

	var allPixels []Pixel
	var colors []RGB
	pixelCount := 0

	for _, c := range components {
		if c.BBox[0] < minX {
			minX = c.BBox[0]
		}
		if c.BBox[1] < minY {
			minY = c.BBox[1]
		}
		if c.BBox[2] > maxX {
			maxX = c.BBox[2]
		}
		if c.BBox[3] > maxY {
			maxY = c.BBox[3]
		}

		pixelCount += c.PixelCount
		allPixels = append(allPixels, c.Pixels...)

		// Collect unique colors
		found := false
		for _, existing := range colors {
			if existing[0] == c.Color[0] && existing[1] == c.Color[1] && existing[2] == c.Color[2] {
				found = true
				break
			}
		}
		if !found {
			colors = append(colors, c.Color)
		}
	}

	return TextRegion{
		BBox:           BBox{minX, minY, maxX, maxY},
		PixelCount:     pixelCount,
		ComponentCount: len(components),
		Colors:         colors,
		Pixels:         allPixels,
	}
}

// calculateRegionScore calculates a score for a region
func calculateRegionScore(region TextRegion) float64 {
	width := region.BBox[2] - region.BBox[0] + 1
	height := region.BBox[3] - region.BBox[1] + 1
	area := width * height

	if area == 0 {
		return 0
	}

	fillRatio := float64(region.PixelCount) / float64(area)
	aspectRatio := float64(width) / float64(height)

	// Prefer regions with reasonable aspect ratio and fill
	score := float64(region.PixelCount) * fillRatio

	// Penalize extreme aspect ratios
	if aspectRatio < 0.2 || aspectRatio > 5 {
		score *= 0.5
	}

	// Bonus for multiple components (text-like)
	if region.ComponentCount >= 2 && region.ComponentCount <= 10 {
		score *= 1.2
	}

	return score
}

// forceMergeRegions force merges regions to reach target count
func forceMergeRegions(regions []TextRegion, targetCount int, maxGap int) []TextRegion {
	if len(regions) <= targetCount {
		return regions
	}

	// Sort by x position
	sort.Slice(regions, func(i, j int) bool {
		return regions[i].BBox[0] < regions[j].BBox[0]
	})

	// Merge closest regions
	for len(regions) > targetCount {
		// Find closest pair
		minGap := math.MaxInt32
		minIdx := -1

		for i := 0; i < len(regions)-1; i++ {
			gap := regions[i+1].BBox[0] - regions[i].BBox[2] - 1
			if gap < minGap && gap <= maxGap {
				minGap = gap
				minIdx = i
			}
		}

		if minIdx == -1 {
			break // Can't merge anymore
		}

		// Merge regions[minIdx] and regions[minIdx+1]
		merged := mergeTwoRegions(regions[minIdx], regions[minIdx+1])
		regions[minIdx] = merged
		regions = append(regions[:minIdx+1], regions[minIdx+2:]...)
	}

	return regions
}

// mergeTwoRegions merges two regions
func mergeTwoRegions(r1, r2 TextRegion) TextRegion {
	minX := min(r1.BBox[0], r2.BBox[0])
	minY := min(r1.BBox[1], r2.BBox[1])
	maxX := max(r1.BBox[2], r2.BBox[2])
	maxY := max(r1.BBox[3], r2.BBox[3])

	colors := r1.Colors
	for _, c := range r2.Colors {
		found := false
		for _, existing := range colors {
			if existing[0] == c[0] && existing[1] == c[1] && existing[2] == c[2] {
				found = true
				break
			}
		}
		if !found {
			colors = append(colors, c)
		}
	}

	return TextRegion{
		BBox:           BBox{minX, minY, maxX, maxY},
		PixelCount:     r1.PixelCount + r2.PixelCount,
		ComponentCount: r1.ComponentCount + r2.ComponentCount,
		Colors:         colors,
		Pixels:         append(r1.Pixels, r2.Pixels...),
		Score:          r1.Score + r2.Score,
	}
}

// UnionFind implements union-find data structure
type UnionFind struct {
	parent []int
}

func newUnionFind(n int) *UnionFind {
	uf := &UnionFind{
		parent: make([]int, n),
	}
	for i := 0; i < n; i++ {
		uf.parent[i] = i
	}
	return uf
}

func (uf *UnionFind) find(x int) int {
	if uf.parent[x] != x {
		uf.parent[x] = uf.find(uf.parent[x])
	}
	return uf.parent[x]
}

func (uf *UnionFind) union(x, y int) {
	px, py := uf.find(x), uf.find(y)
	if px != py {
		uf.parent[px] = py
	}
}

// UnionBBox computes the union of two bounding boxes
func UnionBBox(b1, b2 BBox) BBox {
	return BBox{
		min(b1[0], b2[0]),
		min(b1[1], b2[1]),
		max(b1[2], b2[2]),
		max(b1[3], b2[3]),
	}
}

// Helper functions
func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}

func max(a, b int) int {
	if a > b {
		return a
	}
	return b
}
