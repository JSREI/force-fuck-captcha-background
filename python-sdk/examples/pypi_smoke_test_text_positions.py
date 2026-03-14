from __future__ import annotations

import argparse
import json
import shutil
from pathlib import Path

from PIL import Image, ImageDraw

import captcha_background_sdk
from captcha_background_sdk import CaptchaVisionSDK, CaptchaType


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Smoke test captcha-background-sdk from PyPI by creating synthetic background/captcha and detecting text."
    )
    parser.add_argument(
        "--work-dir",
        default="/tmp/captcha-background-sdk-smoke",
        help="Directory to write generated test files and outputs.",
    )
    return parser.parse_args()


def generate_background(path: Path, width: int = 320, height: int = 160) -> None:
    image = Image.new("RGBA", (width, height))
    pixels = image.load()
    for y in range(height):
        for x in range(width):
            r = 40 + ((x * 3 + y) % 60)
            g = 80 + ((x + y * 2) % 70)
            b = 120 + ((x * 2 + y * 3) % 80)
            pixels[x, y] = (r, g, b, 255)
    image.save(path)


def generate_captcha(background_path: Path, captcha_path: Path) -> None:
    image = Image.open(background_path).convert("RGBA")
    draw = ImageDraw.Draw(image)

    # Keep corners unchanged so group_id stays identical to background.
    # Draw outline glyph-like blocks to produce stable connected components.
    for x in (80, 110, 140, 170):
        draw.rectangle((x, 55, x + 16, 95), outline=(15, 15, 15, 255), width=2)
        draw.line((x + 4, 72, x + 12, 72), fill=(15, 15, 15, 255), width=2)

    image.save(captcha_path)


def main() -> None:
    args = parse_args()
    work_dir = Path(args.work_dir)

    if work_dir.exists():
        shutil.rmtree(work_dir)
    backgrounds_dir = work_dir / "backgrounds"
    backgrounds_dir.mkdir(parents=True, exist_ok=True)

    background_path = backgrounds_dir / "bg_demo.png"
    captcha_path = work_dir / "captcha_demo.png"
    output_json = work_dir / "text_positions_result.json"
    output_layer = work_dir / "text_layer.png"

    generate_background(background_path)
    generate_captcha(background_path, captcha_path)

    sdk = CaptchaVisionSDK(
        diff_threshold=18,
        font_min_component_pixels=8,
        text_min_width=3,
        text_min_height=3,
        text_min_fill_ratio=0.06,
        text_max_fill_ratio=0.95,
        connectivity=8,
    )
    index = sdk.build_background_index(str(backgrounds_dir), recursive=True)
    result = sdk.recognize_dict(
        str(captcha_path),
        captcha_type=CaptchaType.TEXT,
        include_pixels=False,
    )
    layer_result = sdk.extract_text_layer_dict(
        str(captcha_path),
        output_path=str(output_layer),
        crop_to_content=False,
    )

    output_json.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")

    summary = {
        "sdk_version": captcha_background_sdk.__version__,
        "sdk_alias_module_path": str(Path(captcha_background_sdk.__file__).resolve()),
        "sdk_module_path": str(Path(captcha_background_sdk.__file__).resolve()),
        "background_count": len(index),
        "group_id": result["group_id"],
        "region_count": result["stats"]["region_count"],
        "component_count": result["stats"]["component_count"],
        "text_pixel_count": result["stats"]["text_pixel_count"],
        "regions": result["regions"],
        "text_layer_output": layer_result["output_path"],
        "result_json": str(output_json.resolve()),
    }
    print(json.dumps(summary, ensure_ascii=False, indent=2))

    if result["stats"]["region_count"] < 1:
        raise SystemExit("Smoke test failed: no text regions detected.")


if __name__ == "__main__":
    main()
