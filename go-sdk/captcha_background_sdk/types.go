package captcha_background_sdk

import (
	"encoding/json"
	"fmt"
	"strings"
)

// RGB represents a 3-channel RGB color value.
// Each channel ranges from 0 to 255.
// Example: RGB{255, 0, 0} represents pure red.
type RGB [3]int

// RGBA represents a 4-channel RGBA color value with alpha channel.
// Each channel ranges from 0 to 255. Alpha of 0 is fully transparent, 255 is fully opaque.
// Example: RGBA{255, 0, 0, 128} represents semi-transparent red.
type RGBA [4]int

// BBox represents a bounding box as [left, top, right, bottom] coordinates (inclusive).
// All coordinates are zero-indexed pixel positions.
// Example: BBox{10, 20, 30, 40} represents a box from (10,20) to (30,40).
type BBox [4]int

// Pixel represents a coordinate as [x, y].
// Example: Pixel{5, 10} represents the pixel at column 5, row 10.
type Pixel [2]int

// CaptchaType represents the supported captcha detection modes.
// Use with NormalizeCaptchaType() for flexible input handling.
type CaptchaType string

const (
	// CaptchaTypeTEXT is used for text-based captchas with multiple characters
	CaptchaTypeTEXT CaptchaType = "text"

	// CaptchaTypeFONT is used for font-based captchas with styled text
	CaptchaTypeFONT CaptchaType = "font"

	// CaptchaTypeSLIDER is used for slider-based captchas with gap detection
	CaptchaTypeSLIDER CaptchaType = "slider"
)

// GlyphRenderMode represents render modes for exported glyph PNG images.
// Controls how glyph pixels are rendered in output images.
type GlyphRenderMode string

const (
	// GlyphRenderModeORIGINAL preserves the original pixel colors from the captcha
	GlyphRenderModeORIGINAL GlyphRenderMode = "original"

	// GlyphRenderModeBLACK_ON_TRANSPARENT renders glyphs as black on transparent background
	GlyphRenderModeBLACK_ON_TRANSPARENT GlyphRenderMode = "black_on_transparent"

	// GlyphRenderModeBLACK_ON_WHITE renders glyphs as black on white background
	GlyphRenderModeBLACK_ON_WHITE GlyphRenderMode = "black_on_white"

	// GlyphRenderModeWHITE_ON_BLACK renders glyphs as white on black background
	GlyphRenderModeWHITE_ON_BLACK GlyphRenderMode = "white_on_black"
)

// CaptchaTypeLike is a flexible type for captcha type input.
// Accepts CaptchaType enum values or string representations.
type CaptchaTypeLike interface{}

// GlyphRenderModeLike is a flexible type for render mode input.
// Accepts GlyphRenderMode enum values or string representations.
type GlyphRenderModeLike interface{}

// NormalizeCaptchaType normalizes captcha type input to CaptchaType
func NormalizeCaptchaType(captchaType CaptchaTypeLike) (CaptchaType, error) {
	if ct, ok := captchaType.(CaptchaType); ok {
		return ct, nil
	}
	value := strings.ToLower(fmt.Sprintf("%v", captchaType))
	switch value {
	case "text":
		return CaptchaTypeTEXT, nil
	case "font":
		return CaptchaTypeFONT, nil
	case "slider":
		return CaptchaTypeSLIDER, nil
	}
	return "", fmt.Errorf("captcha_type must be CaptchaType.TEXT/FONT/SLIDER or one of 'text'/'font'/'slider'")
}

// NormalizeGlyphRenderMode normalizes render mode input to GlyphRenderMode
func NormalizeGlyphRenderMode(renderMode GlyphRenderModeLike) (GlyphRenderMode, error) {
	if rm, ok := renderMode.(GlyphRenderMode); ok {
		return rm, nil
	}
	value := fmt.Sprintf("%v", renderMode)
	switch value {
	case "original":
		return GlyphRenderModeORIGINAL, nil
	case "black_on_transparent":
		return GlyphRenderModeBLACK_ON_TRANSPARENT, nil
	case "black_on_white":
		return GlyphRenderModeBLACK_ON_WHITE, nil
	case "white_on_black":
		return GlyphRenderModeWHITE_ON_BLACK, nil
	}
	return "", fmt.Errorf("render_mode must be GlyphRenderMode.ORIGINAL/BLACK_ON_TRANSPARENT/BLACK_ON_WHITE/WHITE_ON_BLACK")
}

