# 文本验证码 API

## 常用方法

- `recognize_text_positions_dict(captcha_path, include_pixels=True)`
- `extract_text_layer_dict(captcha_path, output_path=None, crop_to_content=False)`
- `export_text_glyph_images_dict(captcha_path, output_dir, render_mode=...)`
- `recognize_font_dict(captcha_path, include_pixels=True)`

## 输出重点

### `recognize_text_positions_dict`

- `regions`: 每个文本区域（bbox、pixel_count、score、pixels）
- `stats`:
  - `region_count`
  - `text_pixel_count`
  - `component_count`
  - `diff_pixels`

### `recognize_font_dict`

- `components`: 连通域组件（更接近字块级）
- `stats.component_count`

## 推荐组合

1. 文本位置框：
- 用 `recognize_text_positions_dict`

2. 文本像素抠图：
- 用 `extract_text_layer_dict`

3. 每字导出：
- 用 `export_text_glyph_images_dict`
