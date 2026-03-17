package captcha_background_sdk

import (
	"fmt"
)

// CaptchaSliderLocator provides slider captcha gap detection.
// It identifies the sliding puzzle piece position by analyzing differences
// between the captcha image and its background.
type CaptchaSliderLocator struct {
	diffThreshold int                    // Color distance threshold for pixel difference detection
	minGapPixels  int                    // Minimum pixel count for gap detection
	connectivity  int                    // Pixel connectivity for component extraction (4 or 8)
	backgrounds   map[string]BackgroundMeta // Background index mapping group IDs to metadata
}

// NewCaptchaSliderLocator creates a new slider gap locator with the specified parameters.
//
// Parameters:
//   - diffThreshold: Color distance threshold for detecting pixel differences (default: 18)
//   - minGapPixels: Minimum number of pixels to consider as a valid gap (default: 20)
//   - connectivity: Pixel connectivity for component extraction: 4 or 8 (default: 8)
//
// Returns a configured CaptchaSliderLocator instance.
func NewCaptchaSliderLocator(
	diffThreshold int,
	minGapPixels int,
	connectivity int,
) *CaptchaSliderLocator {
	if connectivity != 4 && connectivity != 8 {
		connectivity = 8
	}
	return &CaptchaSliderLocator{
		diffThreshold: diffThreshold,
		minGapPixels:  minGapPixels,
		connectivity:  connectivity,
		backgrounds:   make(map[string]BackgroundMeta),
	}
}

// SetBackgroundIndex sets the background index
func (l *CaptchaSliderLocator) SetBackgroundIndex(index map[string]BackgroundMeta) {
	l.backgrounds = make(map[string]BackgroundMeta)
	for k, v := range index {
		l.backgrounds[k] = v
	}
}

// GetBackgrounds gets the background index
func (l *CaptchaSliderLocator) GetBackgrounds() map[string]BackgroundMeta {
	return l.backgrounds
}

// BuildBackgroundIndex builds the background index
func (l *CaptchaSliderLocator) BuildBackgroundIndex(
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

// LocateGap locates the slider gap
func (l *CaptchaSliderLocator) LocateGap(captchaPath string) (*SliderLocateResult, error) {
	return l.LocateGapWithPixels(captchaPath, false)
}

// LocateGapWithPixels locates the slider gap with optional pixel data
func (l *CaptchaSliderLocator) LocateGapWithPixels(
	captchaPath string,
	includePixels bool,
) (*SliderLocateResult, error) {
	// Match background
	captchaPixels, err := LoadRgbaPixels(captchaPath)
	if err != nil {
		return nil, err
	}

	groupID := GroupIDFromPixels(captchaPixels)
	bgMeta, ok := l.backgrounds[groupID]
	if !ok {
		return nil, fmt.Errorf("group_id not found in background index: %s", groupID)
	}

	// Load background
	bgPixels, err := LoadRgbaPixels(bgMeta.ImagePath)
	if err != nil {
		return nil, err
	}

	if captchaPixels.Width != bgPixels.Width || captchaPixels.Height != bgPixels.Height {
		return nil, fmt.Errorf("size mismatch: captcha=%dx%d, background=%dx%d",
			captchaPixels.Width, captchaPixels.Height, bgPixels.Width, bgPixels.Height)
	}

	// Build diff
	diff := BuildDiff(captchaPixels, bgPixels, l.diffThreshold)

	// Extract components (not color sensitive for slider)
	components := ExtractComponents(
		diff.Mask,
		diff.Colors,
		captchaPixels.Width,
		captchaPixels.Height,
		l.connectivity,
		l.minGapPixels,
		includePixels,
		false,
	)

	// Find the largest component as the gap
	var gap *SliderGap
	if len(components) > 0 {
		largest := components[0]
		for _, c := range components {
			if c.PixelCount > largest.PixelCount {
				largest = c
			}
		}

		centerX := (largest.BBox[0] + largest.BBox[2]) / 2
		centerY := (largest.BBox[1] + largest.BBox[3]) / 2

		gap = &SliderGap{
			BBox:       largest.BBox,
			Center:     Pixel{centerX, centerY},
			PixelCount: largest.PixelCount,
		}
	}

	// Count regions (components that meet criteria)
	regionCount := 0
	for _, c := range components {
		if c.PixelCount >= l.minGapPixels {
			regionCount++
		}
	}

	return &SliderLocateResult{
		GroupID:        groupID,
		BackgroundPath: bgMeta.ImagePath,
		ImageSize:      [2]int{captchaPixels.Width, captchaPixels.Height},
		Gap:            gap,
		Stats: map[string]int{
			"diff_pixels":        diff.CountDiffPixels(),
			"region_count":       regionCount,
			"component_count":    len(components),
			"min_gap_pixels":     l.minGapPixels,
			"diff_threshold":     l.diffThreshold,
		},
	}, nil
}

// LocateGapDict is an alias for LocateGap (for API consistency)
func (l *CaptchaSliderLocator) LocateGapDict(captchaPath string) (*SliderLocateResult, error) {
	return l.LocateGap(captchaPath)
}
