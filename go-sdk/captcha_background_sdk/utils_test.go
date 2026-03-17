package captcha_background_sdk

import (
	"testing"
)

func TestIntPtr(t *testing.T) {
	val := 42
	ptr := IntPtr(val)

	if ptr == nil {
		t.Fatal("expected non-nil pointer")
	}

	if *ptr != val {
		t.Errorf("expected %d, got %d", val, *ptr)
	}

	// Modify original, pointer should still point to original value
	val = 100
	if *ptr != 42 {
		t.Error("pointer value changed unexpectedly")
	}
}

func TestFloat64Ptr(t *testing.T) {
	val := 3.14
	ptr := Float64Ptr(val)

	if ptr == nil {
		t.Fatal("expected non-nil pointer")
	}

	if *ptr != val {
		t.Errorf("expected %f, got %f", val, *ptr)
	}
}

func TestStringPtr(t *testing.T) {
	val := "hello"
	ptr := StringPtr(val)

	if ptr == nil {
		t.Fatal("expected non-nil pointer")
	}

	if *ptr != val {
		t.Errorf("expected %s, got %s", val, *ptr)
	}
}

func TestBoolPtr(t *testing.T) {
	val := true
	ptr := BoolPtr(val)

	if ptr == nil {
		t.Fatal("expected non-nil pointer")
	}

	if *ptr != val {
		t.Errorf("expected %v, got %v", val, *ptr)
	}
}
