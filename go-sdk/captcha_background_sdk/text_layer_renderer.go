package captcha_background_sdk

import (
	"image"
	"image/color"
	"image/draw"
	"image/png"
	"os"
	"path/filepath"
)

// RenderTextLayer renders text layer to a transparent PNG
func RenderTextLayer(
	captchaPixels, backgroundPixels *RGBAPixels,
	diffMask []bool,
	outputPath string,
	cropToContent bool,
) (*TextLayerResult, error) {
	w, h := captchaPixels.Width, captchaPixels.Height

	// Find text bounding box
	minX, minY := w, h
	maxX, maxY := -1, -1
	textPixelCount := 0

	for y := 0; y < h; y++ {
		for x := 0; x < w; x++ {
			idx := y*w + x
			if diffMask[idx] {
				textPixelCount++
				if x < minX {
					minX = x
				}
				if x > maxX {
					maxX = x
				}
				if y < minY {
					minY = y
				}
				if y > maxY {
					maxY = y
				}
			}
		}
	}

	if textPixelCount == 0 {
		minX, minY, maxX, maxY = 0, 0, w-1, h-1
	}

	// Create output image
	var outW, outH int
	var offsetX, offsetY int

	if cropToContent {
		outW = maxX - minX + 1
		outH = maxY - minY + 1
		offsetX = minX
		offsetY = minY
	} else {
		outW = w
		outH = h
		offsetX = 0
		offsetY = 0
	}

	// Create transparent image
	outImg := image.NewRGBA(image.Rect(0, 0, outW, outH))

	// Copy text pixels
	for y := 0; y < outH; y++ {
		for x := 0; x < outW; x++ {
			srcX := x + offsetX
			srcY := y + offsetY
			srcIdx := srcY*w + srcX

			if srcX >= 0 && srcX < w && srcY >= 0 && srcY < h {
				if diffMask[srcIdx] {
					c := captchaPixels.GetPixel(srcX, srcY)
					outImg.SetRGBA(x, y, c)
				}
			}
		}
	}

	// Save image
	if err := os.MkdirAll(filepath.Dir(outputPath), 0755); err != nil {
		return nil, err
	}

	file, err := os.Create(outputPath)
	if err != nil {
		return nil, err
	}
	defer file.Close()

	if err := png.Encode(file, outImg); err != nil {
		return nil, err
	}

	var textBBox *BBox
	if textPixelCount > 0 {
		textBBox = &BBox{minX, minY, maxX, maxY}
	}

	return &TextLayerResult{
		TextBBox:       textBBox,
		TextPixelCount: textPixelCount,
		OutputPath:     &outputPath,
		Stats: map[string]int{
			"width":  outW,
			"height": outH,
		},
	}, nil
}

// RenderGlyphImage renders a single glyph to an image
func RenderGlyphImage(
	captchaPixels *RGBAPixels,
	bbox BBox,
	renderMode GlyphRenderMode,
) image.Image {
	w := bbox[2] - bbox[0] + 1
	h := bbox[3] - bbox[1] + 1

	var img *image.RGBA
	switch renderMode {
	case GlyphRenderModeBLACK_ON_TRANSPARENT:
		img = image.NewRGBA(image.Rect(0, 0, w, h))
		// Background is already transparent
		for y := 0; y < h; y++ {
			for x := 0; x < w; x++ {
				srcX := bbox[0] + x
				srcY := bbox[1] + y
				c := captchaPixels.GetPixel(srcX, srcY)
				if c.A > 0 {
					img.SetRGBA(x, y, color.RGBA{R: 0, G: 0, B: 0, A: 255})
				}
			}
		}
	case GlyphRenderModeBLACK_ON_WHITE:
		img = image.NewRGBA(image.Rect(0, 0, w, h))
		draw.Draw(img, img.Bounds(), &image.Uniform{color.RGBA{R: 255, G: 255, B: 255, A: 255}}, image.Point{}, draw.Src)
		for y := 0; y < h; y++ {
			for x := 0; x < w; x++ {
				srcX := bbox[0] + x
				srcY := bbox[1] + y
				c := captchaPixels.GetPixel(srcX, srcY)
				if c.A > 0 {
					img.SetRGBA(x, y, color.RGBA{R: 0, G: 0, B: 0, A: 255})
				}
			}
		}
	case GlyphRenderModeWHITE_ON_BLACK:
		img = image.NewRGBA(image.Rect(0, 0, w, h))
		draw.Draw(img, img.Bounds(), &image.Uniform{color.RGBA{R: 0, G: 0, B: 0, A: 255}}, image.Point{}, draw.Src)
		for y := 0; y < h; y++ {
			for x := 0; x < w; x++ {
				srcX := bbox[0] + x
				srcY := bbox[1] + y
				c := captchaPixels.GetPixel(srcX, srcY)
				if c.A > 0 {
					img.SetRGBA(x, y, color.RGBA{R: 255, G: 255, B: 255, A: 255})
				}
			}
		}
	default: // ORIGINAL
		img = image.NewRGBA(image.Rect(0, 0, w, h))
		for y := 0; y < h; y++ {
			for x := 0; x < w; x++ {
				srcX := bbox[0] + x
				srcY := bbox[1] + y
				c := captchaPixels.GetPixel(srcX, srcY)
				img.SetRGBA(x, y, c)
			}
		}
	}

	return img
}

// SaveGlyphImage saves a glyph image to file
func SaveGlyphImage(img image.Image, outputPath string) error {
	if err := os.MkdirAll(filepath.Dir(outputPath), 0755); err != nil {
		return err
	}

	file, err := os.Create(outputPath)
	if err != nil {
		return err
	}
	defer file.Close()

	return png.Encode(file, img)
}
