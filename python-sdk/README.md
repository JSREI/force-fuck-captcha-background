# Captcha Vision SDK (Python)

## Install

    pip install captcha-background-sdk

Recommended import namespace (neutral naming):

    from captcha_background_sdk import CaptchaType, CaptchaVisionSDK, GlyphRenderMode

Backward-compatible import namespace:

    from captcha_background_sdk import CaptchaRecognizer

From source:

    cd python-sdk
    pip install -e .

If you run scripts from repo root, add SDK dir to `PYTHONPATH`:

```bash
PYTHONPATH=python-sdk python python-sdk/examples/demo.py
```

## What this SDK does

1. Build `group_id -> full background image` mapping from your background directory.
2. For a new captcha image:
   - compute `group_id` from 4 corner RGB pixels,
   - find matching full background,
   - diff captcha vs background.
3. Provide **different APIs by captcha type**:
   - text captcha: extract connected components and text-region boxes (字体验证码),
   - slider captcha: locate the largest gap region and return bbox/center (缺口验证码).
4. For text captcha, provide:
   - text position detection (文字位置框),
   - text-pixel extraction to transparent PNG (文字像素扣图).
5. Provide local restore workflow (same capability as UI):
   - recursive scan captcha directory,
   - group by 4-corner bucket id,
   - per-pixel voting to restore backgrounds,
   - write background images + `summary.json`.
6. Provide background-only analysis APIs (no OCR dependency):
   - background texture metrics (histogram, entropy, edge density, grid energy),
   - multi-scale deep-style feature vector for downstream model services,
   - foreground skew estimation to support optional pre-rectification flow.

## group_id format

`{width}x{height}|lt_r,lt_g,lt_b|rt_r,rt_g,rt_b|lb_r,lb_g,lb_b|rb_r,rb_g,rb_b`

## API overview

### 1) Unified facade: `CaptchaVisionSDK(...)` (alias: `CaptchaRecognizer(...)`)

- `build_background_index(background_dir, recursive=True, exts=None)`
- `recognize_text(captcha_path, include_pixels=True)` (preferred for boxed text-region detection)
- `recognize_font(captcha_path, include_pixels=True)`
- `recognize_text_positions(captcha_path, include_pixels=True)`
- `extract_text_layer(captcha_path, output_path=None, crop_to_content=False)`
- `restore_background_by_captcha(captcha_path, output_path=None)`
- `extract_font_glyphs(captcha_path, include_pixels=True, include_rgba_2d=False)`
- `extract_font_glyph_features(captcha_path, target_width=32, target_height=32, keep_aspect_ratio=True)`
- `extract_font_glyph_slots(captcha_path, slot_count=5, target_width=32, target_height=32, ...)`
- `export_font_glyph_images(captcha_path, output_dir, file_prefix=None, render_mode=GlyphRenderMode.ORIGINAL, use_text_regions=False)`
- `export_text_glyph_images(captcha_path, output_dir, file_prefix=None, render_mode=GlyphRenderMode.ORIGINAL)`
- `batch_extract_font_glyph_features(input_dir, target_width=32, target_height=32, ...)`
- `export_font_glyph_dataset_npz(input_dir, output_npz_path, target_width=32, target_height=32, ...)`
- `recognize_slider(captcha_path)`
- `run_local_restore(input_dir, output_dir, clear_output_before_run=False, recursive=True, max_error_items=200, progress_callback=None, stop_checker=None)`
- `recognize_auto(captcha_path, background_dir=None, ...)`
- `recognize_auto_dict(captcha_path, background_dir=None, ...)`
- `analyze_background_texture(captcha_path, grid_rows=4, grid_cols=4, histogram_bins=16, edge_threshold=18.0)`
- `extract_background_deep_features(captcha_path, levels=(1,2,4), edge_threshold=18.0)`
- `estimate_foreground_skew(captcha_path, min_pixels=20, max_abs_angle=45.0)`
- `recognize(captcha_path, captcha_type=CaptchaType.TEXT/FONT/SLIDER, include_pixels=True)`

### 2) Text captcha API: `CaptchaTextLocator(...)` (alias: `CaptchaFontLocator(...)`)

- `locate_fonts(...)`
- `locate_fonts_dict(...)`
- `restore_background_by_captcha(...)`
- `restore_background_by_captcha_dict(...)`
- `extract_font_glyphs(...)`
- `extract_font_glyphs_dict(...)`
- `extract_font_glyph_features(...)`
- `extract_font_glyph_features_dict(...)`
- `extract_font_glyph_slots(...)`
- `extract_font_glyph_slots_dict(...)`
- `export_font_glyph_images(...)`
- `export_font_glyph_images_dict(...)`
- `export_text_glyph_images(...)`
- `export_text_glyph_images_dict(...)`
- `locate_text_positions(...)`
- `locate_text_positions_dict(...)`
- `extract_text_layer(...)`
- `extract_text_layer_dict(...)`

