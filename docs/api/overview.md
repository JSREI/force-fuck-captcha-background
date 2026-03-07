# API 总览

推荐使用统一入口 `CaptchaVisionSDK`（别名 `CaptchaRecognizer`）。

## 生产主入口

- `recognize_auto(...)`
- `recognize_auto_dict(...)`

## 文本验证码 API

- `recognize_text_positions(_dict)`
- `extract_text_layer(_dict)`
- `export_text_glyph_images(_dict)`
- `recognize_font(_dict)`（连通域组件视角）

## 滑块验证码 API

- `recognize_slider(_dict)`（返回缺口 bbox/center）

## 背景能力 API

- `restore_background_by_captcha(_dict)`
- `analyze_background_texture(_dict)`
- `extract_background_deep_features(_dict)`
- `estimate_foreground_skew(_dict)`

## 本地还原 API

- `run_local_restore(_dict)`

## 数据结构

核心返回结构见：

- `CaptchaAutoResult`
- `TextLocateResult`
- `SliderLocateResult`
- `BackgroundTextureResult`
- `BackgroundDeepFeatureResult`
- `ForegroundSkewEstimateResult`
