package captcha_background_sdk

import (
	"fmt"
	"os"
	"path/filepath"
)

// FontGlyphExtractor extracts individual font glyphs (characters) from captcha images.
// It uses a CaptchaFontLocator to identify components and then builds detailed glyph
// representations including bitmaps and optional pixel data.
type FontGlyphExtractor struct {
	locator *CaptchaFontLocator // Reference to the font locator for component detection
}

// NewFontGlyphExtractor creates a new glyph extractor using the provided font locator.
// The locator must have a background index set before extracting glyphs.
func NewFontGlyphExtractor(locator *CaptchaFontLocator) *FontGlyphExtractor {
	return &FontGlyphExtractor{locator: locator}
}

// ExtractGlyphs extracts font glyphs from a captcha image.
// It locates font components and builds detailed glyph representations.
//
// Parameters:
//   - captchaPath: Path to the captcha image file
//   - includePixels: If true, include individual pixel coordinates in the result
//   - includeRGBA2D: If true, include 2D RGBA pixel arrays in the result
//
// Returns a FontGlyphExtractResult containing the extracted glyphs and metadata.
func (e *FontGlyphExtractor) ExtractGlyphs(
	captchaPath string,
	includePixels bool,
	includeRGBA2D bool,
) (*FontGlyphExtractResult, error) {
	// Get components
	locateResult, err := e.locator.LocateFonts(captchaPath, includePixels)
	if err != nil {
		return nil, err
	}

	// Load captcha pixels for bitmap extraction
	captchaPixels, err := LoadRgbaPixels(captchaPath)
	if err != nil {
		return nil, err
	}

	// Build glyphs from components
	var glyphs []FontGlyph
	for i, comp := range locateResult.Components {
		glyph := e.buildGlyphFromComponent(i, comp, captchaPixels, includePixels, includeRGBA2D)
		glyphs = append(glyphs, glyph)
	}

	return &FontGlyphExtractResult{
		GroupID:        locateResult.GroupID,
		BackgroundPath: locateResult.BackgroundPath,
		ImageSize:      locateResult.ImageSize,
		Glyphs:         glyphs,
		Stats: map[string]int{
			"glyph_count": len(glyphs),
			"image_width": captchaPixels.Width,
			"image_height": captchaPixels.Height,
		},
	}, nil
}

// buildGlyphFromComponent builds a FontGlyph from a component
func (e *FontGlyphExtractor) buildGlyphFromComponent(
	index int,
	comp FontComponent,
	captchaPixels *RGBAPixels,
	includePixels bool,
	includeRGBA2D bool,
) FontGlyph {
	width := comp.BBox[2] - comp.BBox[0] + 1
	height := comp.BBox[3] - comp.BBox[1] + 1

	// Build bitmap
	bitmap2D := make([][]int, height)
	for y := 0; y < height; y++ {
		bitmap2D[y] = make([]int, width)
		for x := 0; x < width; x++ {
			bitmap2D[y][x] = 0
		}
	}

	// Mark pixels in bitmap
	for _, p := range comp.Pixels {
		x, y := p[0], p[1]
		if x >= comp.BBox[0] && x <= comp.BBox[2] && y >= comp.BBox[1] && y <= comp.BBox[3] {
			localX := x - comp.BBox[0]
			localY := y - comp.BBox[1]
			bitmap2D[localY][localX] = 1
		}
	}

	var rgba2D [][]RGBA
	if includeRGBA2D {
		rgba2D = make([][]RGBA, height)
		for y := 0; y < height; y++ {
			rgba2D[y] = make([]RGBA, width)
			for x := 0; x < width; x++ {
				srcX := comp.BBox[0] + x
				srcY := comp.BBox[1] + y
				c := captchaPixels.GetPixel(srcX, srcY)
				rgba2D[y][x] = RGBA{int(c.R), int(c.G), int(c.B), int(c.A)}
			}
		}
	}

	var pixels []Pixel
	if includePixels {
		pixels = comp.Pixels
	}

	return FontGlyph{
		RectIndex:  index,
		BBox:       comp.BBox,
		Width:      width,
		Height:     height,
		Color:      comp.Color,
		PixelCount: comp.PixelCount,
		Pixels:     pixels,
		Bitmap2D:   bitmap2D,
		RGBA2D:     rgba2D,
	}
}

