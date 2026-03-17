// Package captcha_background_sdk provides tools for analyzing and restoring captcha backgrounds.
// It supports various captcha types including text-based and slider-based captchas.
//
// The SDK works by comparing captcha images against a database of known backgrounds
// to identify and extract foreground elements (text characters, slider gaps).
//
// Basic usage:
//
//	// Create recognizer with default options
//	recognizer := captcha_background_sdk.NewCaptchaRecognizer(nil)
//
//	// Build background index
//	backgrounds, err := recognizer.BuildBackgroundIndex("/path/to/backgrounds", false, nil)
//
//	// Recognize captcha type and extract features
//	result, err := recognizer.RecognizeFont("captcha.png", false)
//
// For more control, use specific locators directly:
//
//	locator := captcha_background_sdk.NewCaptchaFontLocator(18, 8, 8, 3, 3, 0.06, 0.95, 2, 0.4, intPtr(4), 28)
//	locator.SetBackgroundIndex(backgrounds)
//	result, err := locator.LocateFontsDict("captcha.png")
package captcha_background_sdk

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
)

// CaptchaRecognizer is the unified facade for captcha recognition.
// It provides a high-level interface for building background indexes,
// recognizing captcha types, and extracting foreground elements.
type CaptchaRecognizer struct {
	Font   *CaptchaFontLocator
	Slider *CaptchaSliderLocator

	diffThreshold          int
	fontMinComponentPixels int
	sliderMinGapPixels     int
	connectivity           int
}

// CaptchaVisionSDKOptions represents configuration options for creating the SDK.
// All fields are optional; zero values will be replaced with sensible defaults.
type CaptchaVisionSDKOptions struct {
	// DiffThreshold is the color distance threshold for pixel difference detection (default: 18)
	DiffThreshold int

	// FontMinComponentPixels is the minimum pixel count for font component detection (default: 8)
	FontMinComponentPixels int

	// SliderMinGapPixels is the minimum pixel count for slider gap detection (default: 20)
	SliderMinGapPixels int

	// Connectivity defines pixel connectivity for component extraction: 4 or 8 (default: 8)
	Connectivity int

	// TextMinWidth is the minimum width for text region detection (default: 3)
	TextMinWidth int

	// TextMinHeight is the minimum height for text region detection (default: 3)
	TextMinHeight int

	// TextMinFillRatio is the minimum fill ratio for text region validation (default: 0.06)
	TextMinFillRatio float64

	// TextMaxFillRatio is the maximum fill ratio for text region validation (default: 0.95)
	TextMaxFillRatio float64

	// TextMergeGap is the maximum gap for merging adjacent text regions (default: 2)
	TextMergeGap int

	// TextMinVerticalOverlapRatio is the minimum vertical overlap for region merging (default: 0.4)
	TextMinVerticalOverlapRatio float64

	// TextExpectedRegionCount is the expected number of text regions (default: 4)
	TextExpectedRegionCount *int

	// TextForceMergeMaxGap is the maximum gap for forced region merging (default: 28)
	TextForceMergeMaxGap int
}

// DefaultCaptchaVisionSDKOptions returns default options
func DefaultCaptchaVisionSDKOptions() CaptchaVisionSDKOptions {
	return CaptchaVisionSDKOptions{
		DiffThreshold:               18,
		FontMinComponentPixels:      8,
		SliderMinGapPixels:          20,
		Connectivity:                8,
		TextMinWidth:                3,
		TextMinHeight:               3,
		TextMinFillRatio:            0.06,
		TextMaxFillRatio:            0.95,
		TextMergeGap:                2,
		TextMinVerticalOverlapRatio: 0.4,
		TextExpectedRegionCount:     intPtr(4),
		TextForceMergeMaxGap:        28,
	}
}

// NewCaptchaRecognizer creates a new captcha recognizer
func NewCaptchaRecognizer(options *CaptchaVisionSDKOptions) *CaptchaRecognizer {
	if options == nil {
		options = &CaptchaVisionSDKOptions{}
	}

	// Apply defaults for zero values
	if options.DiffThreshold == 0 {
		options.DiffThreshold = 18
	}
	if options.FontMinComponentPixels == 0 {
		options.FontMinComponentPixels = 8
	}
	if options.SliderMinGapPixels == 0 {
		options.SliderMinGapPixels = 20
	}
	if options.Connectivity == 0 {
		options.Connectivity = 8
	}
	if options.TextMinWidth == 0 {
		options.TextMinWidth = 3
	}
	if options.TextMinHeight == 0 {
		options.TextMinHeight = 3
	}
	if options.TextMinFillRatio == 0 {
		options.TextMinFillRatio = 0.06
	}
	if options.TextMaxFillRatio == 0 {
		options.TextMaxFillRatio = 0.95
	}
	if options.TextMergeGap == 0 {
		options.TextMergeGap = 2
	}
	if options.TextMinVerticalOverlapRatio == 0 {
		options.TextMinVerticalOverlapRatio = 0.4
	}
	if options.TextForceMergeMaxGap == 0 {
		options.TextForceMergeMaxGap = 28
	}
	if options.TextExpectedRegionCount == nil {
		options.TextExpectedRegionCount = intPtr(4)
	}

	font := NewCaptchaFontLocator(
		options.DiffThreshold,
		options.FontMinComponentPixels,
		options.Connectivity,
		options.TextMinWidth,
		options.TextMinHeight,
		options.TextMinFillRatio,
		options.TextMaxFillRatio,
		options.TextMergeGap,
		options.TextMinVerticalOverlapRatio,
		options.TextExpectedRegionCount,
		options.TextForceMergeMaxGap,
	)

	slider := NewCaptchaSliderLocator(
		options.DiffThreshold,
		options.SliderMinGapPixels,
		options.Connectivity,
	)

	return &CaptchaRecognizer{
		Font:                   font,
		Slider:                 slider,
		diffThreshold:          options.DiffThreshold,
		fontMinComponentPixels: options.FontMinComponentPixels,
		sliderMinGapPixels:     options.SliderMinGapPixels,
		connectivity:           options.Connectivity,
	}
}

