package captcha_background_sdk

import (
	"os"
	"path/filepath"
	"testing"
)

func TestBuildBackgroundIndex(t *testing.T) {
	// Create temporary directory
	tmpDir := t.TempDir()

	// Create test images
	img1 := CreateWhiteImage(10, 10)
	SavePng(img1, filepath.Join(tmpDir, "bg1.png"))

	img2 := CreateWhiteImage(20, 20)
	SavePng(img2, filepath.Join(tmpDir, "bg2.png"))

	// Create a non-image file
	os.WriteFile(filepath.Join(tmpDir, "readme.txt"), []byte("test"), 0644)

	// Build index
	index, err := BuildBackgroundIndex(tmpDir, false, []string{".png"})
	if err != nil {
		t.Fatalf("BuildBackgroundIndex failed: %v", err)
	}

	if len(index) != 2 {
		t.Errorf("expected 2 backgrounds, got %d", len(index))
	}
}

func TestBuildBackgroundIndexRecursive(t *testing.T) {
	// Create temporary directory structure
	tmpDir := t.TempDir()
	subDir := filepath.Join(tmpDir, "subdir")
	os.MkdirAll(subDir, 0755)

	// Create test images in different directories
	img1 := CreateWhiteImage(10, 10)
	SavePng(img1, filepath.Join(tmpDir, "bg1.png"))

	img2 := CreateWhiteImage(20, 20)
	SavePng(img2, filepath.Join(subDir, "bg2.png"))

	// Build index non-recursive
	index, err := BuildBackgroundIndex(tmpDir, false, []string{".png"})
	if err != nil {
		t.Fatalf("BuildBackgroundIndex failed: %v", err)
	}

	if len(index) != 1 {
		t.Errorf("expected 1 background (non-recursive), got %d", len(index))
	}

	// Build index recursive
	index, err = BuildBackgroundIndex(tmpDir, true, []string{".png"})
	if err != nil {
		t.Fatalf("BuildBackgroundIndex failed: %v", err)
	}

	if len(index) != 2 {
		t.Errorf("expected 2 backgrounds (recursive), got %d", len(index))
	}
}

func TestBuildBackgroundIndexMultipleExtensions(t *testing.T) {
	// Create temporary directory
	tmpDir := t.TempDir()

	// Create test images with different extensions
	img1 := CreateWhiteImage(10, 10)
	SavePng(img1, filepath.Join(tmpDir, "bg1.png"))

	img2 := CreateWhiteImage(20, 20)
	SavePng(img2, filepath.Join(tmpDir, "bg2.jpg"))

	img3 := CreateWhiteImage(30, 30)
	SavePng(img3, filepath.Join(tmpDir, "bg3.jpeg"))

	// Build index with multiple extensions
	index, err := BuildBackgroundIndex(tmpDir, false, []string{".png", ".jpg", ".jpeg"})
	if err != nil {
		t.Fatalf("BuildBackgroundIndex failed: %v", err)
	}

	if len(index) != 3 {
		t.Errorf("expected 3 backgrounds, got %d", len(index))
	}
}

func TestBuildBackgroundIndexDefaultExtensions(t *testing.T) {
	// Create temporary directory
	tmpDir := t.TempDir()

	// Create test images
	img1 := CreateWhiteImage(10, 10)
	SavePng(img1, filepath.Join(tmpDir, "bg1.png"))

	img2 := CreateWhiteImage(20, 20)
	SavePng(img2, filepath.Join(tmpDir, "bg2.jpg"))

	// Build index with nil extensions (should use defaults)
	index, err := BuildBackgroundIndex(tmpDir, false, nil)
	if err != nil {
		t.Fatalf("BuildBackgroundIndex failed: %v", err)
	}

	if len(index) != 2 {
		t.Errorf("expected 2 backgrounds with default extensions, got %d", len(index))
	}
}

func TestBuildBackgroundIndexDuplicateGroupID(t *testing.T) {
	// Create temporary directory
	tmpDir := t.TempDir()

	// Create two identical images (will have same group_id)
	img1 := CreateWhiteImage(10, 10)
	SavePng(img1, filepath.Join(tmpDir, "bg1.png"))

	img2 := CreateWhiteImage(10, 10)
	SavePng(img2, filepath.Join(tmpDir, "bg2.png"))

	// Build index should fail due to duplicate group_id
	_, err := BuildBackgroundIndex(tmpDir, false, []string{".png"})
	if err == nil {
		t.Error("expected error for duplicate group_id")
	}
}

func TestBuildBackgroundIndexNonexistentDir(t *testing.T) {
	_, err := BuildBackgroundIndex("/nonexistent/directory", false, nil)
	if err == nil {
		t.Error("expected error for nonexistent directory")
	}
}

func TestBuildBackgroundIndexFromFiles(t *testing.T) {
	// Create temporary directory
	tmpDir := t.TempDir()

	// Create test images
	img1 := CreateWhiteImage(10, 10)
	path1 := filepath.Join(tmpDir, "bg1.png")
	SavePng(img1, path1)

	img2 := CreateWhiteImage(20, 20)
	path2 := filepath.Join(tmpDir, "bg2.png")
	SavePng(img2, path2)

	// Build index from file list
	files := []string{path1, path2}
	index, err := BuildBackgroundIndexFromFiles(files)
	if err != nil {
		t.Fatalf("BuildBackgroundIndexFromFiles failed: %v", err)
	}

	if len(index) != 2 {
		t.Errorf("expected 2 backgrounds, got %d", len(index))
	}
}

func TestBuildBackgroundIndexFromFilesDuplicate(t *testing.T) {
	// Create temporary directory
	tmpDir := t.TempDir()

	// Create two identical images
	img1 := CreateWhiteImage(10, 10)
	path1 := filepath.Join(tmpDir, "bg1.png")
	SavePng(img1, path1)

	img2 := CreateWhiteImage(10, 10)
	path2 := filepath.Join(tmpDir, "bg2.png")
	SavePng(img2, path2)

	// Build index from file list should fail due to duplicate group_id
	files := []string{path1, path2}
	_, err := BuildBackgroundIndexFromFiles(files)
	if err == nil {
		t.Error("expected error for duplicate group_id")
	}
}

func TestBuildBackgroundIndexExtensionNormalization(t *testing.T) {
	// Create temporary directory
	tmpDir := t.TempDir()

	// Create test image
	img := CreateWhiteImage(10, 10)
	SavePng(img, filepath.Join(tmpDir, "bg.PNG"))

	// Build index with lowercase extension filter
	index, err := BuildBackgroundIndex(tmpDir, false, []string{".png"})
	if err != nil {
		t.Fatalf("BuildBackgroundIndex failed: %v", err)
	}

	if len(index) != 1 {
		t.Errorf("expected 1 background (case insensitive), got %d", len(index))
	}
}
