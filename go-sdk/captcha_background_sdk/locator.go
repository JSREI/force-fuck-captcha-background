package captcha_background_sdk

import (
	"fmt"
	"os"
	"path/filepath"
)

// CaptchaFontLocator provides text captcha detection and font component extraction.
// It compares captcha images against a background index to identify foreground text elements.
//
// The locator uses connected component analysis to extract individual characters from captcha images.
// It supports configurable thresholds for pixel difference detection and component filtering.
type CaptchaFontLocator struct {
	// diffThreshold is the color distance threshold for detecting pixel differences
	diffThreshold int

	// minComponentPixels is the minimum number of pixels required for a valid component
	minComponentPixels int

	// connectivity defines pixel connectivity for component extraction: 4 or 8
	connectivity int

	// textRegionFilter contains configuration for filtering text regions
	textRegionFilter TextRegionFilterConfig

	// backgrounds stores the background index mapping group IDs to metadata
	backgrounds map[string]BackgroundMeta
}

// NewCaptchaFontLocator creates a new font locator
func NewCaptchaFontLocator(
	diffThreshold int,
	minComponentPixels int,
	connectivity int,
	textMinWidth int,
	textMinHeight int,
	textMinFillRatio float64,
	textMaxFillRatio float64,
	textMergeGap int,
	textMinVerticalOverlapRatio float64,
	textExpectedRegionCount *int,
	textForceMergeMaxGap int,
) *CaptchaFontLocator {
	if connectivity != 4 && connectivity != 8 {
		connectivity = 8
	}

	return &CaptchaFontLocator{
		diffThreshold:      diffThreshold,
		minComponentPixels: minComponentPixels,
		connectivity:       connectivity,
		textRegionFilter: TextRegionFilterConfig{
			MinWidth:                textMinWidth,
			MinHeight:               textMinHeight,
			MinFillRatio:            textMinFillRatio,
			MaxFillRatio:            textMaxFillRatio,
			MergeGap:                textMergeGap,
			MinVerticalOverlapRatio: textMinVerticalOverlapRatio,
			ExpectedRegionCount:     textExpectedRegionCount,
			ForceMergeMaxGap:        textForceMergeMaxGap,
		},
		backgrounds: make(map[string]BackgroundMeta),
	}
}

// SetBackgroundIndex sets the background index
func (l *CaptchaFontLocator) SetBackgroundIndex(index map[string]BackgroundMeta) {
	l.backgrounds = make(map[string]BackgroundMeta)
	for k, v := range index {
		l.backgrounds[k] = v
	}
}

// GetBackgrounds gets the background index
func (l *CaptchaFontLocator) GetBackgrounds() map[string]BackgroundMeta {
	return l.backgrounds
}

// BuildBackgroundIndex builds the background index
func (l *CaptchaFontLocator) BuildBackgroundIndex(
	backgroundDir string,
	recursive bool,
	exts []string,
) (map[string]BackgroundMeta, error) {
	index, err := BuildBackgroundIndex(backgroundDir, recursive, exts)
	if err != nil {
		return nil, err
	}
	l.SetBackgroundIndex(index)
	return index, nil
}

// matchBackground matches captcha to background
func (l *CaptchaFontLocator) matchBackground(captchaPath string) (string, *RGBAPixels, BackgroundMeta, error) {
	if len(l.backgrounds) == 0 {
		return "", nil, BackgroundMeta{}, fmt.Errorf("background index is empty, call BuildBackgroundIndex first")
	}

	captchaPixels, err := LoadRgbaPixels(captchaPath)
	if err != nil {
		return "", nil, BackgroundMeta{}, err
	}

	groupID := GroupIDFromPixels(captchaPixels)
	bgMeta, ok := l.backgrounds[groupID]
	if !ok {
		return "", nil, BackgroundMeta{}, fmt.Errorf("group_id not found in background index: %s", groupID)
	}

	if captchaPixels.Width != bgMeta.Width || captchaPixels.Height != bgMeta.Height {
		return "", nil, BackgroundMeta{}, fmt.Errorf("size mismatch: captcha=%dx%d, background=%dx%d",
			captchaPixels.Width, captchaPixels.Height, bgMeta.Width, bgMeta.Height)
	}

	return groupID, captchaPixels, bgMeta, nil
}

