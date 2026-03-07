# 滑块验证码 API

## 方法

- `recognize_slider_dict(captcha_path)`

## 输出结构

- `gap`:
  - `bbox`: 缺口框
  - `center`: 中心点
  - `pixel_count`: 缺口像素数量
- `stats`:
  - `region_count`
  - `diff_pixels`
  - `min_gap_pixels`
  - `diff_threshold`

## 与主 API 配合

在 `recognize_auto_dict` 中：

- `slider_payload.locate.gap` 是同类数据
- `slider_payload.gap_patch` 可直接拿到验证码中的缺口图块
- `slider_payload.background_patch` 可拿到背景中的对应图块