### 3) Slider captcha API: `CaptchaSliderLocator(...)`

- `locate_gap(...)`
- `locate_gap_dict(...)`

### 4) Local restore API (UI parity)

- `CaptchaRecognizer.run_local_restore(...)`
- `CaptchaRecognizer.run_local_restore_dict(...)`

## Core Production API (Type + Extraction in One Call)

If your workflow is:
1) input captcha image + background folder,
2) decide captcha type (text vs slider),
3) output extraction payload,

then use:

- `recognize_auto_dict(...)`

It returns:
- `detected_type`: `text` / `slider` / `unknown`
- `confidence`: decision confidence score `0..1`
- `text_payload.locate.regions`: text box list
- `text_payload.components.components`: raw connected components for text-like foreground
- `text_payload.text_layer`: optional extracted text-layer PNG
- `text_payload.glyph_images`: optional per-glyph cropped PNGs
- `slider_payload.locate.gap`: slider gap bbox/center
- `slider_payload.gap_patch`: optional cropped gap patch from captcha image
- `slider_payload.background_patch`: optional cropped patch from background image

Example:

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
print(auto["detected_type"], auto["confidence"])
```

## Quick examples

### Unified API

```python
from captcha_background_sdk import CaptchaType, CaptchaVisionSDK, GlyphRenderMode

sdk = CaptchaVisionSDK(
    diff_threshold=18,
    font_min_component_pixels=8,
    slider_min_gap_pixels=20,
    connectivity=8,
    # New: force-merge split fragments back to fixed-length glyph boxes.
    text_expected_region_count=4,
    text_force_merge_max_gap=28,
)
sdk.build_background_index("/your/full-background-dir")

font_result = sdk.recognize_font_dict("/your/new-font-captcha.png", include_pixels=True)
text_positions = sdk.recognize_text_positions_dict("/your/new-font-captcha.png", include_pixels=True)
text_layer = sdk.extract_text_layer_dict(
    "/your/new-font-captcha.png",
    output_path="./text_layer.png",
    crop_to_content=False,
)
restored_bg = sdk.restore_background_by_captcha_dict(
    "/your/new-font-captcha.png",
    output_path="./restored_background.png",
)
bg_texture = sdk.analyze_background_texture_dict(
    "/your/new-font-captcha.png",
    grid_rows=4,
    grid_cols=4,
    histogram_bins=16,
)
bg_deep = sdk.extract_background_deep_features_dict(
    "/your/new-font-captcha.png",
    levels=(1, 2, 4),
)
skew_estimate = sdk.estimate_foreground_skew_dict(
    "/your/new-font-captcha.png",
)
glyphs = sdk.extract_font_glyphs_dict(
    "/your/new-font-captcha.png",
    include_pixels=True,
    include_rgba_2d=False,
)
glyph_features = sdk.extract_font_glyph_features_dict(
    "/your/new-font-captcha.png",
    target_width=32,
    target_height=32,
)
glyph_slots = sdk.extract_font_glyph_slots_dict(
    "/your/new-font-captcha.png",
    slot_count=5,
    target_width=32,
    target_height=32,
)
glyph_images = sdk.export_font_glyph_images_dict(
    "/your/new-font-captcha.png",
    output_dir="./glyph_images",
)
text_glyph_images_original = sdk.export_text_glyph_images_dict(
    "/your/new-font-captcha.png",
    output_dir="./text_glyphs_original",
    render_mode=GlyphRenderMode.ORIGINAL,
)
text_glyph_images_black_transparent = sdk.export_text_glyph_images_dict(
    "/your/new-font-captcha.png",
    output_dir="./text_glyphs_black_transparent",
    render_mode=GlyphRenderMode.BLACK_ON_TRANSPARENT,
)
text_glyph_images_black_white = sdk.export_text_glyph_images_dict(
    "/your/new-font-captcha.png",
    output_dir="./text_glyphs_black_white",
    render_mode=GlyphRenderMode.BLACK_ON_WHITE,
)
slider_result = sdk.recognize_slider_dict("/your/new-slider-captcha.png")

