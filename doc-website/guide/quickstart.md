# 快速开始

## 这套 SDK 解决什么问题

业务里通常有两种验证码：

1. 文本验证码：你要拿到文字位置、文字抠图。
2. 滑块验证码：你要拿到缺口位置、缺口图块。

以前的痛点是：调用方自己先判断类型，流程复杂且容易误判。
现在用一个 API 直接搞定：`recognize_auto_dict(...)`。

## 一次调用就够（建议线上入口）

```python
from captcha_background_sdk import CaptchaVisionSDK

sdk = CaptchaVisionSDK()

result = sdk.recognize_auto_dict(
    captcha_path="/path/to/captcha.png",
    background_dir="/path/to/backgrounds",
    include_pixels=True,
    text_layer_output_path="./auto_text_layer.png",
    text_glyph_output_dir="./auto_text_glyphs",
    slider_gap_output_path="./auto_slider_gap_patch.png",
    slider_background_patch_output_path="./auto_slider_background_patch.png",
    slider_patch_padding=2,
)
```

## 你最关心的字段

1. `result["detected_type"]`
- `text` / `slider` / `unknown`

2. `result["confidence"]`
- 判定置信度，范围 `0..1`

3. `result["reason"]`
- 这次为何判成 text 或 slider

4. 文本结果
- `result["text_payload"]["locate"]["regions"]` 文本框
- `result["text_payload"]["text_layer"]` 文本抠图（可选）
- `result["text_payload"]["glyph_images"]` 逐字图（可选）

5. 滑块结果
- `result["slider_payload"]["locate"]["gap"]` 缺口 bbox/center
- `result["slider_payload"]["gap_patch"]` 验证码中的缺口块（可选）
- `result["slider_payload"]["background_patch"]` 背景对应块（可选）

## 坐标怎么理解

- `bbox = [left, top, right, bottom]`
- 坐标原点左上角 `(0,0)`，x 向右，y 向下
- `right/bottom` 为包含端点（inclusive）
