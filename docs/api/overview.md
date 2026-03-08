# API 总览（先看这页）

## 这个 SDK 主要解决什么问题

你给 SDK 一张验证码图，它帮你做三件事：

1. 自动判断这是文字验证码还是滑块验证码。
2. 如果是文字，返回文字区域、文本抠图、逐字抠图。
3. 如果是滑块，返回缺口位置、中心点、可选缺口 patch。

本项目聚焦在背景匹配和前景结构识别。  
不做 OCR 文本识别，不输出“字符内容是 A/B/C”。

## 建议怎么接

1. 线上主入口只接 recognize_auto_dict。
2. 按 detected_type 走分支：
- text：用 text_payload
- slider：用 slider_payload
3. 需要细控制时，再单独调用子 API。

## API 清单（按业务）

| API | 解决问题 | 必传输入 | 关键输出（你最常用） |
| --- | --- | --- | --- |
| recognize_auto_dict | 自动判定 text/slider 并返回对应结果 | captcha_path | detected_type confidence text_payload slider_payload |
| recognize_text_positions_dict | 找文字区域框 | captcha_path | regions[].bbox regions[].pixel_count |
| extract_text_layer_dict | 导出文字层抠图 | captcha_path | text_bbox text_pixel_count output_path |
| export_text_glyph_images_dict | 导出逐字图 | captcha_path output_dir | glyph_images[].image_path glyph_images[].bbox |
| recognize_slider_dict | 找滑块缺口位置 | captcha_path | gap.bbox gap.center gap.pixel_count |
| restore_background_by_captcha_dict | 根据验证码恢复匹配背景 | captcha_path | group_id background_path |
| analyze_background_texture_dict | 输出背景纹理统计值 | captcha_path | mean_intensity std_intensity entropy edge_density |
| extract_background_deep_features_dict | 输出多尺度背景向量 | captcha_path | levels patch_count vector_1d |
| estimate_foreground_skew_dict | 估计前景倾斜角度（几何法） | captcha_path | angle_degrees confidence |
| run_local_restore_dict | 批量还原本地背景库 | input_dir output_dir | bucket_count output_files summary_path |

## 坐标轴和数值怎么读

1. bbox = [left, top, right, bottom]
- 原点在左上角 (0,0)。
- x 向右增大，y 向下增大。
- right 和 bottom 是包含端点。

2. center = [cx, cy]
- 由 bbox 计算得到：(left + right)/2, (top + bottom)/2 的整数点。

3. confidence
- 范围 0 到 1，越接近 1 说明判定越稳定。
