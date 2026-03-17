package captcha_background_sdk

import (
	"image/color"
	"path/filepath"
	"testing"
)

func TestColorDistance(t *testing.T) {
	c1 := RGB{255, 255, 255}
	c2 := RGB{0, 0, 0}
	c3 := RGB{255, 255, 255}

	// Same color should have 0 distance
	dist := ColorDistance(c1, c3)
	if dist != 0 {
		t.Errorf("expected 0, got %d", dist)
	}

	// Black to white should have large distance
	dist = ColorDistance(c1, c2)
	expected := 255*255*3 // 195075
	if dist != expected {
		t.Errorf("expected %d, got %d", expected, dist)
	}
}

func TestLoadAndSaveRgbaPixels(t *testing.T) {
	// Create test image
	width, height := 10, 10
	pixels := CreateTransparentImage(width, height)

	// Set some pixels
	pixels.SetPixel(0, 0, color.RGBA{R: 255, G: 0, B: 0, A: 255})
	pixels.SetPixel(5, 5, color.RGBA{R: 0, G: 255, B: 0, A: 128})

	// Save to temp file
	tmpDir := t.TempDir()
	imgPath := filepath.Join(tmpDir, "test.png")

	if err := SavePng(pixels, imgPath); err != nil {
		t.Fatalf("SavePng failed: %v", err)
	}

	// Load back
	loaded, err := LoadRgbaPixels(imgPath)
	if err != nil {
		t.Fatalf("LoadRgbaPixels failed: %v", err)
	}

	// Verify dimensions
	if loaded.Width != width || loaded.Height != height {
		t.Errorf("expected %dx%d, got %dx%d", width, height, loaded.Width, loaded.Height)
	}

	// Verify pixel values
	p1 := loaded.GetPixel(0, 0)
	if p1.R != 255 || p1.G != 0 || p1.B != 0 {
		t.Errorf("expected (255,0,0), got (%d,%d,%d)", p1.R, p1.G, p1.B)
	}
}

func TestLoadRgbaPixelsNonexistent(t *testing.T) {
	_, err := LoadRgbaPixels("/nonexistent/path.png")
	if err == nil {
		t.Error("expected error for nonexistent file")
	}
}

func TestCreateTransparentImage(t *testing.T) {
	img := CreateTransparentImage(20, 30)

	if img.Width != 20 || img.Height != 30 {
		t.Errorf("expected 20x30, got %dx%d", img.Width, img.Height)
	}

	// Check all pixels are transparent
	for y := 0; y < img.Height; y++ {
		for x := 0; x < img.Width; x++ {
			p := img.GetPixel(x, y)
			if p.A != 0 {
				t.Errorf("expected transparent at (%d,%d), got A=%d", x, y, p.A)
			}
		}
	}
}

func TestCreateWhiteImage(t *testing.T) {
	img := CreateWhiteImage(10, 10)

	p := img.GetPixel(5, 5)
	if p.R != 255 || p.G != 255 || p.B != 255 || p.A != 255 {
		t.Errorf("expected white, got (%d,%d,%d,%d)", p.R, p.G, p.B, p.A)
	}
}

func TestCreateBlackImage(t *testing.T) {
	img := CreateBlackImage(10, 10)

	p := img.GetPixel(5, 5)
	if p.R != 0 || p.G != 0 || p.B != 0 || p.A != 255 {
		t.Errorf("expected black, got (%d,%d,%d,%d)", p.R, p.G, p.B, p.A)
	}
}

func TestGetPixelOutOfBounds(t *testing.T) {
	img := CreateTransparentImage(10, 10)

	// Out of bounds should return zero color
	p := img.GetPixel(-1, -1)
	if p.R != 0 || p.G != 0 || p.B != 0 || p.A != 0 {
		t.Errorf("expected zero for out of bounds, got (%d,%d,%d,%d)", p.R, p.G, p.B, p.A)
	}

	p = img.GetPixel(100, 100)
	if p.R != 0 || p.G != 0 || p.B != 0 || p.A != 0 {
		t.Errorf("expected zero for out of bounds, got (%d,%d,%d,%d)", p.R, p.G, p.B, p.A)
	}
}

func TestSetPixelOutOfBounds(t *testing.T) {
	img := CreateTransparentImage(10, 10)

	// Should not panic for out of bounds
	img.SetPixel(-1, -1, color.RGBA{R: 255, G: 0, B: 0, A: 255})
	img.SetPixel(100, 100, color.RGBA{R: 255, G: 0, B: 0, A: 255})
}

