# 类型路由策略

`recognize_auto(_dict)` 内部会同时计算文本与滑块证据，然后给出：

- `text_score`
- `slider_score`
- `detected_type`
- `confidence`
- `reason`

## 判定逻辑（概要）

1. 文本证据：
- 文本区域数量（`text_region_count`）
- 文本像素量（`text_pixel_count`）
- 文本连通域组件（`font_component_count`/`font_component_pixels`）

2. 滑块证据：
- 缺口像素量（`slider_gap_pixels`）
- 缺口区域数量（`slider_region_count`）
- 缺口宽高比（`slider_gap_width`/`slider_gap_height`）

3. 最终决策：
- 取 `text_score` 与 `slider_score` 较高方。
- `confidence = |text_score - slider_score| / (|text_score| + |slider_score|)`。
- 若证据不足，返回 `unknown`。

## 建议

- 把 `reason` 和 `stats` 打到日志中，便于回放与阈值调优。
- 若业务需要极低误判，可在 `confidence` 低于阈值时走二次判定。
