# Captcha Vision SDK (Go)

Go implementation of the Captcha Vision SDK for text/gap localization, background mapping, and local background restore.

## Installation

```bash
go get github.com/JSREI/force-fuck-captcha-background/go-sdk/captcha_background_sdk
```

## Quick Start

```go
package main

import (
    "fmt"
    "log"

    sdk "github.com/JSREI/force-fuck-captcha-background/go-sdk/captcha_background_sdk"
)

func main() {
    // Create SDK instance
    recognizer := sdk.NewCaptchaRecognizer(nil)

    // Build background index
    _, err := recognizer.BuildBackgroundIndex("/path/to/backgrounds", true, nil)
    if err != nil {
        log.Fatal(err)
    }

    // Recognize text captcha
    textResult, err := recognizer.RecognizeText("/path/to/captcha.png", true)
    if err != nil {
        log.Fatal(err)
    }
    fmt.Printf("Found %d text regions\n", len(textResult.Regions))

    // Recognize slider captcha
    sliderResult, err := recognizer.RecognizeSlider("/path/to/slider.png")
    if err != nil {
        log.Fatal(err)
    }
    if sliderResult.Gap != nil {
        fmt.Printf("Gap center: (%d, %d)\n", sliderResult.Gap.Center[0], sliderResult.Gap.Gap.Center[1])
    }

    // Auto-detect captcha type
    autoResult, err := recognizer.RecognizeAuto("/path/to/captcha.png", nil, true)
    if err != nil {
        log.Fatal(err)
    }
    fmt.Printf("Detected type: %s (confidence: %.2f)\n", autoResult.DetectedType, autoResult.Confidence)
}
```

## API Overview

### CaptchaRecognizer (Unified Facade)

```go
// Create with default options
sdk := sdk.NewCaptchaRecognizer(nil)

// Or with custom options
sdk := sdk.NewCaptchaRecognizer(&sdk.CaptchaVisionSDKOptions{
    DiffThreshold:          18,
    FontMinComponentPixels: 8,
    SliderMinGapPixels:     20,
    Connectivity:           8,
})

// Build background index
sdk.BuildBackgroundIndex("/path/to/backgrounds", true, nil)

// Recognize text
result, err := sdk.RecognizeText("/path/to/captcha.png", true)

// Recognize slider
sliderResult, err := sdk.RecognizeSlider("/path/to/slider.png")

// Auto-detect
autoResult, err := sdk.RecognizeAuto("/path/to/captcha.png", nil, true)

// Restore background
restored, err := sdk.RestoreBackgroundByCaptcha("/path/to/captcha.png", &outputPath)
```

### Individual Locators

```go
// Text locator
fontLocator := sdk.NewCaptchaFontLocator(
    18,  // diff_threshold
    8,   // min_component_pixels
    8,   // connectivity
    3,   // text_min_width
    3,   // text_min_height
    0.06, // text_min_fill_ratio
    0.95, // text_max_fill_ratio
    2,   // text_merge_gap
    0.4, // text_min_vertical_overlap_ratio
    sdk.IntPtr(4), // text_expected_region_count
    28,  // text_force_merge_max_gap
)
fontLocator.BuildBackgroundIndex("/path/to/backgrounds", true, nil)
result, err := fontLocator.LocateTextPositions("/path/to/captcha.png", true)

// Slider locator
sliderLocator := sdk.NewCaptchaSliderLocator(18, 20, 8)
sliderLocator.BuildBackgroundIndex("/path/to/backgrounds", true, nil)
sliderResult, err := sliderLocator.LocateGap("/path/to/slider.png")
```

### Glyph Extraction

```go
// Extract glyphs
glyphExtractor := sdk.NewFontGlyphExtractor(fontLocator)
glyphResult, err := glyphExtractor.ExtractGlyphs("/path/to/captcha.png", true, false)

// Extract features
featureExtractor := sdk.NewGlyphFeatureExtractor()
features := featureExtractor.ExtractFeaturesFromGlyphs(
    glyphResult.Glyphs,
    32,  // target_width
    32,  // target_height
    true, // keep_aspect_ratio
)
```

### Local Restore

```go
config := sdk.LocalRestoreConfig{
    InputDir:             "/path/to/captcha_images",
    OutputDir:            "/path/to/output_backgrounds",
    ClearOutputBeforeRun: true,
    Recursive:            true,
    MaxErrorItems:        200,
}

summary, err := sdk.RunLocalRestore(config)
if err != nil {
    log.Fatal(err)
}

fmt.Printf("Restored %d backgrounds from %d buckets\n", summary.OutputFiles, summary.BucketCount)
```

### Background Analysis

```go
// Load image
pixels, err := sdk.LoadRgbaPixels("/path/to/background.png")
if err != nil {
    log.Fatal(err)
}

// Texture analysis
engine := sdk.NewBackgroundFeatureEngine()
textureResult := engine.ExtractTextureMetrics(pixels, 4, 4, 16, 18.0)
fmt.Printf("Entropy: %.4f, Edge Density: %.4f\n", textureResult.Entropy, textureResult.EdgeDensity)

// Deep features
deepResult := engine.ExtractDeepVector(pixels, []int{1, 2, 4}, 18.0)
fmt.Printf("Feature vector length: %d\n", len(deepResult.Vector1D))
```

## Types

### CaptchaType

```go
const (
    CaptchaTypeTEXT   = "text"
    CaptchaTypeFONT   = "font"   // backward compatible
    CaptchaTypeSLIDER = "slider"
)
```

### GlyphRenderMode

```go
const (
    GlyphRenderModeORIGINAL             = "original"
    GlyphRenderModeBLACK_ON_TRANSPARENT = "black_on_transparent"
    GlyphRenderModeBLACK_ON_WHITE       = "black_on_white"
    GlyphRenderModeWHITE_ON_BLACK       = "white_on_black"
)
```

## Data Structures

### TextLocateResult

```go
type TextLocateResult struct {
    GroupID        string
    BackgroundPath string
    ImageSize      [2]int
    Regions        []TextRegion
    Stats          map[string]int
}
```

### SliderLocateResult

```go
type SliderLocateResult struct {
    GroupID        string
    BackgroundPath string
    ImageSize      [2]int
    Gap            *SliderGap
    Stats          map[string]int
}
```

### CaptchaAutoResult

```go
type CaptchaAutoResult struct {
    DetectedType   string
    Confidence     float64
    Reason         string
    GroupID        string
    BackgroundPath string
    ImageSize      [2]int
    TextPayload    map[string]interface{}
    SliderPayload  map[string]interface{}
}
```

## Error Handling

The SDK returns descriptive errors for common issues:

- Background index not built
- Group ID not found in index
- Image size mismatch between captcha and background
- Invalid file paths

Always check errors returned by functions:

```go
result, err := sdk.RecognizeText("/path/to/captcha.png", true)
if err != nil {
    // Handle error
    log.Printf("Recognition failed: %v", err)
    return
}
// Process result
```

## Performance Considerations

1. **Background Index**: Build once and reuse for multiple recognitions
2. **Pixel Data**: Use `includePixels=false` when pixel coordinates are not needed
3. **Connectivity**: 4-connectivity is faster but may miss diagonal connections
4. **Batch Processing**: Use `BatchProcessor` for processing multiple images

## License

MIT
