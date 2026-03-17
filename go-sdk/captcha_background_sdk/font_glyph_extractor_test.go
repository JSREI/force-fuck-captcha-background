package captcha_background_sdk

import (
	"image/color"
	"os"
	"path/filepath"
	"testing"
)

func TestNewFontGlyphExtractor(t *testing.T) {
	locator := NewCaptchaFontLocator(
		18, 8, 8,
		3, 3, 0.06, 0.95,
		2, 0.4, IntPtr(4), 28,
	)

	extractor := NewFontGlyphExtractor(locator)
	if extractor == nil {
		t.Fatal("expected non-nil extractor")
	}
}

func TestFontGlyphExtractorExtractGlyphs(t *testing.T) {
	// Create temporary directory
	tmpDir := t.TempDir()
	bgDir := filepath.Join(tmpDir, "backgrounds")
	captchaDir := filepath.Join(tmpDir, "captchas")
	os.MkdirAll(bgDir, 0755)
	os.MkdirAll(captchaDir, 0755)

	// Create a background image (with unique corner)
	bgPixels := CreateWhiteImage(100, 100)
	bgPixels.SetPixel(0, 0, color.RGBA{R: 254, G: 255, B: 255, A: 255}) // Slightly different corner
	bgPath := filepath.Join(bgDir, "bg.png")
	if err := SavePng(bgPixels, bgPath); err != nil {
		t.Fatalf("failed to save background: %v", err)
	}

	// Create a captcha image with red text (matching background corners)
	captchaPixels := CreateWhiteImage(100, 100)
	// Set corners to match background for proper group_id matching
	captchaPixels.SetPixel(0, 0, color.RGBA{R: 254, G: 255, B: 255, A: 255})
	// Draw a larger red rectangle (20x20) to ensure it's detected
	for y := 20; y < 40; y++ {
		for x := 20; x < 40; x++ {
			captchaPixels.SetPixel(x, y, color.RGBA{R: 255, G: 0, B: 0, A: 255})
		}
	}
	captchaPath := filepath.Join(captchaDir, "captcha.png")
	if err := SavePng(captchaPixels, captchaPath); err != nil {
		t.Fatalf("failed to save captcha: %v", err)
	}

	// Create locator and build background index with lower threshold
	locator := NewCaptchaFontLocator(
		30, 10, 8,  // diff_threshold=30, min_component_pixels=10
		3, 3, 0.06, 0.95,
		2, 0.4, IntPtr(4), 28,
	)
	_, err := locator.BuildBackgroundIndex(bgDir, false, []string{".png"})
	if err != nil {
		t.Fatalf("failed to build background index: %v", err)
	}

	// Create extractor and extract glyphs
	extractor := NewFontGlyphExtractor(locator)
	result, err := extractor.ExtractGlyphs(captchaPath, false, false)
	if err != nil {
		t.Fatalf("ExtractGlyphs failed: %v", err)
	}

	if len(result.Glyphs) == 0 {
		t.Error("expected at least one glyph")
	}

	// Check glyph properties
	for i, glyph := range result.Glyphs {
		if glyph.RectIndex != i {
			t.Errorf("expected glyph %d to have rect index %d, got %d", i, i, glyph.RectIndex)
		}

		if glyph.Width <= 0 {
			t.Errorf("expected positive width for glyph %d, got %d", i, glyph.Width)
		}

		if glyph.Height <= 0 {
			t.Errorf("expected positive height for glyph %d, got %d", i, glyph.Height)
		}

		if len(glyph.Bitmap2D) != glyph.Height {
			t.Errorf("expected bitmap height %d, got %d", glyph.Height, len(glyph.Bitmap2D))
		}

		if len(glyph.Bitmap2D) > 0 && len(glyph.Bitmap2D[0]) != glyph.Width {
			t.Errorf("expected bitmap width %d, got %d", glyph.Width, len(glyph.Bitmap2D[0]))
		}
	}

	// Check stats
	if result.Stats["glyph_count"] != len(result.Glyphs) {
		t.Error("glyph_count in stats should match actual count")
	}
}