// BackgroundMeta represents background image metadata
type BackgroundMeta struct {
	GroupID   string `json:"group_id"`
	ImagePath string `json:"image_path"`
	Width     int    `json:"width"`
	Height    int    `json:"height"`
}

// FontComponent represents a connected component of text
type FontComponent struct {
	Color       RGB     `json:"color"`
	BBox        BBox    `json:"bbox"`
	PixelCount  int     `json:"pixel_count"`
	Pixels      []Pixel `json:"pixels"`
}

// LocateResult represents the result of locating fonts
type LocateResult struct {
	GroupID        string          `json:"group_id"`
	BackgroundPath string          `json:"background_path"`
	ImageSize      [2]int          `json:"image_size"`
	Components     []FontComponent `json:"components"`
	Stats          map[string]int  `json:"stats"`
}

// SliderGap represents a detected slider gap
type SliderGap struct {
	BBox       BBox   `json:"bbox"`
	Center     Pixel  `json:"center"`
	PixelCount int    `json:"pixel_count"`
}

// SliderLocateResult represents the result of locating slider gaps
type SliderLocateResult struct {
	GroupID        string            `json:"group_id"`
	BackgroundPath string            `json:"background_path"`
	ImageSize      [2]int            `json:"image_size"`
	Gap            *SliderGap        `json:"gap"`
	Stats          map[string]int    `json:"stats"`
}

// TextRegion represents a detected text region
type TextRegion struct {
	BBox           BBox   `json:"bbox"`
	PixelCount     int    `json:"pixel_count"`
	ComponentCount int    `json:"component_count"`
	Colors         []RGB  `json:"colors"`
	Score          float64 `json:"score"`
	Pixels         []Pixel `json:"pixels"`
}

// TextLocateResult represents the result of locating text positions
type TextLocateResult struct {
	GroupID        string           `json:"group_id"`
	BackgroundPath string           `json:"background_path"`
	ImageSize      [2]int           `json:"image_size"`
	Regions        []TextRegion     `json:"regions"`
	Stats          map[string]int   `json:"stats"`
}

// TextLayerResult represents the result of extracting text layer
type TextLayerResult struct {
	GroupID        string         `json:"group_id"`
	BackgroundPath string         `json:"background_path"`
	ImageSize      [2]int         `json:"image_size"`
	TextBBox       *BBox          `json:"text_bbox"`
	TextPixelCount int            `json:"text_pixel_count"`
	OutputPath     *string        `json:"output_path"`
	Stats          map[string]int `json:"stats"`
}

// BackgroundRestoreResult represents the result of background restoration
type BackgroundRestoreResult struct {
	GroupID        string  `json:"group_id"`
	BackgroundPath string  `json:"background_path"`
	ImageSize      [2]int  `json:"image_size"`
	OutputPath     *string `json:"output_path"`
}

// FontGlyph represents an extracted font glyph
type FontGlyph struct {
	RectIndex  int       `json:"rect_index"`
	BBox       BBox      `json:"bbox"`
	Width      int       `json:"width"`
	Height     int       `json:"height"`
	Color      RGB       `json:"color"`
	PixelCount int       `json:"pixel_count"`
	Pixels     []Pixel   `json:"pixels"`
	Bitmap2D   [][]int   `json:"bitmap_2d"`
	RGBA2D     [][]RGBA  `json:"rgba_2d"`
}

// FontGlyphExtractResult represents the result of glyph extraction
type FontGlyphExtractResult struct {
	GroupID        string          `json:"group_id"`
	BackgroundPath string          `json:"background_path"`
	ImageSize      [2]int          `json:"image_size"`
	Glyphs         []FontGlyph     `json:"glyphs"`
	Stats          map[string]int  `json:"stats"`
}

// FontGlyphFeature represents a glyph feature vector
type FontGlyphFeature struct {
	RectIndex         int     `json:"rect_index"`
	BBox              BBox    `json:"bbox"`
	Width             int     `json:"width"`
	Height            int     `json:"height"`
	Color             RGB     `json:"color"`
	PixelCount        int     `json:"pixel_count"`
	Density           float64 `json:"density"`
	Bitmap2D          [][]int `json:"bitmap_2d"`
	ResizedBitmap2D   [][]int `json:"resized_bitmap_2d"`
	Vector1D          []int   `json:"vector_1d"`
}

