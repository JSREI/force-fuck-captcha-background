package captcha_background_sdk

import (
	"image/color"
)

// DiffResult represents the result of pixel difference calculation between two images.
// It identifies which pixels differ between a captcha image and its background.
type DiffResult struct {
	Mask   []bool       // Mask[i] is true if pixel i differs significantly
	Colors []color.RGBA // Colors[i] is the captcha pixel color at position i (only valid if Mask[i] is true)
}

// BuildDiff calculates the pixel difference between a captcha image and its background.
// It compares each pixel's color distance against a threshold to determine differences.
//
// Parameters:
//   - captchaPixels: The captcha image pixels
//   - backgroundPixels: The background image pixels (must be same size as captcha)
//   - threshold: The color distance threshold (pixels with distance > threshold are considered different)
//
// Returns a DiffResult containing the difference mask and pixel colors.
func BuildDiff(captchaPixels, backgroundPixels *RGBAPixels, threshold int) *DiffResult {
	w, h := captchaPixels.Width, captchaPixels.Height
	size := w * h

	mask := make([]bool, size)
	colors := make([]color.RGBA, size)

	for i := 0; i < size; i++ {
		capPixel := captchaPixels.Pixels[i]
		bgPixel := backgroundPixels.Pixels[i]

		dist := ColorDistanceRGBA(capPixel, bgPixel)
		if dist > threshold*threshold {
			mask[i] = true
			colors[i] = capPixel
		}
	}

	return &DiffResult{
		Mask:   mask,
		Colors: colors,
	}
}

// CountDiffPixels counts the number of different pixels
func (d *DiffResult) CountDiffPixels() int {
	count := 0
	for _, m := range d.Mask {
		if m {
			count++
		}
	}
	return count
}
