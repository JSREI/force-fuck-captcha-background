# 滑块验证码 API（缺口定位）

## 解决什么问题

当验证码是滑块型时，你关心的是：

1. 缺口在哪里（bbox）。
2. 缺口中心点是多少（center）。
3. 要不要导出缺口 patch 给后续训练或对比。

## 主 API

gap = sdk.recognize_slider_dict(captcha_path="/path/to/captcha.png")

## 关键输出字段

- gap.bbox：缺口框 [left, top, right, bottom]
- gap.center：缺口中心 [cx, cy]
- gap.pixel_count：缺口像素数
- stats.region_count：差异区域数量
- stats.diff_pixels：总差异像素
- stats.min_gap_pixels：最小缺口像素阈值
- stats.diff_threshold：差分阈值

## 在自动主 API 里怎么拿

当 recognize_auto_dict 判定为 slider：

- result["slider_payload"]["locate"]["gap"]：缺口定位数据
- result["slider_payload"]["gap_patch"]：验证码中的缺口 patch（可选）
- result["slider_payload"]["background_patch"]：背景中的对应 patch（可选）

## 坐标约定

1. 原点左上角 (0,0)。
2. bbox 为包含端点。
3. center = ((left + right)//2, (top + bottom)//2)。