// FontGlyphFeatureExtractResult represents the result of feature extraction
type FontGlyphFeatureExtractResult struct {
	GroupID        string             `json:"group_id"`
	BackgroundPath string             `json:"background_path"`
	ImageSize      [2]int             `json:"image_size"`
	TargetSize     [2]int             `json:"target_size"`
	GlyphFeatures  []FontGlyphFeature `json:"glyph_features"`
	Stats          map[string]int     `json:"stats"`
}

// BatchGlyphExtractItem represents a single item in batch extraction
type BatchGlyphExtractItem struct {
	CaptchaPath string                        `json:"captcha_path"`
	Status      string                        `json:"status"`
	GroupID     *string                       `json:"group_id"`
	GlyphCount  int                           `json:"glyph_count"`
	Error       *string                       `json:"error"`
	Result      *FontGlyphFeatureExtractResult `json:"result"`
}

// BatchGlyphExtractResult represents the result of batch extraction
type BatchGlyphExtractResult struct {
	InputDir        string                  `json:"input_dir"`
	TotalFiles      int                     `json:"total_files"`
	ProcessedFiles  int                     `json:"processed_files"`
	SuccessCount    int                     `json:"success_count"`
	ErrorCount      int                     `json:"error_count"`
	TargetSize      [2]int                  `json:"target_size"`
	Items           []BatchGlyphExtractItem `json:"items"`
}

// GlyphDatasetExportResult represents the result of dataset export
type GlyphDatasetExportResult struct {
	InputDir         string `json:"input_dir"`
	TotalFiles       int    `json:"total_files"`
	ProcessedFiles   int    `json:"processed_files"`
	SuccessCount     int    `json:"success_count"`
	ErrorCount       int    `json:"error_count"`
	GlyphSampleCount int    `json:"glyph_sample_count"`
	TargetSize       [2]int `json:"target_size"`
	OutputNPZPath    string `json:"output_npz_path"`
	OutputJSONPath   *string `json:"output_json_path"`
}

// FontGlyphSlot represents an aligned glyph slot
type FontGlyphSlot struct {
	SlotIndex  int      `json:"slot_index"`
	Present    bool     `json:"present"`
	RectIndex  *int     `json:"rect_index"`
	BBox       *BBox    `json:"bbox"`
	Vector1D   []int    `json:"vector_1d"`
	Density    float64  `json:"density"`
}

// FontGlyphSlotExtractResult represents the result of slot alignment
type FontGlyphSlotExtractResult struct {
	GroupID        string            `json:"group_id"`
	BackgroundPath string            `json:"background_path"`
	ImageSize      [2]int            `json:"image_size"`
	TargetSize     [2]int            `json:"target_size"`
	SlotCount      int               `json:"slot_count"`
	Slots          []FontGlyphSlot   `json:"slots"`
	Stats          map[string]int    `json:"stats"`
}

// FontGlyphImageItem represents an exported glyph image
type FontGlyphImageItem struct {
	RectIndex  int    `json:"rect_index"`
	BBox       BBox   `json:"bbox"`
	ImagePath  string `json:"image_path"`
	Width      int    `json:"width"`
	Height     int    `json:"height"`
	PixelCount int    `json:"pixel_count"`
}

// FontGlyphImageExportResult represents the result of image export
type FontGlyphImageExportResult struct {
	GroupID        string               `json:"group_id"`
	BackgroundPath string               `json:"background_path"`
	ImageSize      [2]int               `json:"image_size"`
	OutputDir      string               `json:"output_dir"`
	GlyphImages    []FontGlyphImageItem `json:"glyph_images"`
	Stats          map[string]int       `json:"stats"`
}

// BackgroundTextureResult represents background texture analysis
type BackgroundTextureResult struct {
	GroupID        string           `json:"group_id"`
	BackgroundPath string           `json:"background_path"`
	ImageSize      [2]int           `json:"image_size"`
	MeanIntensity  float64          `json:"mean_intensity"`
	StdIntensity   float64          `json:"std_intensity"`
	Entropy        float64          `json:"entropy"`
	EdgeDensity    float64          `json:"edge_density"`
	Histogram      []float64        `json:"histogram"`
	GridEnergy     []float64        `json:"grid_energy"`
	Stats          map[string]float64 `json:"stats"`
}

// BackgroundDeepFeatureResult represents deep feature extraction
type BackgroundDeepFeatureResult struct {
	GroupID        string            `json:"group_id"`
	BackgroundPath string            `json:"background_path"`
	ImageSize      [2]int            `json:"image_size"`
	Levels         []int             `json:"levels"`
	PatchCount     int               `json:"patch_count"`
	Vector1D       []float64         `json:"vector_1d"`
	Stats          map[string]float64 `json:"stats"`
}