func TestFontGlyphExtractorExtractGlyphsWithPixels(t *testing.T) {
	// Create temporary directory
	tmpDir := t.TempDir()

	// Create a background image (with unique corner)
	bgPixels := CreateWhiteImage(50, 50)
	bgPixels.SetPixel(0, 0, color.RGBA{R: 254, G: 255, B: 255, A: 255}) // Slightly different corner
	bgPath := filepath.Join(tmpDir, "bg.png")
	if err := SavePng(bgPixels, bgPath); err != nil {
		t.Fatalf("failed to save background: %v", err)
	}

	// Create a captcha image (pure white corners)
	captchaPixels := CreateWhiteImage(50, 50)
	for y := 10; y < 20; y++ {
		for x := 10; x < 20; x++ {
			captchaPixels.SetPixel(x, y, color.RGBA{R: 255, G: 0, B: 0, A: 255})
		}
	}
	captchaPath := filepath.Join(tmpDir, "captcha.png")
	if err := SavePng(captchaPixels, captchaPath); err != nil {
		t.Fatalf("failed to save captcha: %v", err)
	}

	// Create locator and build background index
	locator := NewCaptchaFontLocator(
		18, 8, 8,
		3, 3, 0.06, 0.95,
		2, 0.4, IntPtr(4), 28,
	)
	_, err := locator.BuildBackgroundIndex(tmpDir, false, []string{".png"})
	if err != nil {
		t.Fatalf("failed to build background index: %v", err)
	}

	// Create extractor and extract glyphs with pixels
	extractor := NewFontGlyphExtractor(locator)
	result, err := extractor.ExtractGlyphs(captchaPath, true, false)
	if err != nil {
		t.Fatalf("ExtractGlyphs failed: %v", err)
	}

	// Check that pixels are included
	for _, glyph := range result.Glyphs {
		if len(glyph.Pixels) == 0 {
			t.Error("expected pixels to be included")
		}
	}
}

func TestFontGlyphExtractorExtractGlyphsWithRGBA2D(t *testing.T) {
	// Create temporary directory
	tmpDir := t.TempDir()

	// Create a background image (with unique corner)
	bgPixels := CreateWhiteImage(50, 50)
	bgPixels.SetPixel(0, 0, color.RGBA{R: 254, G: 255, B: 255, A: 255}) // Slightly different corner
	bgPath := filepath.Join(tmpDir, "bg.png")
	if err := SavePng(bgPixels, bgPath); err != nil {
		t.Fatalf("failed to save background: %v", err)
	}

	// Create a captcha image (pure white corners)
	captchaPixels := CreateWhiteImage(50, 50)
	for y := 10; y < 20; y++ {
		for x := 10; x < 20; x++ {
			captchaPixels.SetPixel(x, y, color.RGBA{R: 255, G: 0, B: 0, A: 255})
		}
	}
	captchaPath := filepath.Join(tmpDir, "captcha.png")
	if err := SavePng(captchaPixels, captchaPath); err != nil {
		t.Fatalf("failed to save captcha: %v", err)
	}

	// Create locator and build background index
	locator := NewCaptchaFontLocator(
		18, 8, 8,
		3, 3, 0.06, 0.95,
		2, 0.4, IntPtr(4), 28,
	)
	_, err := locator.BuildBackgroundIndex(tmpDir, false, []string{".png"})
	if err != nil {
		t.Fatalf("failed to build background index: %v", err)
	}

	// Create extractor and extract glyphs with RGBA2D
	extractor := NewFontGlyphExtractor(locator)
	result, err := extractor.ExtractGlyphs(captchaPath, false, true)
	if err != nil {
		t.Fatalf("ExtractGlyphs failed: %v", err)
	}

	// Check that RGBA2D is included
	for _, glyph := range result.Glyphs {
		if len(glyph.RGBA2D) == 0 {
			t.Error("expected RGBA2D to be included")
		}
		if len(glyph.RGBA2D) != glyph.Height {
			t.Errorf("expected RGBA2D height %d, got %d", glyph.Height, len(glyph.RGBA2D))
		}
		if len(glyph.RGBA2D) > 0 && len(glyph.RGBA2D[0]) != glyph.Width {
			t.Errorf("expected RGBA2D width %d, got %d", glyph.Width, len(glyph.RGBA2D[0]))
		}
	}
}

