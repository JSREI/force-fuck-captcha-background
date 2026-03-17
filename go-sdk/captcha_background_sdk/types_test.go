package captcha_background_sdk

import (
	"encoding/json"
	"strings"
	"testing"
)

func TestNormalizeCaptchaType(t *testing.T) {
	tests := []struct {
		name        string
		input       CaptchaTypeLike
		expected    CaptchaType
		shouldError bool
	}{
		{"TEXT enum", CaptchaTypeTEXT, CaptchaTypeTEXT, false},
		{"FONT enum", CaptchaTypeFONT, CaptchaTypeFONT, false},
		{"SLIDER enum", CaptchaTypeSLIDER, CaptchaTypeSLIDER, false},
		{"text string", "text", CaptchaTypeTEXT, false},
		{"TEXT uppercase", "TEXT", CaptchaTypeTEXT, false},
		{"font string", "font", CaptchaTypeFONT, false},
		{"slider string", "slider", CaptchaTypeSLIDER, false},
		{"invalid", "invalid", "", true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result, err := NormalizeCaptchaType(tt.input)
			if tt.shouldError {
				if err == nil {
					t.Errorf("expected error for input %v", tt.input)
				}
			} else {
				if err != nil {
					t.Errorf("unexpected error: %v", err)
				}
				if result != tt.expected {
					t.Errorf("expected %v, got %v", tt.expected, result)
				}
			}
		})
	}
}

func TestNormalizeGlyphRenderMode(t *testing.T) {
	tests := []struct {
		name        string
		input       GlyphRenderModeLike
		expected    GlyphRenderMode
		shouldError bool
	}{
		{"ORIGINAL enum", GlyphRenderModeORIGINAL, GlyphRenderModeORIGINAL, false},
		{"BLACK_ON_TRANSPARENT enum", GlyphRenderModeBLACK_ON_TRANSPARENT, GlyphRenderModeBLACK_ON_TRANSPARENT, false},
		{"original string", "original", GlyphRenderModeORIGINAL, false},
		{"black_on_transparent string", "black_on_transparent", GlyphRenderModeBLACK_ON_TRANSPARENT, false},
		{"black_on_white string", "black_on_white", GlyphRenderModeBLACK_ON_WHITE, false},
		{"white_on_black string", "white_on_black", GlyphRenderModeWHITE_ON_BLACK, false},
		{"invalid", "invalid", "", true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result, err := NormalizeGlyphRenderMode(tt.input)
			if tt.shouldError {
				if err == nil {
					t.Errorf("expected error for input %v", tt.input)
				}
			} else {
				if err != nil {
					t.Errorf("unexpected error: %v", err)
				}
				if result != tt.expected {
					t.Errorf("expected %v, got %v", tt.expected, result)
				}
			}
		})
	}
}

func TestRGBToJSON(t *testing.T) {
	rgb := RGB{255, 128, 64}
	data, err := rgb.MarshalJSON()
	if err != nil {
		t.Fatalf("failed to marshal RGB: %v", err)
	}

	expected := "[255,128,64]"
	if string(data) != expected {
		t.Errorf("expected %s, got %s", expected, string(data))
	}
}

func TestRGBAToJSON(t *testing.T) {
	rgba := RGBA{255, 128, 64, 200}
	data, err := rgba.MarshalJSON()
	if err != nil {
		t.Fatalf("failed to marshal RGBA: %v", err)
	}

	expected := "[255,128,64,200]"
	if string(data) != expected {
		t.Errorf("expected %s, got %s", expected, string(data))
	}
}

func TestBBoxToJSON(t *testing.T) {
	bbox := BBox{10, 20, 30, 40}
	data, err := bbox.MarshalJSON()
	if err != nil {
		t.Fatalf("failed to marshal BBox: %v", err)
	}

	expected := "[10,20,30,40]"
	if string(data) != expected {
		t.Errorf("expected %s, got %s", expected, string(data))
	}
}

func TestPixelToJSON(t *testing.T) {
	pixel := Pixel{5, 10}
	data, err := json.Marshal(pixel)
	if err != nil {
		t.Fatalf("failed to marshal Pixel: %v", err)
	}

	expected := "[5,10]"
	if string(data) != expected {
		t.Errorf("expected %s, got %s", expected, string(data))
	}
}

func TestCaptchaAutoResultToJSON(t *testing.T) {
	result := &CaptchaAutoResult{
		DetectedType: "text",
		TextScore:    8.5,
		SliderScore:  2.0,
		Confidence:   0.85,
		Reason:       "High text score",
	}

	jsonStr, err := result.ToJSON()
	if err != nil {
		t.Fatalf("ToJSON failed: %v", err)
	}

	// Verify it contains expected fields
	if !strings.Contains(jsonStr, "text") {
		t.Error("JSON should contain detected_type")
	}
	if !strings.Contains(jsonStr, "8.5") {
		t.Error("JSON should contain text_score")
	}
}

func TestLocateResultToJSON(t *testing.T) {
	result := &LocateResult{
		GroupID:        "50x50|255,255,255|...",
		BackgroundPath: "/path/to/bg.png",
		ImageSize:      [2]int{50, 50},
		Components:     []FontComponent{},
		Stats:          map[string]int{"component_count": 0},
	}

	jsonStr, err := result.ToJSON()
	if err != nil {
		t.Fatalf("ToJSON failed: %v", err)
	}

	if !strings.Contains(jsonStr, "group_id") {
		t.Error("JSON should contain group_id")
	}
}

func TestSliderLocateResultToJSON(t *testing.T) {
	result := &SliderLocateResult{
		GroupID:        "50x50|255,255,255|...",
		BackgroundPath: "/path/to/bg.png",
		ImageSize:      [2]int{50, 50},
		Gap:            nil,
		Stats:          map[string]int{"gap_found": 0},
	}

	jsonStr, err := result.ToJSON()
	if err != nil {
		t.Fatalf("ToJSON failed: %v", err)
	}

	if !strings.Contains(jsonStr, "group_id") {
		t.Error("JSON should contain group_id")
	}
	if !strings.Contains(jsonStr, "gap") {
		t.Error("JSON should contain gap")
	}
}
