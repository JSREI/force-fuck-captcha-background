# Python SDK Changelog

## [0.2.1] - 2024-03-17

### Added
- Comprehensive test suite with pytest
- CI/CD workflow for automated testing
- Code quality tools: black, ruff, mypy
- Makefile for common development tasks
- Type hints improvements

### Changed
- Updated pyproject.toml with tool configurations

## [0.2.0] - 2024-03-08

### Added
- Unified `CaptchaRecognizer` facade API
- `recognize_auto` for automatic captcha type detection
- `recognize_auto_dict` with full output options
- Background texture analysis API (`analyze_background_texture`)
- Background deep feature extraction (`extract_background_deep_features`)
- Foreground skew estimation (`estimate_foreground_skew`)
- Font glyph slots extraction (`extract_font_glyph_slots`)
- `recognize_text_positions` API with improved text detection
- `recognize_text` alias for text position detection
- `extract_text_layer_dict` method
- `run_local_restore_dict` method

### Changed
- Improved text region detection with force merge
- Better text position accuracy
- Enhanced batch processing with error handling

## [0.1.0] - 2024-03-06

### Added
- Initial release
- Background index building
- Text captcha localization (`CaptchaFontLocator`)
- Slider captcha gap detection (`CaptchaSliderLocator`)
- Font glyph extraction and features
- Local background restoration
- Batch glyph feature extraction
- Dataset export to NPZ format
- Glyph image export with render modes
