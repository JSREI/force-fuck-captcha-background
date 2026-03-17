package captcha_background_sdk

import (
	"testing"
)

func TestDefaultTextRegionFilterConfig(t *testing.T) {
	config := DefaultTextRegionFilterConfig()

	if config.MinWidth != 3 {
		t.Errorf("expected MinWidth=3, got %d", config.MinWidth)
	}

	if config.MinHeight != 3 {
		t.Errorf("expected MinHeight=3, got %d", config.MinHeight)
	}

	if config.MinFillRatio != 0.06 {
		t.Errorf("expected MinFillRatio=0.06, got %f", config.MinFillRatio)
	}

	if config.MaxFillRatio != 0.95 {
		t.Errorf("expected MaxFillRatio=0.95, got %f", config.MaxFillRatio)
	}

	if config.MergeGap != 2 {
		t.Errorf("expected MergeGap=2, got %d", config.MergeGap)
	}

	if config.MinVerticalOverlapRatio != 0.4 {
		t.Errorf("expected MinVerticalOverlapRatio=0.4, got %f", config.MinVerticalOverlapRatio)
	}

	if config.ExpectedRegionCount == nil || *config.ExpectedRegionCount != 4 {
		t.Errorf("expected ExpectedRegionCount=4, got %v", config.ExpectedRegionCount)
	}

	if config.ForceMergeMaxGap != 28 {
		t.Errorf("expected ForceMergeMaxGap=28, got %d", config.ForceMergeMaxGap)
	}
}

func TestBuildTextRegionsEmpty(t *testing.T) {
	config := DefaultTextRegionFilterConfig()
	regions := BuildTextRegions([]Component{}, false, config)

	if len(regions) != 0 {
		t.Errorf("expected 0 regions for empty components, got %d", len(regions))
	}
}

func TestBuildTextRegionsSingleComponent(t *testing.T) {
	config := TextRegionFilterConfig{
		MinWidth:                3,
		MinHeight:               3,
		MinFillRatio:            0.1,
		MaxFillRatio:            0.95,
		MergeGap:                2,
		MinVerticalOverlapRatio: 0.4,
		ExpectedRegionCount:     nil,
		ForceMergeMaxGap:        28,
	}

	components := []Component{
		{
			BBox:       BBox{0, 0, 9, 9},
			PixelCount: 80,
			Color:      RGB{255, 0, 0},
		},
	}

	regions := BuildTextRegions(components, false, config)

	if len(regions) != 1 {
		t.Errorf("expected 1 region, got %d", len(regions))
	}

	if regions[0].PixelCount != 80 {
		t.Errorf("expected pixel count 80, got %d", regions[0].PixelCount)
	}
}

func TestBuildTextRegionsFilterBySize(t *testing.T) {
	config := TextRegionFilterConfig{
		MinWidth:                5,
		MinHeight:               5,
		MinFillRatio:            0.1,
		MaxFillRatio:            0.95,
		MergeGap:                2,
		MinVerticalOverlapRatio: 0.4,
		ExpectedRegionCount:     nil,
		ForceMergeMaxGap:        28,
	}

	components := []Component{
		{
			BBox:       BBox{0, 0, 2, 2}, // Too small
			PixelCount: 5,
			Color:      RGB{255, 0, 0},
		},
		{
			BBox:       BBox{10, 10, 19, 19}, // Large enough
			PixelCount: 80,
			Color:      RGB{0, 255, 0},
		},
	}

	regions := BuildTextRegions(components, false, config)

	if len(regions) != 1 {
		t.Errorf("expected 1 region after filtering, got %d", len(regions))
	}
}