// ExtractGlyphsFromTextRegions extracts glyphs from text regions
func (e *FontGlyphExtractor) ExtractGlyphsFromTextRegions(
	captchaPath string,
	includePixels bool,
	includeRGBA2D bool,
) (*FontGlyphExtractResult, error) {
	// Get text regions
	textResult, err := e.locator.LocateTextPositions(captchaPath, includePixels)
	if err != nil {
		return nil, err
	}

	// Load captcha pixels
	captchaPixels, err := LoadRgbaPixels(captchaPath)
	if err != nil {
		return nil, err
	}

	// Build glyphs from regions
	glyphs := make([]FontGlyph, 0)
	for i, region := range textResult.Regions {
		glyph := e.buildGlyphFromRegion(i, region, captchaPixels, includePixels, includeRGBA2D)
		glyphs = append(glyphs, glyph)
	}

	return &FontGlyphExtractResult{
		GroupID:        textResult.GroupID,
		BackgroundPath: textResult.BackgroundPath,
		ImageSize:      textResult.ImageSize,
		Glyphs:         glyphs,
		Stats: map[string]int{
			"glyph_count": len(glyphs),
			"image_width": captchaPixels.Width,
			"image_height": captchaPixels.Height,
		},
	}, nil
}

// buildGlyphFromRegion builds a FontGlyph from a text region
func (e *FontGlyphExtractor) buildGlyphFromRegion(
	index int,
	region TextRegion,
	captchaPixels *RGBAPixels,
	includePixels bool,
	includeRGBA2D bool,
) FontGlyph {
	width := region.BBox[2] - region.BBox[0] + 1
	height := region.BBox[3] - region.BBox[1] + 1

	// Build bitmap
	bitmap2D := make([][]int, height)
	for y := 0; y < height; y++ {
		bitmap2D[y] = make([]int, width)
		for x := 0; x < width; x++ {
			bitmap2D[y][x] = 0
		}
	}

	// Mark pixels
	for _, p := range region.Pixels {
		x, y := p[0], p[1]
		if x >= region.BBox[0] && x <= region.BBox[2] && y >= region.BBox[1] && y <= region.BBox[3] {
			localX := x - region.BBox[0]
			localY := y - region.BBox[1]
			bitmap2D[localY][localX] = 1
		}
	}

	var rgba2D [][]RGBA
	if includeRGBA2D {
		rgba2D = make([][]RGBA, height)
		for y := 0; y < height; y++ {
			rgba2D[y] = make([]RGBA, width)
			for x := 0; x < width; x++ {
				srcX := region.BBox[0] + x
				srcY := region.BBox[1] + y
				c := captchaPixels.GetPixel(srcX, srcY)
				rgba2D[y][x] = RGBA{int(c.R), int(c.G), int(c.B), int(c.A)}
			}
		}
	}

	var pixels []Pixel
	if includePixels {
		pixels = region.Pixels
	}

	// Use first color or default
	color := RGB{0, 0, 0}
	if len(region.Colors) > 0 {
		color = region.Colors[0]
	}

	return FontGlyph{
		RectIndex:  index,
		BBox:       region.BBox,
		Width:      width,
		Height:     height,
		Color:      color,
		PixelCount: region.PixelCount,
		Pixels:     pixels,
		Bitmap2D:   bitmap2D,
		RGBA2D:     rgba2D,
	}
}

// ExportGlyphImages exports glyph images to a directory
func ExportGlyphImages(
	glyphs []FontGlyph,
	captchaPixels *RGBAPixels,
	outputDir string,
	filePrefix string,
	renderMode GlyphRenderMode,
) (*FontGlyphImageExportResult, error) {
	if err := os.MkdirAll(outputDir, 0755); err != nil {
		return nil, fmt.Errorf("failed to create output directory: %w", err)
	}

	prefix := filePrefix
	if prefix == "" {
		prefix = "glyph"
	}

	var glyphImages []FontGlyphImageItem
	exportedCount := 0

	for _, glyph := range glyphs {
		filename := fmt.Sprintf("%s_%04d.png", prefix, glyph.RectIndex)
		outputPath := filepath.Join(outputDir, filename)

		img := RenderGlyphImage(captchaPixels, glyph.BBox, renderMode)
		if err := SaveGlyphImage(img, outputPath); err != nil {
			continue
		}

		glyphImages = append(glyphImages, FontGlyphImageItem{
			RectIndex:  glyph.RectIndex,
			BBox:       glyph.BBox,
			ImagePath:  outputPath,
			Width:      glyph.Width,
			Height:     glyph.Height,
			PixelCount: glyph.PixelCount,
		})
		exportedCount++
	}

	return &FontGlyphImageExportResult{
		OutputDir:   outputDir,
		GlyphImages: glyphImages,
		Stats: map[string]int{
			"exported_count": exportedCount,
			"total_glyphs":   len(glyphs),
		},
	}, nil
}
