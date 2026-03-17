package captcha_background_sdk

// IntPtr returns a pointer to an int value.
// Useful for creating pointers to literal integers for configuration options.
// Example: config.ExpectedRegionCount = IntPtr(4)
func IntPtr(i int) *int {
	return &i
}

// Float64Ptr returns a pointer to a float64 value.
// Useful for creating pointers to literal floats for configuration options.
// Example: config.Threshold = Float64Ptr(0.5)
func Float64Ptr(f float64) *float64 {
	return &f
}

// StringPtr returns a pointer to a string value.
// Useful for creating pointers to literal strings for configuration options.
// Example: config.Mode = StringPtr("text")
func StringPtr(s string) *string {
	return &s
}

// BoolPtr returns a pointer to a bool value.
// Useful for creating pointers to literal booleans for configuration options.
// Example: config.Recursive = BoolPtr(true)
func BoolPtr(b bool) *bool {
	return &b
}
