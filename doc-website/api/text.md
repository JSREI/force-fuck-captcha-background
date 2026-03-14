# 文本验证码 API（只讲可落地字段）

## 解决什么问题

当验证码是文字型时，你通常需要：

1. 文字区域坐标（bbox）。
2. 文本图层抠图。
3. 逐字导出图片。

## 常用 API

| API | 作用 | 关键输出 |
| --- | --- | --- |
| recognize_text_positions_dict(captcha_path, include_pixels=True) | 找文字区域 | regions[] stats |
| extract_text_layer_dict(captcha_path, output_path=None, crop_to_content=False) | 导出文字层 | text_bbox text_pixel_count output_path |
| export_text_glyph_images_dict(captcha_path, output_dir, render_mode="original") | 导出逐字图 | glyph_images[] output_dir |
| recognize_font_dict(captcha_path, include_pixels=True) | 连通域组件（诊断向） | components[] stats.component_count |

## 字段解释

### recognize_text_positions_dict

- regions[i].bbox：文字区域框 [left, top, right, bottom]
- regions[i].pixel_count：区域像素数
- regions[i].component_count：区域内组件数
- regions[i].score：区域分数
- stats.region_count：区域总数
- stats.text_pixel_count：文本像素总数

### extract_text_layer_dict

- text_bbox：文字整体包围框
- text_pixel_count：文本层像素数
- output_path：导出路径（没传就为 null）

### export_text_glyph_images_dict

- glyph_images[i].image_path：字块图片路径
- glyph_images[i].bbox：字块 bbox
- glyph_images[i].width / height：字块尺寸
- stats.glyph_count：导出字块数量

## 坐标约定

1. 原点左上角 (0,0)。
2. x 向右，y 向下。
3. bbox 为包含端点。
