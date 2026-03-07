# 背景分析 API

## 1) 背景恢复

- `restore_background_by_captcha_dict(captcha_path, output_path=None)`

返回 `group_id`、`background_path`、`image_size`、`output_path`。

## 2) 背景纹理统计

- `analyze_background_texture_dict(...)`

关键数值：

- `mean_intensity`（0..255）
- `std_intensity`（纹理波动）
- `entropy`（灰度信息熵）
- `edge_density`（边缘密度）
- `histogram`（长度 = bins）
- `grid_energy`（长度 = rows * cols）

## 3) 背景 deep 特征

- `extract_background_deep_features_dict(levels=(1,2,4), ...)`

关键数值：

- `levels`: 多尺度分块层级
- `patch_count`: 所有层级 patch 数量和
- `vector_1d`: 固定顺序特征向量

向量顺序：

1. 按 `levels` 从小到大
2. 每层按 row-major patch 顺序
3. 每个 patch 输出 3 维：
   - mean_norm
   - std_norm
   - edge_norm

## 4) 前景倾斜估计（几何法）

- `estimate_foreground_skew_dict(...)`

输出：

- `angle_degrees`
- `confidence`
- `pixel_count`
- `eigen_ratio`

说明：该方法是像素几何估计，不做 OCR 字体识别。
