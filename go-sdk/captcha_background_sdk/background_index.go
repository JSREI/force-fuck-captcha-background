package captcha_background_sdk

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"
)

// BuildBackgroundIndex builds an index of background images from a directory.
// The index maps group IDs (computed from image dimensions and corner colors) to metadata.
//
// Parameters:
//   - backgroundDir: Path to the directory containing background images
//   - recursive: If true, recursively scan subdirectories
//   - exts: List of file extensions to include (e.g., [".png", ".jpg"]).
//           If empty, defaults to [".png", ".jpg", ".jpeg", ".gif", ".bmp"]
//
// Returns a map from group ID to BackgroundMeta, or an error if the directory cannot be read.
//
// Note: If multiple images have the same group_id, a warning is printed and the first one is kept.
func BuildBackgroundIndex(
	backgroundDir string,
	recursive bool,
	exts []string,
) (map[string]BackgroundMeta, error) {
	index := make(map[string]BackgroundMeta)

	if len(exts) == 0 {
		exts = []string{".png", ".jpg", ".jpeg", ".gif", ".bmp"}
	}

	// Normalize extensions
	for i, ext := range exts {
		if !strings.HasPrefix(ext, ".") {
			exts[i] = "." + ext
		}
		exts[i] = strings.ToLower(exts[i])
	}

	walkFunc := func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}

		if info.IsDir() {
			if !recursive && path != backgroundDir {
				return filepath.SkipDir
			}
			return nil
		}

		// Check extension
		fileExt := strings.ToLower(filepath.Ext(path))
		found := false
		for _, ext := range exts {
			if fileExt == ext {
				found = true
				break
			}
		}
		if !found {
			return nil
		}

		// Compute group_id
		groupID, err := ComputeGroupID(path)
		if err != nil {
			return fmt.Errorf("failed to compute group_id for %s: %w", path, err)
		}

		// Get image dimensions
		pixels, err := LoadRgbaPixels(path)
		if err != nil {
			return fmt.Errorf("failed to load image %s: %w", path, err)
		}

		meta := BackgroundMeta{
			GroupID:   groupID,
			ImagePath: path,
			Width:     pixels.Width,
			Height:    pixels.Height,
		}

		// Check for duplicates
		if existing, ok := index[groupID]; ok {
			return fmt.Errorf("duplicate group_id %s: %s and %s", groupID, existing.ImagePath, path)
		}

		index[groupID] = meta
		return nil
	}

	err := filepath.Walk(backgroundDir, walkFunc)
	if err != nil {
		return nil, err
	}

	return index, nil
}

// BuildBackgroundIndexFromFiles builds an index from a list of files
func BuildBackgroundIndexFromFiles(files []string) (map[string]BackgroundMeta, error) {
	index := make(map[string]BackgroundMeta)

	for _, path := range files {
		groupID, err := ComputeGroupID(path)
		if err != nil {
			return nil, fmt.Errorf("failed to compute group_id for %s: %w", path, err)
		}

		pixels, err := LoadRgbaPixels(path)
		if err != nil {
			return nil, fmt.Errorf("failed to load image %s: %w", path, err)
		}

		meta := BackgroundMeta{
			GroupID:   groupID,
			ImagePath: path,
			Width:     pixels.Width,
			Height:    pixels.Height,
		}

		if existing, ok := index[groupID]; ok {
			return nil, fmt.Errorf("duplicate group_id %s: %s and %s", groupID, existing.ImagePath, path)
		}

		index[groupID] = meta
	}

	return index, nil
}