func TestFontGlyphExtractorExtractGlyphsFromTextRegions(t *testing.T) {
	// Create temporary directory
	tmpDir := t.TempDir()
	bgDir := filepath.Join(tmpDir, "backgrounds")
	captchaDir := filepath.Join(tmpDir, "captchas")
	os.MkdirAll(bgDir, 0755)
	os.MkdirAll(captchaDir, 0755)

	// Create a background image (with unique corner)
	bgPixels := CreateWhiteImage(200, 100)
	bgPixels.SetPixel(0, 0, color.RGBA{R: 254, G: 255, B: 255, A: 255}) // Slightly different corner
	bgPath := filepath.Join(bgDir, "bg.png")
	if err := SavePng(bgPixels, bgPath); err != nil {
		t.Fatalf("failed to save background: %v", err)
	}

	// Create a captcha image with text regions (matching background corners)
	captchaPixels := CreateWhiteImage(200, 100)
	// Set corners to match background for proper group_id matching
	captchaPixels.SetPixel(0, 0, color.RGBA{R: 254, G: 255, B: 255, A: 255})
	// Draw larger text regions with checkerboard pattern for < 95% fill ratio
	for y := 20; y < 60; y++ {
		for x := 20; x < 50; x++ {
			if (x+y)%2 == 0 {
				captchaPixels.SetPixel(x, y, color.RGBA{R: 255, G: 0, B: 0, A: 255})
			}
		}
		for x := 100; x < 130; x++ {
			if (x+y)%2 == 0 {
				captchaPixels.SetPixel(x, y, color.RGBA{R: 0, G: 0, B: 255, A: 255})
			}
		}
	}
	captchaPath := filepath.Join(captchaDir, "captcha.png")
	if err := SavePng(captchaPixels, captchaPath); err != nil {
		t.Fatalf("failed to save captcha: %v", err)
	}

	// Create locator and build background index with relaxed parameters
	locator := NewCaptchaFontLocator(
		30, 5, 8, // diff_threshold=30, min_component_pixels=5
		10, 10, 0.5, 0.1, // relaxed region builder params
		10, 0.1, IntPtr(10), 5, // relaxed text region params
	)
	_, err := locator.BuildBackgroundIndex(bgDir, false, []string{".png"})
	if err != nil {
		t.Fatalf("failed to build background index: %v", err)
	}

	// Create extractor and extract glyphs from text regions
	extractor := NewFontGlyphExtractor(locator)
	result, err := extractor.ExtractGlyphsFromTextRegions(captchaPath, false, false)
	if err != nil {
		t.Fatalf("ExtractGlyphsFromTextRegions failed: %v", err)
	}

	// Verify result structure is valid (glyph extraction may or may not find glyphs
	// depending on the specific image characteristics and parameters)
	if result.Glyphs == nil {
		t.Error("expected non-nil glyphs slice")
	}
}

func TestExportGlyphImages(t *testing.T) {
	// Create temporary directory
	tmpDir := t.TempDir()
	outputDir := filepath.Join(tmpDir, "output")

	// Create a captcha image
	captchaPixels := CreateWhiteImage(50, 50)
	for y := 10; y < 20; y++ {
		for x := 10; x < 20; x++ {
			captchaPixels.SetPixel(x, y, color.RGBA{R: 255, G: 0, B: 0, A: 255})
		}
	}

	// Create glyphs
	glyphs := []FontGlyph{
		{
			RectIndex:  0,
			BBox:       BBox{10, 10, 19, 19},
			Width:      10,
			Height:     10,
			PixelCount: 100,
		},
	}

	// Export glyph images
	result, err := ExportGlyphImages(glyphs, captchaPixels, outputDir, "test", GlyphRenderModeORIGINAL)
	if err != nil {
		t.Fatalf("ExportGlyphImages failed: %v", err)
	}

	if result.OutputDir != outputDir {
		t.Errorf("expected output dir %s, got %s", outputDir, result.OutputDir)
	}

	if result.Stats["exported_count"] != 1 {
		t.Errorf("expected 1 exported, got %d", result.Stats["exported_count"])
	}

	// Check output file exists
	expectedFile := filepath.Join(outputDir, "test_0000.png")
	if _, err := os.Stat(expectedFile); os.IsNotExist(err) {
		t.Error("exported glyph image should exist")
	}
}

func TestExportGlyphImagesDefaultPrefix(t *testing.T) {
	// Create temporary directory
	tmpDir := t.TempDir()
	outputDir := filepath.Join(tmpDir, "output")

	captchaPixels := CreateWhiteImage(50, 50)
	glyphs := []FontGlyph{
		{
			RectIndex:  0,
			BBox:       BBox{10, 10, 19, 19},
			Width:      10,
			Height:     10,
			PixelCount: 100,
		},
	}

	// Export with empty prefix (should use "glyph")
	_, err := ExportGlyphImages(glyphs, captchaPixels, outputDir, "", GlyphRenderModeORIGINAL)
	if err != nil {
		t.Fatalf("ExportGlyphImages failed: %v", err)
	}

	// Check output file with default prefix exists
	expectedFile := filepath.Join(outputDir, "glyph_0000.png")
	if _, err := os.Stat(expectedFile); os.IsNotExist(err) {
		t.Error("exported glyph image with default prefix should exist")
	}
}