func TestIsImageFile(t *testing.T) {
	tests := []struct {
		filename string
		expected bool
	}{
		{"test.png", true},
		{"test.jpg", true},
		{"test.jpeg", true},
		{"test.gif", true},
		{"test.bmp", true},
		{"test.txt", false},
		{"test.pdf", false},
		{"", false},
	}

	for _, tt := range tests {
		result := IsImageFile(tt.filename)
		if result != tt.expected {
			t.Errorf("IsImageFile(%s) = %v, expected %v", tt.filename, result, tt.expected)
		}
	}
}

func TestToRGBA(t *testing.T) {
	c := color.RGBA{R: 255, G: 128, B: 64, A: 200}
	rgba := ToRGBA(c)

	if rgba[0] != 255 || rgba[1] != 128 || rgba[2] != 64 || rgba[3] != 200 {
		t.Errorf("expected (255,128,64,200), got (%d,%d,%d,%d)", rgba[0], rgba[1], rgba[2], rgba[3])
	}
}

func TestToRGB(t *testing.T) {
	c := color.RGBA{R: 255, G: 128, B: 64, A: 200}
	rgb := ToRGB(c)

	if rgb[0] != 255 || rgb[1] != 128 || rgb[2] != 64 {
		t.Errorf("expected (255,128,64), got (%d,%d,%d)", rgb[0], rgb[1], rgb[2])
	}
}

func TestColorDistanceRGBA(t *testing.T) {
	c1 := color.RGBA{R: 255, G: 255, B: 255, A: 255}
	c2 := color.RGBA{R: 0, G: 0, B: 0, A: 255}
	c3 := color.RGBA{R: 255, G: 255, B: 255, A: 0}

	// Same color should have 0 distance
	dist := ColorDistanceRGBA(c1, c3)
	if dist != 0 {
		t.Errorf("expected 0, got %d", dist)
	}

	// Black to white should have large distance
	dist = ColorDistanceRGBA(c1, c2)
	expected := 255*255*3 // 195075
	if dist != expected {
		t.Errorf("expected %d, got %d", expected, dist)
	}
}

func TestCopyPixels(t *testing.T) {
	// Create source image with a pattern
	src := CreateWhiteImage(10, 10)
	src.SetPixel(0, 0, color.RGBA{R: 255, G: 0, B: 0, A: 255})
	src.SetPixel(9, 9, color.RGBA{R: 0, G: 255, B: 0, A: 255})

	// Create destination image
	dst := CreateBlackImage(10, 10)

	// Copy pixels from source to destination
	CopyPixels(src, dst, 0, 0, 0, 0, 10, 10)

	// Verify pixels were copied
	p1 := dst.GetPixel(0, 0)
	if p1.R != 255 || p1.G != 0 || p1.B != 0 {
		t.Errorf("expected red at (0,0), got (%d,%d,%d)", p1.R, p1.G, p1.B)
	}

	p2 := dst.GetPixel(9, 9)
	if p2.R != 0 || p2.G != 255 || p2.B != 0 {
		t.Errorf("expected green at (9,9), got (%d,%d,%d)", p2.R, p2.G, p2.B)
	}
}

func TestCopyPixelsPartial(t *testing.T) {
	// Create source image
	src := CreateWhiteImage(10, 10)
	src.SetPixel(5, 5, color.RGBA{R: 255, G: 0, B: 0, A: 255})

	// Create destination image
	dst := CreateBlackImage(10, 10)

	// Copy only a partial region
	CopyPixels(src, dst, 5, 5, 0, 0, 3, 3)

	// Verify the pixel was copied
	p := dst.GetPixel(0, 0)
	if p.R != 255 || p.G != 0 || p.B != 0 {
		t.Errorf("expected red at (0,0), got (%d,%d,%d)", p.R, p.G, p.B)
	}
}

func TestCopyPixelsOutOfBounds(t *testing.T) {
	// Create source and destination images
	src := CreateWhiteImage(5, 5)
	dst := CreateBlackImage(5, 5)

	// This should not panic even with out-of-bounds coordinates
	CopyPixels(src, dst, 10, 10, 0, 0, 5, 5)
	CopyPixels(src, dst, 0, 0, 10, 10, 5, 5)
}

func TestGetImageExtension(t *testing.T) {
	tests := []struct {
		filename string
		expected string
	}{
		{"test.png", ".png"},
		{"test.jpg", ".jpg"},
		{"test.jpeg", ".jpeg"},
		{"test.gif", ".gif"},
		{"test.bmp", ".bmp"},
		{"test.webp", ".webp"},
		{"test.PNG", ".png"},
		{"test.txt", ""},
		{"test.pdf", ""},
		{"", ""},
	}

	for _, tt := range tests {
		result := GetImageExtension(tt.filename)
		if result != tt.expected {
			t.Errorf("GetImageExtension(%s) = %v, expected %v", tt.filename, result, tt.expected)
		}
	}
}
