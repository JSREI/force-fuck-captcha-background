# 背景能力 API（纹理 / deep / 倾斜）

## 这页解决什么问题

项目重点是背景能力，这里对应四类 API：

1. 背景恢复：找到验证码对应背景图。
2. 背景纹理统计：输出可解释数值。
3. 背景 deep 特征：输出固定顺序向量。
4. 前景倾斜估计：几何角度估计，不做 OCR。

## 1) 背景恢复

res = sdk.restore_background_by_captcha_dict(captcha_path="/path/to/captcha.png")

关键字段：

- group_id：匹配背景组
- background_path：背景图路径
- image_size：图尺寸
- output_path：如果传了输出路径，就会写文件

## 2) 背景纹理统计

metrics = sdk.analyze_background_texture_dict(
    captcha_path="/path/to/captcha.png",
    grid_rows=4,
    grid_cols=4,
    histogram_bins=16,
    edge_threshold=18.0,
)

关键字段：

- mean_intensity：平均灰度（0 到 255）
- std_intensity：灰度标准差（纹理波动）
- entropy：灰度信息熵（复杂度）
- edge_density：边缘密度（0 到 1）
- histogram：灰度直方图，长度 = histogram_bins
- grid_energy：网格能量，长度 = grid_rows * grid_cols，每项 0 到 1

## 3) 背景 deep 特征

deep = sdk.extract_background_deep_features_dict(
    captcha_path="/path/to/captcha.png",
    levels=(1, 2, 4),
    edge_threshold=18.0,
)

关键字段：

- levels：多尺度层级
- patch_count：patch 总数（一般为 sum(level^2)）
- vector_1d：特征向量
- stats.vector_length：向量长度

向量顺序固定：

1. 按 levels 从小到大。
2. 每层按行优先（row-major）遍历 patch。
3. 每个 patch 追加 3 个值：mean_norm、std_norm、edge_norm。

## 4) 前景倾斜估计（几何法）

skew = sdk.estimate_foreground_skew_dict(
    captcha_path="/path/to/captcha.png",
    min_pixels=20,
    max_abs_angle=45.0,
)

关键字段：

- angle_degrees：倾斜角度（度）
- confidence：置信度（0 到 1）
- pixel_count：参与估计像素数
- eigen_ratio：主轴显著性（越大方向越稳定）

说明：这里只做几何估计，不做字符识别。
