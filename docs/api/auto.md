# 自动识别主 API（线上建议只接这个）

## 解决什么问题

以前你要先判断验证码类型，再调不同接口。  
现在一条调用 recognize_auto_dict 直接返回：

1. 类型判定：text / slider / unknown
2. 判定置信度：confidence
3. 分支结果：text_payload 或 slider_payload

## 调用示例

from captcha_background_sdk import CaptchaVisionSDK

sdk = CaptchaVisionSDK()

result = sdk.recognize_auto_dict(
    captcha_path="/path/to/captcha.png",
    background_dir="/path/to/backgrounds",
    include_pixels=True,
    text_layer_output_path="./out/text_layer.png",
    text_glyph_output_dir="./out/text_glyphs",
    slider_gap_output_path="./out/slider_gap_patch.png",
    slider_background_patch_output_path="./out/slider_bg_patch.png",
    slider_patch_padding=2,
)

## 顶层输出字段（必须看懂）

| 字段 | 含义 | 常见取值 |
| --- | --- | --- |
| detected_type | 本次判定类型 | text / slider / unknown |
| confidence | 判定置信度，0 到 1 | 例如 0.82 |
| reason | 判定原因（建议打日志） | 字符串 |
| text_score | 文本证据分（内部打分） | 浮点数 |
| slider_score | 滑块证据分（内部打分） | 浮点数 |
| group_id | 匹配到的背景组 ID | 字符串 |
| background_path | 匹配到的背景图路径 | 字符串 |
| image_size | 验证码尺寸 | [width, height] |

## text_payload（判定 text 时重点使用）

1. text_payload.locate
- regions[]：每个文本区域
- regions[i].bbox：区域框
- regions[i].pixel_count：该区域像素数
- regions[i].score：区域分数
- stats.region_count：区域数量
- stats.text_pixel_count：文本像素总量

2. text_payload.components
- 连通域组件（诊断用）
- components[].bbox
- components[].pixel_count

3. text_payload.text_layer（传 text_layer_output_path 才会有）
- text_bbox：文本整体框
- text_pixel_count：文本层像素
- output_path：导出路径

4. text_payload.glyph_images（传 text_glyph_output_dir 才会有）
- glyph_images[]：逐字图片列表
- glyph_images[i].image_path：图片路径
- glyph_images[i].bbox：字块坐标

## slider_payload（判定 slider 时重点使用）

1. slider_payload.locate.gap
- bbox：缺口框
- center：缺口中心点
- pixel_count：缺口像素数

2. slider_payload.gap_patch（传 slider_gap_output_path 才会有）
- 从验证码图裁的缺口 patch
- 字段：bbox patch_size output_path

3. slider_payload.background_patch（传 slider_background_patch_output_path 才会有）
- 从背景图裁的对应 patch
- 字段：bbox patch_size output_path

## 坐标轴和数值定义（重点）

1. 坐标系
- 原点左上角 (0,0)。
- x 向右，y 向下。

2. bbox
- 格式 [left, top, right, bottom]。
- right / bottom 是包含端点。

3. center
- center = ((left + right)//2, (top + bottom)//2)。

4. confidence
- 公式：abs(text_score - slider_score) / (abs(text_score) + abs(slider_score))
- 结果已归一化到 0 到 1。
