from __future__ import annotations

import json
from pathlib import Path

from captcha_background_sdk import CaptchaVisionSDK, GlyphRenderMode


def main() -> None:
    # Replace with your real paths:
    backgrounds_dir = "/path/to/full_backgrounds"
    captcha_dir_for_local_restore = "/path/to/captcha_images"
    local_restore_output_dir = "/path/to/local_restore_output"
    font_captcha_path = "/path/to/new_font_captcha.png"
    slider_captcha_path = "/path/to/new_slider_captcha.png"
    font_output_json = Path("./font_locate_result.json")
    text_positions_output_json = Path("./text_positions_result.json")
    text_layer_output_png = Path("./text_layer.png")
    text_layer_output_json = Path("./text_layer_result.json")
    restored_background_png = Path("./restored_background.png")
    restored_background_json = Path("./restored_background_result.json")
    glyphs_json = Path("./font_glyphs_result.json")
    glyph_features_json = Path("./font_glyph_features_result.json")
    glyph_slots_json = Path("./font_glyph_slots_result.json")
    glyph_images_dir = Path("./glyph_images")
    text_glyph_images_original_dir = Path("./text_glyph_images_original")
    text_glyph_images_black_transparent_dir = Path("./text_glyph_images_black_transparent")
    text_glyph_images_black_white_dir = Path("./text_glyph_images_black_white")
    glyph_batch_json = Path("./font_glyph_batch_summary.json")
    glyph_dataset_npz = Path("./glyph_dataset.npz")
    glyph_dataset_meta_json = Path("./glyph_dataset_meta.json")
    slider_output_json = Path("./slider_locate_result.json")

    sdk = CaptchaVisionSDK(
        diff_threshold=18,
        font_min_component_pixels=8,
        slider_min_gap_pixels=20,
        connectivity=8,
        text_min_width=3,
        text_min_height=3,
        text_min_fill_ratio=0.06,
        text_max_fill_ratio=0.95,
        text_expected_region_count=4,
        text_force_merge_max_gap=28,
    )
    index = sdk.build_background_index(backgrounds_dir, recursive=True)
    print(f"indexed backgrounds: {len(index)}")

    font_result = sdk.recognize_font_dict(font_captcha_path, include_pixels=True)
    font_output_json.write_text(json.dumps(font_result, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"saved: {font_output_json}")
    print(f"font group_id: {font_result['group_id']}")
    print(f"font component_count: {font_result['stats']['component_count']}")

    text_positions = sdk.recognize_text_positions_dict(font_captcha_path, include_pixels=True)
    text_positions_output_json.write_text(
        json.dumps(text_positions, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    print(f"saved: {text_positions_output_json}")
    print(f"text region_count: {text_positions['stats']['region_count']}")

    text_layer = sdk.extract_text_layer_dict(
        font_captcha_path,
        output_path=str(text_layer_output_png),
        crop_to_content=False,
    )
    text_layer_output_json.write_text(json.dumps(text_layer, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"saved: {text_layer_output_json}")
    print(f"text layer png: {text_layer.get('output_path')}")

    restored_background = sdk.restore_background_by_captcha_dict(
        font_captcha_path,
        output_path=str(restored_background_png),
    )
    restored_background_json.write_text(
        json.dumps(restored_background, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    print(f"saved: {restored_background_json}")
    print(f"restored background source: {restored_background.get('background_path')}")
    print(f"restored background output: {restored_background.get('output_path')}")

    glyphs = sdk.extract_font_glyphs_dict(
        font_captcha_path,
        include_pixels=True,
        include_rgba_2d=False,
    )
    glyphs_json.write_text(json.dumps(glyphs, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"saved: {glyphs_json}")
    print(f"glyph_count: {glyphs['stats']['glyph_count']}")
    if glyphs.get('glyphs'):
        first = glyphs['glyphs'][0]
        print(f"first glyph rect_index: {first['rect_index']}, bbox: {first['bbox']}")

    glyph_features = sdk.extract_font_glyph_features_dict(
        font_captcha_path,
        target_width=32,
        target_height=32,
        keep_aspect_ratio=True,
    )
    glyph_features_json.write_text(json.dumps(glyph_features, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"saved: {glyph_features_json}")
    if glyph_features.get('glyph_features'):
        first_feature = glyph_features['glyph_features'][0]
        print(f"first feature vector length: {len(first_feature['vector_1d'])}")

    glyph_slots = sdk.extract_font_glyph_slots_dict(
        font_captcha_path,
        slot_count=5,
        target_width=32,
        target_height=32,
        keep_aspect_ratio=True,
    )
    glyph_slots_json.write_text(json.dumps(glyph_slots, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"saved: {glyph_slots_json}")
    print(f"glyph slots filled/total: {glyph_slots['stats']['filled_slots']}/{glyph_slots['slot_count']}")

    glyph_images = sdk.export_font_glyph_images_dict(
        font_captcha_path,
        output_dir=str(glyph_images_dir),
    )
    print(f"glyph images exported: {glyph_images['stats']['exported_count']}, dir={glyph_images['output_dir']}")

    text_glyphs_original = sdk.export_text_glyph_images_dict(
        font_captcha_path,
        output_dir=str(text_glyph_images_original_dir),
        render_mode=GlyphRenderMode.ORIGINAL,
    )
    print(
        f"text glyph images (original) exported: "
        f"{text_glyphs_original['stats']['exported_count']}, "
        f"dir={text_glyphs_original['output_dir']}"
    )
    text_glyphs_black_transparent = sdk.export_text_glyph_images_dict(
        font_captcha_path,
        output_dir=str(text_glyph_images_black_transparent_dir),
        render_mode=GlyphRenderMode.BLACK_ON_TRANSPARENT,
    )
    print(
        f"text glyph images (black_on_transparent) exported: "
        f"{text_glyphs_black_transparent['stats']['exported_count']}, "
        f"dir={text_glyphs_black_transparent['output_dir']}"
    )
    text_glyphs_black_white = sdk.export_text_glyph_images_dict(
        font_captcha_path,
        output_dir=str(text_glyph_images_black_white_dir),
        render_mode=GlyphRenderMode.BLACK_ON_WHITE,
    )
    print(
        f"text glyph images (black_on_white) exported: "
        f"{text_glyphs_black_white['stats']['exported_count']}, "
        f"dir={text_glyphs_black_white['output_dir']}"
    )

    slider_result = sdk.recognize_slider_dict(slider_captcha_path)
    slider_output_json.write_text(json.dumps(slider_result, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"saved: {slider_output_json}")
    print(f"slider group_id: {slider_result['group_id']}")
    print(f"slider gap: {slider_result['gap']}")

    local_restore_summary = sdk.run_local_restore_dict(
        input_dir=captcha_dir_for_local_restore,
        output_dir=local_restore_output_dir,
        clear_output_before_run=True,
        recursive=True,
        max_error_items=200,
    )
    print(f"local restore bucket_count: {local_restore_summary['bucket_count']}")
    print(f"local restore output_files: {local_restore_summary['output_files']}")
    print(f"local restore summary_path: {local_restore_summary['summary_path']}")

    glyph_batch = sdk.batch_extract_font_glyph_features_dict(
        input_dir=captcha_dir_for_local_restore,
        target_width=32,
        target_height=32,
        recursive=True,
        include_payload=False,
        limit=20,
        output_json_path=str(glyph_batch_json),
    )
    print(f"saved: {glyph_batch_json}")
    print(f"glyph batch success/error: {glyph_batch['success_count']}/{glyph_batch['error_count']}")

    glyph_dataset = sdk.export_font_glyph_dataset_npz_dict(
        input_dir=captcha_dir_for_local_restore,
        output_npz_path=str(glyph_dataset_npz),
        target_width=32,
        target_height=32,
        recursive=True,
        limit=100,
        output_json_path=str(glyph_dataset_meta_json),
    )
    print(f"saved: {glyph_dataset_npz}")
    print(f"saved: {glyph_dataset_meta_json}")
    print(f"glyph dataset sample_count: {glyph_dataset['glyph_sample_count']}")


if __name__ == "__main__":
    main()