// ForegroundSkewEstimateResult represents skew estimation
type ForegroundSkewEstimateResult struct {
	GroupID        string  `json:"group_id"`
	BackgroundPath string  `json:"background_path"`
	ImageSize      [2]int  `json:"image_size"`
	AngleDegrees   float64 `json:"angle_degrees"`
	Confidence     float64 `json:"confidence"`
	PixelCount     int     `json:"pixel_count"`
	EigenRatio     float64 `json:"eigen_ratio"`
}

// CaptchaAutoResult represents automatic captcha detection result
type CaptchaAutoResult struct {
	DetectedType   string                 `json:"detected_type"`
	Confidence     float64                `json:"confidence"`
	Reason         string                 `json:"reason"`
	GroupID        string                 `json:"group_id"`
	BackgroundPath string                 `json:"background_path"`
	ImageSize      [2]int                 `json:"image_size"`
	TextScore      float64                `json:"text_score"`
	SliderScore    float64                `json:"slider_score"`
	TextPayload    map[string]interface{} `json:"text_payload"`
	SliderPayload  map[string]interface{} `json:"slider_payload"`
	Stats          map[string]float64     `json:"stats"`
}

// RecognitionResult is a union of all recognition results
type RecognitionResult interface{}

// ProgressCallback is a callback for progress updates
type ProgressCallback func(processed, total int, currentPath string)

// StopChecker is a callback to check if processing should stop
type StopChecker func() bool

// LocalRestoreConfig represents configuration for local restore
type LocalRestoreConfig struct {
	InputDir               string
	OutputDir              string
	ClearOutputBeforeRun   bool
	Recursive              bool
	MaxErrorItems          int
	ProgressCallback       ProgressCallback
	StopChecker            StopChecker
}

// LocalRestoreStatus represents the status of local restore
type LocalRestoreStatus struct {
	ProcessedFiles  int    `json:"processed_files"`
	TotalFiles      int    `json:"total_files"`
	BucketCount     int    `json:"bucket_count"`
	OutputFiles     int    `json:"output_files"`
	ErrorCount      int    `json:"error_count"`
	CurrentPath     string `json:"current_path"`
}

// BucketSummary represents a bucket summary
type BucketSummary struct {
	BucketID     string   `json:"bucket_id"`
	ImageCount   int      `json:"image_count"`
	ImagePaths   []string `json:"image_paths"`
	OutputPath   string   `json:"output_path"`
	Width        int      `json:"width"`
	Height       int      `json:"height"`
}

// LocalRestoreSummary represents the final summary of local restore
type LocalRestoreSummary struct {
	BucketCount     int               `json:"bucket_count"`
	OutputFiles     int               `json:"output_files"`
	TotalImages     int               `json:"total_images"`
	Buckets         []BucketSummary   `json:"buckets"`
	SummaryPath     string            `json:"summary_path"`
	OutputDir       string            `json:"output_dir"`
}

// ProcessingErrorItem represents an error during processing
type ProcessingErrorItem struct {
	Path    string `json:"path"`
	Error   string `json:"error"`
}

// ToJSON serializes the result to JSON
func (r *CaptchaAutoResult) ToJSON() (string, error) {
	bytes, err := json.MarshalIndent(r, "", "  ")
	if err != nil {
		return "", err
	}
	return string(bytes), nil
}

// ToJSON serializes the result to JSON
func (r *LocateResult) ToJSON() (string, error) {
	bytes, err := json.MarshalIndent(r, "", "  ")
	if err != nil {
		return "", err
	}
	return string(bytes), nil
}

// MarshalJSON implements json.Marshaler for RGB
func (r RGB) MarshalJSON() ([]byte, error) {
	return json.Marshal([3]int(r))
}

// MarshalJSON implements json.Marshaler for RGBA
func (r RGBA) MarshalJSON() ([]byte, error) {
	return json.Marshal([4]int(r))
}

// MarshalJSON implements json.Marshaler for BBox
func (b BBox) MarshalJSON() ([]byte, error) {
	return json.Marshal([4]int(b))
}

// MarshalJSON implements json.Marshaler for Pixel
func (p Pixel) MarshalJSON() ([]byte, error) {
	return json.Marshal([2]int(p))
}

// ToJSON serializes the result to JSON
func (r *SliderLocateResult) ToJSON() (string, error) {
	bytes, err := json.MarshalIndent(r, "", "  ")
	if err != nil {
		return "", err
	}
	return string(bytes), nil
}
