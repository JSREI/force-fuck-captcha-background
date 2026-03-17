package captcha_background_sdk

import (
	"fmt"
	"image"
	"image/color"
	"image/png"
	"os"
	"path/filepath"
	"strings"
)

// RGBAPixels represents loaded RGBA pixel data from an image.
// Provides convenient access to pixel data with bounds checking.
type RGBAPixels struct {
	Width  int           // Image width in pixels
	Height int           // Image height in pixels
	Pixels []color.RGBA  // Flat array of RGBA pixels (row-major order)
}

// LoadRgbaPixels loads RGBA pixel data from an image file.
// Supported formats include PNG, JPEG, GIF, and BMP based on file extension.
// Returns an error if the file cannot be opened or decoded.
func LoadRgbaPixels(imagePath string) (*RGBAPixels, error) {
	file, err := os.Open(imagePath)
	if err != nil {
		return nil, fmt.Errorf("failed to open image: %w", err)
	}
	defer file.Close()

	img, _, err := image.Decode(file)
	if err != nil {
		return nil, fmt.Errorf("failed to decode image: %w", err)
	}

	bounds := img.Bounds()
	width := bounds.Dx()
	height := bounds.Dy()

	pixels := make([]color.RGBA, width*height)
	for y := 0; y < height; y++ {
		for x := 0; x < width; x++ {
			r, g, b, a := img.At(bounds.Min.X+x, bounds.Min.Y+y).RGBA()
			// Convert from 16-bit to 8-bit
			pixels[y*width+x] = color.RGBA{
				R: uint8(r >> 8),
				G: uint8(g >> 8),
				B: uint8(b >> 8),
				A: uint8(a >> 8),
			}
		}
	}

	return &RGBAPixels{
		Width:  width,
		Height: height,
		Pixels: pixels,
	}, nil
}

// GetPixel retrieves the pixel color at the specified coordinates.
// Returns a zero color.RGBA{} if coordinates are out of bounds.
// Coordinates are zero-indexed: (0, 0) is the top-left pixel.
func (r *RGBAPixels) GetPixel(x, y int) color.RGBA {
	if x < 0 || x >= r.Width || y < 0 || y >= r.Height {
		return color.RGBA{}
	}
	return r.Pixels[y*r.Width+x]
}

// SetPixel sets the pixel color at the specified coordinates.
// Silently ignores out-of-bounds coordinates (no-op).
// Coordinates are zero-indexed: (0, 0) is the top-left pixel.
func (r *RGBAPixels) SetPixel(x, y int, c color.RGBA) {
	if x < 0 || x >= r.Width || y < 0 || y >= r.Height {
		return
	}
	r.Pixels[y*r.Width+x] = c
}

// ToRGBA converts RGBA pixels to our RGBA type
func ToRGBA(c color.RGBA) RGBA {
	return RGBA{int(c.R), int(c.G), int(c.B), int(c.A)}
}

// ToRGB converts RGBA to RGB (dropping alpha)
func ToRGB(c color.RGBA) RGB {
	return RGB{int(c.R), int(c.G), int(c.B)}
}

// ColorDistance calculates Euclidean distance between two RGB colors
func ColorDistance(c1, c2 RGB) int {
	dr := c1[0] - c2[0]
	dg := c1[1] - c2[1]
	db := c1[2] - c2[2]
	return dr*dr + dg*dg + db*db
}

// ColorDistanceRGBA calculates Euclidean distance between two RGBA colors (ignoring alpha)
func ColorDistanceRGBA(c1, c2 color.RGBA) int {
	dr := int(c1.R) - int(c2.R)
	dg := int(c1.G) - int(c2.G)
	db := int(c1.B) - int(c2.B)
	return dr*dr + dg*dg + db*db
}

// SavePng saves RGBA pixels to a PNG file
func SavePng(pixels *RGBAPixels, outputPath string) error {
	img := image.NewRGBA(image.Rect(0, 0, pixels.Width, pixels.Height))
	for y := 0; y < pixels.Height; y++ {
		for x := 0; x < pixels.Width; x++ {
			c := pixels.GetPixel(x, y)
			img.SetRGBA(x, y, c)
		}
	}

	dir := filepath.Dir(outputPath)
	if err := os.MkdirAll(dir, 0755); err != nil {
		return fmt.Errorf("failed to create directory: %w", err)
	}

	file, err := os.Create(outputPath)
	if err != nil {
		return fmt.Errorf("failed to create file: %w", err)
	}
	defer file.Close()

	return png.Encode(file, img)
}

// CreateTransparentImage creates a transparent RGBA image
func CreateTransparentImage(width, height int) *RGBAPixels {
	pixels := make([]color.RGBA, width*height)
	// All pixels are already zero (transparent)
	return &RGBAPixels{
		Width:  width,
		Height: height,
		Pixels: pixels,
	}
}

// CreateWhiteImage creates a white RGB image
func CreateWhiteImage(width, height int) *RGBAPixels {
	pixels := make([]color.RGBA, width*height)
	for i := range pixels {
		pixels[i] = color.RGBA{R: 255, G: 255, B: 255, A: 255}
	}
	return &RGBAPixels{
		Width:  width,
		Height: height,
		Pixels: pixels,
	}
}

// CreateBlackImage creates a black RGB image
func CreateBlackImage(width, height int) *RGBAPixels {
	pixels := make([]color.RGBA, width*height)
	for i := range pixels {
		pixels[i] = color.RGBA{R: 0, G: 0, B: 0, A: 255}
	}
	return &RGBAPixels{
		Width:  width,
		Height: height,
		Pixels: pixels,
	}
}

// CopyPixels copies pixel data from source to destination
func CopyPixels(src *RGBAPixels, dst *RGBAPixels, srcX, srcY, dstX, dstY, width, height int) {
	for y := 0; y < height; y++ {
		for x := 0; x < width; x++ {
			sx, sy := srcX+x, srcY+y
			dx, dy := dstX+x, dstY+y
			if sx >= 0 && sx < src.Width && sy >= 0 && sy < src.Height {
				if dx >= 0 && dx < dst.Width && dy >= 0 && dy < dst.Height {
					dst.SetPixel(dx, dy, src.GetPixel(sx, sy))
				}
			}
		}
	}
}

// GetImageExtension checks if a file has a supported image extension
func GetImageExtension(filename string) string {
	ext := strings.ToLower(filepath.Ext(filename))
	switch ext {
	case ".png", ".jpg", ".jpeg", ".gif", ".bmp", ".webp":
		return ext
	}
	return ""
}

// IsImageFile checks if a file is an image
func IsImageFile(filename string) bool {
	return GetImageExtension(filename) != ""
}