print(font_result["stats"]["component_count"])
print(text_positions["stats"]["region_count"])
print(text_layer["output_path"])
print(restored_bg["background_path"], restored_bg["output_path"])
print(bg_texture["entropy"], bg_texture["edge_density"])
print(bg_deep["levels"], len(bg_deep["vector_1d"]))
print(skew_estimate["angle_degrees"], skew_estimate["confidence"])
print(glyphs["stats"]["glyph_count"])
print(glyphs["glyphs"][0]["rect_index"], glyphs["glyphs"][0]["bbox"])
print(glyphs["glyphs"][0]["bitmap_2d"])
print(len(glyph_features["glyph_features"][0]["vector_1d"]))  # 32*32
print(glyph_slots["stats"]["filled_slots"], glyph_slots["slot_count"])
print(glyph_images["stats"]["exported_count"], glyph_images["output_dir"])
print(text_glyph_images_original["stats"]["exported_count"])
print(text_glyph_images_black_transparent["stats"]["exported_count"])
print(text_glyph_images_black_white["stats"]["exported_count"])
print(slider_result["gap"])
```

### Batch glyph feature extraction

```python
batch = sdk.batch_extract_font_glyph_features_dict(
    input_dir="/path/to/captcha_dir",
    target_width=32,
    target_height=32,
    recursive=True,
    include_payload=False,
    output_json_path="./glyph_batch_summary.json",
)
print(batch["success_count"], batch["error_count"])
```

### Export training dataset (`npz`)

```python
dataset = sdk.export_font_glyph_dataset_npz_dict(
    input_dir="/path/to/captcha_dir",
    output_npz_path="./glyph_dataset.npz",
    target_width=32,
    target_height=32,
    recursive=True,
    output_json_path="./glyph_dataset_meta.json",
)
print(dataset["glyph_sample_count"], dataset["output_npz_path"])
```

### Local restore (same as UI "本地还原")

```python
from captcha_background_sdk import CaptchaType, CaptchaVisionSDK, GlyphRenderMode

sdk = CaptchaVisionSDK()
summary = sdk.run_local_restore_dict(
    input_dir="/path/to/captcha_images",
    output_dir="/path/to/output_backgrounds",
    clear_output_before_run=True,
    recursive=True,
    max_error_items=200,
)

print(summary["bucket_count"], summary["output_files"])
print(summary["summary_path"])
```

`run_local_restore(...)` will also refresh SDK background index from `output_dir`,
so you can call `recognize_*` APIs immediately after local restore.

### Batch full-dataset validation (with boxed outputs)

Run:

    python examples/batch_text_positions_validate.py \
      --backgrounds /path/to/full_backgrounds \
      --input-dir /path/to/raw_captcha_images \
      --output-dir /path/to/output_dir \
      --expected-region-count 4

This writes:
- `output_dir/boxed/*.png` (red rectangles on each captcha)
- `output_dir/per_image_json/*.json` (per-image detection payload)
- `output_dir/summary.json` (distribution + top problematic cases)

### Separate APIs by captcha type

```python
from captcha_background_sdk import CaptchaTextLocator, CaptchaGapLocator

background_dir = "/your/full-background-dir"

font_sdk = CaptchaTextLocator()
font_sdk.build_background_index(background_dir)
font_result = font_sdk.locate_fonts_dict("/your/new-font-captcha.png")

slider_sdk = CaptchaGapLocator()
slider_sdk.build_background_index(background_dir)
slider_result = slider_sdk.locate_gap_dict("/your/new-slider-captcha.png")

text_positions = font_sdk.locate_text_positions_dict("/your/new-font-captcha.png", include_pixels=True)
text_layer = font_sdk.extract_text_layer_dict(
    "/your/new-font-captcha.png",
    output_path="./text_layer.png",
    crop_to_content=True,
)
```

## Notes

- If captcha size and matched background size differ, SDK raises an error.
- If `group_id` is not found, SDK raises `KeyError`.
- Slider result `gap` may be `null` when no connected region reaches `min_gap_pixels`.
- Text position detection uses exact-color connected components plus size/fill filtering and near-neighbor merge.
- Text position detection is now color-insensitive and can enforce fixed-length output via `text_expected_region_count` (default `4`).
- `extract_text_layer(...)` returns transparent image with only text pixels preserved.
- Glyph export `render_mode` options:
  - `original`: keep source RGBA colors
  - `black_on_transparent`: black glyph, transparent background
  - `black_on_white`: black glyph, white background
  - `white_on_black`: white glyph, black background
- `export_font_glyph_dataset_npz(...)` requires `numpy` (`pip install numpy`).
- You can tune:
  - increase `diff_threshold` to reduce tiny color jitter,
  - increase `font_min_component_pixels` / `min_component_pixels` to suppress font noise,
  - increase `slider_min_gap_pixels` / `min_gap_pixels` to suppress slider noise,
  - tune `text_min_width / text_min_height / text_min_fill_ratio / text_max_fill_ratio` for text boxes.