func TestBuildTextRegionsFilterByFillRatio(t *testing.T) {
	config := TextRegionFilterConfig{
		MinWidth:                3,
		MinHeight:               3,
		MinFillRatio:            0.3,
		MaxFillRatio:            0.8,
		MergeGap:                2,
		MinVerticalOverlapRatio: 0.4,
		ExpectedRegionCount:     nil,
		ForceMergeMaxGap:        28,
	}

	components := []Component{
		{
			BBox:       BBox{0, 0, 9, 9}, // 100 pixels, PixelCount=5 -> 5% fill (too low)
			PixelCount: 5,
			Color:      RGB{255, 0, 0},
		},
		{
			BBox:       BBox{10, 10, 19, 19}, // 100 pixels, PixelCount=50 -> 50% fill (ok)
			PixelCount: 50,
			Color:      RGB{0, 255, 0},
		},
	}

	regions := BuildTextRegions(components, false, config)

	if len(regions) != 1 {
		t.Errorf("expected 1 region after fill ratio filtering, got %d", len(regions))
	}
}

func TestShouldMerge(t *testing.T) {
	c1 := Component{BBox: BBox{0, 0, 9, 9}}
	c2 := Component{BBox: BBox{11, 0, 20, 9}} // Gap of 1

	// Should merge with gap=2 and overlap ratio 1.0
	if !shouldMerge(c1, c2, 2, 0.4) {
		t.Error("expected components to merge with small gap")
	}

	// Should not merge with gap=0
	if shouldMerge(c1, c2, 0, 0.4) {
		t.Error("expected components not to merge with gap=0")
	}
}

func TestShouldMergeVerticalOverlap(t *testing.T) {
	c1 := Component{BBox: BBox{0, 0, 9, 9}}
	c2 := Component{BBox: BBox{11, 5, 20, 14}} // Vertical overlap: 5 pixels

	// Both are 10 pixels high, overlap is 5 pixels = 50%
	if !shouldMerge(c1, c2, 2, 0.4) {
		t.Error("expected components to merge with 50% vertical overlap")
	}

	if shouldMerge(c1, c2, 2, 0.6) {
		t.Error("expected components not to merge with min overlap=60%")
	}
}

func TestBuildRegionFromComponents(t *testing.T) {
	components := []Component{
		{
			BBox:       BBox{0, 0, 9, 9},
			PixelCount: 50,
			Color:      RGB{255, 0, 0},
			Pixels:     []Pixel{{1, 1}, {2, 2}},
		},
		{
			BBox:       BBox{10, 0, 19, 9},
			PixelCount: 60,
			Color:      RGB{0, 255, 0},
			Pixels:     []Pixel{{11, 1}, {12, 2}},
		},
	}

	region := buildRegionFromComponents(components)

	expectedBBox := BBox{0, 0, 19, 9}
	if region.BBox != expectedBBox {
		t.Errorf("expected bbox %v, got %v", expectedBBox, region.BBox)
	}

	if region.PixelCount != 110 {
		t.Errorf("expected pixel count 110, got %d", region.PixelCount)
	}

	if region.ComponentCount != 2 {
		t.Errorf("expected component count 2, got %d", region.ComponentCount)
	}

	if len(region.Colors) != 2 {
		t.Errorf("expected 2 colors, got %d", len(region.Colors))
	}
}

func TestCalculateRegionScore(t *testing.T) {
	// Test with good aspect ratio
	region1 := TextRegion{
		BBox:           BBox{0, 0, 9, 19}, // aspect ratio 0.5
		PixelCount:     100,
		ComponentCount: 4,
	}
	score1 := calculateRegionScore(region1)

	// Test with bad aspect ratio
	region2 := TextRegion{
		BBox:           BBox{0, 0, 9, 99}, // aspect ratio 0.1 (extreme)
		PixelCount:     100,
		ComponentCount: 1,
	}
	score2 := calculateRegionScore(region2)

	if score1 <= score2 {
		t.Error("expected good aspect ratio to have higher score than bad aspect ratio")
	}
}

