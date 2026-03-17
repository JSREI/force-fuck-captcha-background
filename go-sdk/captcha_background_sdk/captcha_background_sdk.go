// Package captcha_background_sdk provides Go SDK for captcha image processing.
//
// This SDK provides functionality for:
//   - Building background indexes from captcha background images
//   - Locating text and slider gaps in captcha images
//   - Extracting font glyphs and features
//   - Local background restoration
//   - Background texture analysis
//
// Quick Start:
//
//	sdk := captcha_background_sdk.NewCaptchaRecognizer(nil)
//	sdk.BuildBackgroundIndex("/path/to/backgrounds", true, nil)
//
//	// Recognize text captcha
//	result, err := sdk.RecognizeText("/path/to/captcha.png", true)
//	// ...
//
//	// Recognize slider captcha
//	sliderResult, err := sdk.RecognizeSlider("/path/to/slider.png")
//	// ...
//
//	// Auto-detect captcha type
//	autoResult, err := sdk.RecognizeAuto("/path/to/captcha.png", nil, true)
//	// ...
//
// The SDK provides two main classes:
//
// 1. CaptchaRecognizer (alias: CaptchaVisionSDK) - Unified facade
//    - BuildBackgroundIndex
//    - RecognizeText / RecognizeFont
//    - RecognizeSlider
//    - RecognizeAuto
//
// 2. Individual locators:
//    - CaptchaFontLocator (alias: CaptchaTextLocator) - Text detection
//    - CaptchaSliderLocator (alias: CaptchaGapLocator) - Slider gap detection
//
package captcha_background_sdk

const (
	// Version is the SDK version
	Version = "0.1.0"
)

// Aliases for neutral naming
var (
	// CaptchaVisionSDK is an alias for CaptchaRecognizer
	CaptchaVisionSDK = NewCaptchaRecognizer

	// CaptchaTextLocator is an alias for CaptchaFontLocator
	CaptchaTextLocator = NewCaptchaFontLocator

	// CaptchaGapLocator is an alias for CaptchaSliderLocator
	CaptchaGapLocator = NewCaptchaSliderLocator
)

// Convenience constructors for aliased types

// NewCaptchaTextLocator creates a new text locator (alias for CaptchaFontLocator)
func NewCaptchaTextLocator(
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
	return NewCaptchaFontLocator(
		diffThreshold,
		minComponentPixels,
		connectivity,
		textMinWidth,
		textMinHeight,
		textMinFillRatio,
		textMaxFillRatio,
		textMergeGap,
		textMinVerticalOverlapRatio,
		textExpectedRegionCount,
		textForceMergeMaxGap,
	)
}

// NewCaptchaGapLocator creates a new gap locator (alias for CaptchaSliderLocator)
func NewCaptchaGapLocator(
	diffThreshold int,
	minGapPixels int,
	connectivity int,
) *CaptchaSliderLocator {
	return NewCaptchaSliderLocator(diffThreshold, minGapPixels, connectivity)
}