// GetBackgrounds gets the background index
func (r *CaptchaRecognizer) GetBackgrounds() map[string]BackgroundMeta {
	return r.Font.GetBackgrounds()
}

// BuildBackgroundIndex builds the background index
func (r *CaptchaRecognizer) BuildBackgroundIndex(
	backgroundDir string,
	recursive bool,
	exts []string,
) (map[string]BackgroundMeta, error) {
	index, err := r.Font.BuildBackgroundIndex(backgroundDir, recursive, exts)
	if err != nil {
		return nil, err
	}
	r.Slider.SetBackgroundIndex(index)
	return index, nil
}

// RecognizeFont recognizes font in captcha
func (r *CaptchaRecognizer) RecognizeFont(captchaPath string, includePixels bool) (*LocateResult, error) {
	return r.Font.LocateFonts(captchaPath, includePixels)
}

// RecognizeText recognizes text positions in captcha
func (r *CaptchaRecognizer) RecognizeText(captchaPath string, includePixels bool) (*TextLocateResult, error) {
	return r.Font.LocateTextPositions(captchaPath, includePixels)
}

// RecognizeSlider recognizes slider in captcha
func (r *CaptchaRecognizer) RecognizeSlider(captchaPath string) (*SliderLocateResult, error) {
	return r.Slider.LocateGap(captchaPath)
}

// RestoreBackgroundByCaptcha restores background
func (r *CaptchaRecognizer) RestoreBackgroundByCaptcha(
	captchaPath string,
	outputPath *string,
) (*BackgroundRestoreResult, error) {
	return r.Font.RestoreBackground(captchaPath, outputPath)
}

// DecideCaptchaType decides the captcha type based on analysis
func (r *CaptchaRecognizer) DecideCaptchaType(
	textRegionCount int,
	textPixelCount int,
	fontComponentCount int,
	fontComponentPixels int,
	sliderRegionCount int,
	sliderGapPixels int,
	sliderGapWidth int,
	sliderGapHeight int,
) (detectedType string, confidence float64, reason string) {
	textScore := 0.0
	sliderScore := 0.0

	// Text scoring
	if fontComponentCount > 0 {
		textScore += float64(min(fontComponentCount, 10)) * 0.9
	}
	if fontComponentCount >= 3 {
		textScore += 2.0
	}
	textScore += float64(min(fontComponentPixels/120, 6))

	if textRegionCount > 0 {
		textScore += float64(min(textRegionCount, 8)) * 1.2
	}
	if textRegionCount >= 2 && textRegionCount <= 8 {
		textScore += 2.0
	}
	textScore += float64(min(textPixelCount/70, 8))

	// Slider scoring
	if sliderGapPixels > 0 {
		if sliderGapPixels >= 180 {
			sliderScore += 3.0 + float64(min(sliderGapPixels/80, 10))
		} else {
			sliderScore += float64(min(sliderGapPixels/120, 1)) * 1.5
		}
	}
	sliderScore += float64(min(sliderRegionCount, 6)) * 0.6

	if sliderGapWidth > 0 && sliderGapHeight > 0 {
		ratio := float64(min(sliderGapWidth, sliderGapHeight)) / float64(max(sliderGapWidth, sliderGapHeight))
		sliderScore += ratio * 2.0
		if ratio < 0.6 {
			sliderScore -= 0.8
		}
	}

	// Adjust scores
	if sliderGapPixels > 0 && textRegionCount <= 1 && fontComponentCount <= 1 {
		textScore -= 1.5
	}
	if (textRegionCount >= 3 || fontComponentCount >= 3) && sliderGapPixels > 0 {
		sliderScore -= 1.0
	}
	if sliderGapPixels > 0 && sliderGapPixels < 180 {
		sliderScore -= 1.0
		if textRegionCount >= 1 {
			textScore += 1.2
		}
	}

	// Decide type
	detectedType = "unknown"
	reason = "insufficient foreground evidence for text or slider"

	if textScore > sliderScore && textScore > 1.0 {
		detectedType = "text"
		reason = fmt.Sprintf("text_score=%.2f > slider_score=%.2f; font_components=%d, region_count=%d, text_pixels=%d",
			textScore, sliderScore, fontComponentCount, textRegionCount, textPixelCount)
	} else if sliderScore > textScore && sliderScore > 1.0 {
		detectedType = "slider"
		reason = fmt.Sprintf("slider_score=%.2f > text_score=%.2f; gap_pixels=%d, slider_regions=%d, gap_size=%dx%d, font_components=%d",
			sliderScore, textScore, sliderGapPixels, sliderRegionCount, sliderGapWidth, sliderGapHeight, fontComponentCount)
	}

	// Calculate confidence
	denom := float64(max(1, int(abs(textScore)+abs(sliderScore))))
	confidence = clamp01(abs(textScore-sliderScore) / denom)

	return detectedType, confidence, reason
}

