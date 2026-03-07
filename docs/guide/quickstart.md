# 快速开始

## 1. 安装 SDK

```bash
pip install captcha-background-sdk
```

## 2. 最小调用（主流程）

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

print(result["detected_type"], result["confidence"])
```

## 3. 输出分支

- `detected_type == "text"`: 优先读取 `text_payload`。
- `detected_type == "slider"`: 优先读取 `slider_payload`。
- `detected_type == "unknown"`: 使用 `reason` 和 `text_score/slider_score` 进行兜底处理。

## 4. 坐标定义

- 所有 bbox 均为 `[left, top, right, bottom]`。
- 坐标原点在左上角 `(0,0)`，`x` 向右，`y` 向下。
- `right/bottom` 为包含端点（inclusive）。
