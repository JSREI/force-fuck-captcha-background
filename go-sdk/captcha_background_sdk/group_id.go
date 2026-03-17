package captcha_background_sdk

import (
	"fmt"
)

// GroupIDFromPixels computes a unique group identifier from an image's dimensions and corner pixel colors.
// The group ID is used to match captcha images with their corresponding background images.
//
// Format: "{width}x{height}|lt_r,lt_g,lt_b|rt_r,rt_g,rt_b|lb_r,lb_g,lb_b|rb_r,rb_g,rb_b"
// Where:
//   - width, height: Image dimensions in pixels
//   - lt: Left-top corner pixel RGB values
//   - rt: Right-top corner pixel RGB values
//   - lb: Left-bottom corner pixel RGB values
//   - rb: Right-bottom corner pixel RGB values
//
// This format ensures that images with the same dimensions and corner colors are grouped together,
// which is useful for matching captchas to their backgrounds.
func GroupIDFromPixels(pixels *RGBAPixels) string {
	w, h := pixels.Width, pixels.Height

	// Get 4 corners: left-top, right-top, left-bottom, right-bottom
	lt := pixels.GetPixel(0, 0)
	rt := pixels.GetPixel(w-1, 0)
	lb := pixels.GetPixel(0, h-1)
	rb := pixels.GetPixel(w-1, h-1)

	return fmt.Sprintf("%dx%d|%d,%d,%d|%d,%d,%d|%d,%d,%d|%d,%d,%d",
		w, h,
		lt.R, lt.G, lt.B,
		rt.R, rt.G, rt.B,
		lb.R, lb.G, lb.B,
		rb.R, rb.G, rb.B,
	)
}

// ComputeGroupID computes the group identifier from an image file path.
// This is a convenience function that loads the image and calls GroupIDFromPixels.
// Returns an error if the image cannot be loaded.
func ComputeGroupID(imagePath string) (string, error) {
	pixels, err := LoadRgbaPixels(imagePath)
	if err != nil {
		return "", err
	}
	return GroupIDFromPixels(pixels), nil
}