// RecognizeAuto automatically detects and recognizes captcha type
func (r *CaptchaRecognizer) RecognizeAuto(
	captchaPath string,
	backgroundDir *string,
	includePixels bool,
) (*CaptchaAutoResult, error) {
	// Build background index if provided
	if backgroundDir != nil && *backgroundDir != "" {
		_, err := r.BuildBackgroundIndex(*backgroundDir, true, nil)
		if err != nil {
			return nil, fmt.Errorf("failed to build background index: %w", err)
		}
	}

	// Run all recognitions
	textResult, err := r.RecognizeText(captchaPath, includePixels)
	if err != nil {
		return nil, fmt.Errorf("failed to recognize text: %w", err)
	}

	fontResult, err := r.RecognizeFont(captchaPath, includePixels)
	if err != nil {
		return nil, fmt.Errorf("failed to recognize font: %w", err)
	}

	sliderResult, err := r.RecognizeSlider(captchaPath)
	if err != nil {
		return nil, fmt.Errorf("failed to recognize slider: %w", err)
	}

	// Extract metrics
	textRegionCount := len(textResult.Regions)
	textPixelCount := textResult.Stats["text_pixel_count"]
	fontComponentCount := len(fontResult.Components)
	fontComponentPixels := 0
	for _, c := range fontResult.Components {
		fontComponentPixels += c.PixelCount
	}
	sliderRegionCount := sliderResult.Stats["region_count"]
	sliderGapPixels := 0
	sliderGapWidth := 0
	sliderGapHeight := 0
	if sliderResult.Gap != nil {
		sliderGapPixels = sliderResult.Gap.PixelCount
		sliderGapWidth = sliderResult.Gap.BBox[2] - sliderResult.Gap.BBox[0] + 1
		sliderGapHeight = sliderResult.Gap.BBox[3] - sliderResult.Gap.BBox[1] + 1
	}

	// Decide type
	detectedType, confidence, reason := r.DecideCaptchaType(
		textRegionCount,
		textPixelCount,
		fontComponentCount,
		fontComponentPixels,
		sliderRegionCount,
		sliderGapPixels,
		sliderGapWidth,
		sliderGapHeight,
	)

	// Build payload
	textPayload := map[string]interface{}{}
	sliderPayload := map[string]interface{}{}

	if detectedType == "text" {
		textPayload["locate"] = textResult
		textPayload["components"] = fontResult
	} else if detectedType == "slider" {
		sliderPayload["locate"] = sliderResult
	}

	return &CaptchaAutoResult{
		DetectedType:   detectedType,
		Confidence:     confidence,
		Reason:         reason,
		GroupID:        textResult.GroupID,
		BackgroundPath: textResult.BackgroundPath,
		ImageSize:      textResult.ImageSize,
		TextScore:      0, // Will be set if needed
		SliderScore:    0, // Will be set if needed
		TextPayload:    textPayload,
		SliderPayload:  sliderPayload,
		Stats: map[string]float64{
			"text_region_count":   float64(textRegionCount),
			"text_pixel_count":    float64(textPixelCount),
			"font_component_count": float64(fontComponentCount),
			"slider_region_count":  float64(sliderRegionCount),
			"slider_gap_pixels":    float64(sliderGapPixels),
		},
	}, nil
}

// Helper functions
func clamp01(v float64) float64 {
	if v < 0 {
		return 0
	}
	if v > 1 {
		return 1
	}
	return v
}

func abs(v float64) float64 {
	if v < 0 {
		return -v
	}
	return v
}

// SaveJSON saves a result to JSON file
func SaveJSON(data interface{}, outputPath string) error {
	dir := filepath.Dir(outputPath)
	if err := os.MkdirAll(dir, 0755); err != nil {
		return fmt.Errorf("failed to create directory: %w", err)
	}

	jsonData, err := json.MarshalIndent(data, "", "  ")
	if err != nil {
		return fmt.Errorf("failed to marshal JSON: %w", err)
	}

	if err := os.WriteFile(outputPath, jsonData, 0644); err != nil {
		return fmt.Errorf("failed to write file: %w", err)
	}

	return nil
}
