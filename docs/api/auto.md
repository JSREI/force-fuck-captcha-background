# 自动识别主 API

## 方法签名

```python
recognize_auto_dict(
    captcha_path: str,
    background_dir: Optional[str] = None,
    include_pixels: bool = True,
    text_layer_output_path: Optional[str] = None,
    text_glyph_output_dir: Optional[str] = None,
    slider_gap_output_path: Optional[str] = None,
    slider_background_patch_output_path: Optional[str] = None,
    slider_patch_padding: int = 2,
) -> Dict
```

## 参数说明

- `captcha_path`: 输入验证码图片路径。
- `background_dir`: 背景目录；传入时会自动建立背景索引。
- `include_pixels`: 是否在文本结果中保留像素坐标。
- `text_layer_output_path`: 文本图层抠图输出路径（可选）。
- `text_glyph_output_dir`: 逐字抠图输出目录（可选）。
- `slider_gap_output_path`: 从验证码中抠缺口 patch 的输出路径（可选）。
- `slider_background_patch_output_path`: 从背景中抠对应 patch 的输出路径（可选）。
- `slider_patch_padding`: 缺口 patch 额外边缘扩展像素。

## 核心输出字段

- `detected_type`: `text` / `slider` / `unknown`
- `confidence`: 判定置信度 `0..1`
- `reason`: 判定解释字符串
- `text_score`, `slider_score`: 两类打分
- `text_payload`:
  - `locate`: 文本区域结果（`regions` + `stats`）
  - `components`: 连通域组件结果
  - `text_layer`: 可选图层抠图结果
  - `glyph_images`: 可选逐字图结果
- `slider_payload`:
  - `locate.gap`: 缺口位置（`bbox`/`center`/`pixel_count`）
  - `gap_patch`: 可选验证码 patch 输出
  - `background_patch`: 可选背景 patch 输出
- `stats`: 过程统计（region/component/gap 的数量和尺寸）

## 坐标与数值约定

1. bbox 坐标轴：
- 格式 `[left, top, right, bottom]`
- `right` 与 `bottom` 为包含端点

2. center：
- `((left + right) // 2, (top + bottom) // 2)`

3. 置信度：
- `confidence = |text_score - slider_score| / (|text_score| + |slider_score|)`（归一化后 `0..1`）

## 示例

```python
auto = sdk.recognize_auto_dict(
    captcha_path="/path/to/captcha.png",
    background_dir="/path/to/backgrounds",
    include_pixels=True,
    text_layer_output_path="./auto_text_layer.png",
    text_glyph_output_dir="./auto_text_glyphs",
    slider_gap_output_path="./auto_slider_gap_patch.png",
    slider_background_patch_output_path="./auto_slider_background_patch.png",
    slider_patch_padding=2,
)

if auto["detected_type"] == "text":
    regions = auto["text_payload"]["locate"]["regions"]
elif auto["detected_type"] == "slider":
    gap = auto["slider_payload"]["locate"]["gap"]
else:
    print("fallback:", auto["reason"])
```