func TestMergeTwoRegions(t *testing.T) {
	r1 := TextRegion{
		BBox:           BBox{0, 0, 9, 9},
		PixelCount:     50,
		ComponentCount: 1,
		Colors:         []RGB{{255, 0, 0}},
		Score:          100,
	}
	r2 := TextRegion{
		BBox:           BBox{11, 0, 20, 9},
		PixelCount:     60,
		ComponentCount: 2,
		Colors:         []RGB{{0, 255, 0}},
		Score:          150,
	}

	merged := mergeTwoRegions(r1, r2)

	expectedBBox := BBox{0, 0, 20, 9}
	if merged.BBox != expectedBBox {
		t.Errorf("expected merged bbox %v, got %v", expectedBBox, merged.BBox)
	}

	if merged.PixelCount != 110 {
		t.Errorf("expected merged pixel count 110, got %d", merged.PixelCount)
	}

	if merged.ComponentCount != 3 {
		t.Errorf("expected merged component count 3, got %d", merged.ComponentCount)
	}

	if merged.Score != 250 {
		t.Errorf("expected merged score 250, got %f", merged.Score)
	}

	if len(merged.Colors) != 2 {
		t.Errorf("expected 2 colors in merged region, got %d", len(merged.Colors))
	}
}

func TestUnionFind(t *testing.T) {
	uf := newUnionFind(5)

	// Initially, each element is its own parent
	for i := 0; i < 5; i++ {
		if uf.find(i) != i {
			t.Errorf("expected find(%d) = %d initially", i, i)
		}
	}

	// Union 0 and 1
	uf.union(0, 1)
	if uf.find(0) != uf.find(1) {
		t.Error("expected 0 and 1 to be in same set after union")
	}

	// Union 2 and 3
	uf.union(2, 3)
	if uf.find(2) != uf.find(3) {
		t.Error("expected 2 and 3 to be in same set after union")
	}

	// 0 and 2 should still be different
	if uf.find(0) == uf.find(2) {
		t.Error("expected 0 and 2 to be in different sets")
	}

	// Union 1 and 2 (should connect all: 0, 1, 2, 3)
	uf.union(1, 2)
	if uf.find(0) != uf.find(2) {
		t.Error("expected 0 and 2 to be in same set after union 1-2")
	}
	if uf.find(0) != uf.find(3) {
		t.Error("expected 0 and 3 to be in same set after union 1-2")
	}

	// 4 should still be separate
	if uf.find(4) == uf.find(0) {
		t.Error("expected 4 to be in different set from 0")
	}
}

func TestUnionBBox(t *testing.T) {
	b1 := BBox{0, 0, 10, 10}
	b2 := BBox{5, 5, 20, 20}

	result := UnionBBox(b1, b2)
	expected := BBox{0, 0, 20, 20}

	if result != expected {
		t.Errorf("expected %v, got %v", expected, result)
	}
}

func TestMinMaxHelpers(t *testing.T) {
	if min(3, 5) != 3 {
		t.Errorf("min(3, 5) expected 3, got %d", min(3, 5))
	}

	if min(5, 3) != 3 {
		t.Errorf("min(5, 3) expected 3, got %d", min(5, 3))
	}

	if max(3, 5) != 5 {
		t.Errorf("max(3, 5) expected 5, got %d", max(3, 5))
	}

	if max(5, 3) != 5 {
		t.Errorf("max(5, 3) expected 5, got %d", max(5, 3))
	}
}

func TestMin3Max3(t *testing.T) {
	if min3(5, 3, 4) != 3 {
		t.Errorf("min3(5, 3, 4) expected 3, got %d", min3(5, 3, 4))
	}

	if max3(5, 3, 4) != 5 {
		t.Errorf("max3(5, 3, 4) expected 5, got %d", max3(5, 3, 4))
	}
}

func TestForceMergeRegions(t *testing.T) {
	regions := []TextRegion{
		{BBox: BBox{0, 0, 9, 9}, Score: 100},
		{BBox: BBox{11, 0, 20, 9}, Score: 90},
		{BBox: BBox{22, 0, 31, 9}, Score: 80},
		{BBox: BBox{40, 0, 49, 9}, Score: 70}, // Far away, won't be merged
	}

	merged := forceMergeRegions(regions, 2, 15)

	if len(merged) > 3 {
		t.Errorf("expected at most 3 regions after merge, got %d", len(merged))
	}
}