// LocateFonts locates font components in captcha
func (l *CaptchaFontLocator) LocateFonts(
	captchaPath string,
	includePixels bool,
) (*LocateResult, error) {
	groupID, captchaPixels, bgMeta, err := l.matchBackground(captchaPath)
	if err != nil {
		return nil, err
	}

	// Load background
	bgPixels, err := LoadRgbaPixels(bgMeta.ImagePath)
	if err != nil {
		return nil, err
	}

	// Build diff
	diff := BuildDiff(captchaPixels, bgPixels, l.diffThreshold)

	// Extract components (color sensitive)
	components := ExtractComponents(
		diff.Mask,
		diff.Colors,
		captchaPixels.Width,
		captchaPixels.Height,
		l.connectivity,
		l.minComponentPixels,
		includePixels,
		true,
	)

	// Convert to FontComponent
	fontComponents := make([]FontComponent, len(components))
	for i, c := range components {
		fontComponents[i] = FontComponent{
			Color:      c.Color,
			BBox:       c.BBox,
			PixelCount: c.PixelCount,
			Pixels:     c.Pixels,
		}
	}

	return &LocateResult{
		GroupID:        groupID,
		BackgroundPath: bgMeta.ImagePath,
		ImageSize:      [2]int{captchaPixels.Width, captchaPixels.Height},
		Components:     fontComponents,
		Stats: map[string]int{
			"diff_pixels":        diff.CountDiffPixels(),
			"component_count":    len(components),
			"min_component_pixels": l.minComponentPixels,
			"diff_threshold":     l.diffThreshold,
		},
	}, nil
}

// LocateFontsDict is an alias for LocateFonts
func (l *CaptchaFontLocator) LocateFontsDict(captchaPath string, includePixels bool) (*LocateResult, error) {
	return l.LocateFonts(captchaPath, includePixels)
}

// RestoreBackground restores the background from captcha
func (l *CaptchaFontLocator) RestoreBackground(
	captchaPath string,
	outputPath *string,
) (*BackgroundRestoreResult, error) {
	groupID, _, bgMeta, err := l.matchBackground(captchaPath)
	if err != nil {
		return nil, err
	}

	var normalizedOutput *string
	if outputPath != nil && *outputPath != "" {
		target := filepath.Clean(*outputPath)
		dir := filepath.Dir(target)
		if err := os.MkdirAll(dir, 0755); err != nil {
			return nil, fmt.Errorf("failed to create directory: %w", err)
		}

		// Copy background to output
		data, err := os.ReadFile(bgMeta.ImagePath)
		if err != nil {
			return nil, fmt.Errorf("failed to read background: %w", err)
		}
		if err := os.WriteFile(target, data, 0644); err != nil {
			return nil, fmt.Errorf("failed to write output: %w", err)
		}
		normalizedOutput = &target
	}

	return &BackgroundRestoreResult{
		GroupID:        groupID,
		BackgroundPath: bgMeta.ImagePath,
		ImageSize:      [2]int{bgMeta.Width, bgMeta.Height},
		OutputPath:     normalizedOutput,
	}, nil
}

// RestoreBackgroundByCaptcha is an alias for RestoreBackground
func (l *CaptchaFontLocator) RestoreBackgroundByCaptcha(
	captchaPath string,
	outputPath *string,
) (*BackgroundRestoreResult, error) {
	return l.RestoreBackground(captchaPath, outputPath)
}

// LocateTextPositions locates text regions in captcha
func (l *CaptchaFontLocator) LocateTextPositions(
	captchaPath string,
	includePixels bool,
) (*TextLocateResult, error) {
	groupID, captchaPixels, bgMeta, err := l.matchBackground(captchaPath)
	if err != nil {
		return nil, err
	}

	// Load background
	bgPixels, err := LoadRgbaPixels(bgMeta.ImagePath)
	if err != nil {
		return nil, err
	}

	// Build diff
	diff := BuildDiff(captchaPixels, bgPixels, l.diffThreshold)

	// Extract components (not color sensitive for text regions)
	components := ExtractComponents(
		diff.Mask,
		diff.Colors,
		captchaPixels.Width,
		captchaPixels.Height,
		l.connectivity,
		l.minComponentPixels,
		includePixels,
		false,
	)

	// Build text regions
	regions := BuildTextRegions(components, includePixels, l.textRegionFilter)

	// Calculate text pixel count
	textPixelCount := 0
	for _, r := range regions {
		textPixelCount += r.PixelCount
	}

	return &TextLocateResult{
		GroupID:        groupID,
		BackgroundPath: bgMeta.ImagePath,
		ImageSize:      [2]int{captchaPixels.Width, captchaPixels.Height},
		Regions:        regions,
		Stats: map[string]int{
			"component_count": len(components),
			"region_count":    len(regions),
			"text_pixel_count": textPixelCount,
			"diff_pixels":     diff.CountDiffPixels(),
			"diff_threshold":  l.diffThreshold,
		},
	}, nil
}
