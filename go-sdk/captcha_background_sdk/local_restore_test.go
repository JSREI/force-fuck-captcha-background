package captcha_background_sdk

import (
	"image/color"
	"os"
	"path/filepath"
	"testing"
)

func TestLocalRestoreRunnerEmptyBucket(t *testing.T) {
	config := LocalRestoreConfig{
		InputDir:             t.TempDir(),
		OutputDir:            t.TempDir(),
		Recursive:            false,
		ClearOutputBeforeRun: false,
	}

	// Create input dir with no images
	runner := NewLocalRestoreRunner(config)
	_, err := runner.Run()
	if err == nil {
		t.Error("expected error for empty input directory")
	}
}

func TestLocalRestoreRunnerSingleBucket(t *testing.T) {
	// Create temporary directories
	inputDir := t.TempDir()
	outputDir := t.TempDir()

	// Create multiple captcha images with same dimensions
	// Image 1: White with red pixel at (0,0)
	img1 := CreateWhiteImage(10, 10)
	img1.SetPixel(0, 0, color.RGBA{R: 255, G: 0, B: 0, A: 255})
	SavePng(img1, filepath.Join(inputDir, "captcha1.png"))

	// Image 2: White with red pixel at (0,0) - same background
	img2 := CreateWhiteImage(10, 10)
	img2.SetPixel(0, 0, color.RGBA{R: 255, G: 0, B: 0, A: 255})
	SavePng(img2, filepath.Join(inputDir, "captcha2.png"))

	// Image 3: White with blue pixel at (1,1) - different
	img3 := CreateWhiteImage(10, 10)
	img3.SetPixel(1, 1, color.RGBA{R: 0, G: 0, B: 255, A: 255})
	SavePng(img3, filepath.Join(inputDir, "captcha3.png"))

	config := LocalRestoreConfig{
		InputDir:             inputDir,
		OutputDir:            outputDir,
		Recursive:            false,
		ClearOutputBeforeRun: false,
	}

	runner := NewLocalRestoreRunner(config)
	summary, err := runner.Run()
	if err != nil {
		t.Fatalf("Run failed: %v", err)
	}

	if summary.BucketCount != 2 { // 10x10 with corners: (255,0,0,255) vs (0,0,255,255)
		t.Errorf("expected 2 buckets, got %d", summary.BucketCount)
	}

	if summary.TotalImages != 3 {
		t.Errorf("expected 3 total images, got %d", summary.TotalImages)
	}

	if summary.OutputFiles != 2 {
		t.Errorf("expected 2 output files, got %d", summary.OutputFiles)
	}

	// Check summary file exists
	if _, err := os.Stat(summary.SummaryPath); os.IsNotExist(err) {
		t.Error("summary file should exist")
	}
}

func TestLocalRestoreRunnerClearOutput(t *testing.T) {
	inputDir := t.TempDir()
	outputDir := t.TempDir()

	// Create existing file in output dir
	existingFile := filepath.Join(outputDir, "existing.txt")
	os.WriteFile(existingFile, []byte("test"), 0644)

	// Create one captcha image
	img := CreateWhiteImage(10, 10)
	SavePng(img, filepath.Join(inputDir, "captcha.png"))

	config := LocalRestoreConfig{
		InputDir:             inputDir,
		OutputDir:            outputDir,
		Recursive:            false,
		ClearOutputBeforeRun: true,
	}

	runner := NewLocalRestoreRunner(config)
	_, err := runner.Run()
	if err != nil {
		t.Fatalf("Run failed: %v", err)
	}

	// Existing file should be gone
	if _, err := os.Stat(existingFile); !os.IsNotExist(err) {
		t.Error("existing file should be removed after clear")
	}
}

func TestLocalRestoreRunnerProgressCallback(t *testing.T) {
	inputDir := t.TempDir()
	outputDir := t.TempDir()

	// Create multiple captcha images
	for i := 0; i < 3; i++ {
		img := CreateWhiteImage(10, 10)
		SavePng(img, filepath.Join(inputDir, "captcha%d.png"))
	}

	progressCalled := 0
	config := LocalRestoreConfig{
		InputDir:  inputDir,
		OutputDir: outputDir,
		Recursive: false,
		ProgressCallback: func(current, total int, outputPath string) {
			progressCalled++
		},
	}

	runner := NewLocalRestoreRunner(config)
	_, err := runner.Run()
	if err != nil {
		t.Fatalf("Run failed: %v", err)
	}

	if progressCalled == 0 {
		t.Error("progress callback should be called")
	}
}

func TestLocalRestoreRunnerStopChecker(t *testing.T) {
	inputDir := t.TempDir()
	outputDir := t.TempDir()

	// Create multiple captcha images
	for i := 0; i < 5; i++ {
		img := CreateWhiteImage(10, 10)
		SavePng(img, filepath.Join(inputDir, "captcha%d.png"))
	}

	stopAfter := 2
	processed := 0
	config := LocalRestoreConfig{
		InputDir:  inputDir,
		OutputDir: outputDir,
		Recursive: false,
		StopChecker: func() bool {
			processed++
			return processed >= stopAfter
		},
	}

	runner := NewLocalRestoreRunner(config)
	_, err := runner.Run()
	if err != nil {
		t.Fatalf("Run failed: %v", err)
	}

	// Should have stopped early
	if processed > stopAfter+1 {
		t.Errorf("expected to stop after %d, but processed %d", stopAfter, processed)
	}
}

func TestSanitizeFilename(t *testing.T) {
	tests := []struct {
		input    string
		expected string
	}{
		{"normal", "normal"},
		{"file/name", "file_name"},
		{"file\\name", "file_name"},
		{"file:name", "file_name"},
		{"file*name", "file_name"},
		{"file?name", "file_name"},
		{"file\"name", "file_name"},
		{"file<name>", "file_name_"},
		{"file|name", "file_name"},
		{"path/to/file.txt", "path_to_file.txt"},
	}

	for _, tt := range tests {
		result := sanitizeFilename(tt.input)
		if result != tt.expected {
			t.Errorf("sanitizeFilename(%q) = %q, expected %q", tt.input, result, tt.expected)
		}
	}
}

func TestRunLocalRestore(t *testing.T) {
	inputDir := t.TempDir()
	outputDir := t.TempDir()

	// Create one captcha image
	img := CreateWhiteImage(10, 10)
	SavePng(img, filepath.Join(inputDir, "captcha.png"))

	config := LocalRestoreConfig{
		InputDir:             inputDir,
		OutputDir:            outputDir,
		Recursive:            false,
		ClearOutputBeforeRun: false,
	}

	summary, err := RunLocalRestore(config)
	if err != nil {
		t.Fatalf("RunLocalRestore failed: %v", err)
	}

	if summary.BucketCount != 1 {
		t.Errorf("expected 1 bucket, got %d", summary.BucketCount)
	}
}
