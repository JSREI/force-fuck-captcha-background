from __future__ import annotations

import argparse
import json
from pathlib import Path

from captcha_background_sdk import CaptchaVisionSDK


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Detect text positions from a new font captcha image using existing full backgrounds."
    )
    parser.add_argument("--backgrounds", required=True, help="Directory containing full background images.")
    parser.add_argument("--captcha", required=True, help="Path to one new font captcha image.")
    parser.add_argument(
        "--output",
        default="./text_positions_result.json",
        help="Output JSON path for detection result.",
    )
    parser.add_argument(
        "--include-pixels",
        action="store_true",
        help="Include raw pixel coordinate lists in each text region.",
    )
    parser.add_argument("--diff-threshold", type=int, default=18, help="Pixel diff threshold.")
    parser.add_argument(
        "--font-min-component-pixels",
        type=int,
        default=8,
        help="Minimum connected pixels for one component.",
    )
    parser.add_argument("--text-min-width", type=int, default=3)
    parser.add_argument("--text-min-height", type=int, default=3)
    parser.add_argument("--text-min-fill-ratio", type=float, default=0.06)
    parser.add_argument("--text-max-fill-ratio", type=float, default=0.95)
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    backgrounds_dir = Path(args.backgrounds)
    captcha_path = Path(args.captcha)
    output_json = Path(args.output)

    sdk = CaptchaVisionSDK(
        diff_threshold=args.diff_threshold,
        font_min_component_pixels=args.font_min_component_pixels,
        text_min_width=args.text_min_width,
        text_min_height=args.text_min_height,
        text_min_fill_ratio=args.text_min_fill_ratio,
        text_max_fill_ratio=args.text_max_fill_ratio,
        connectivity=8,
    )

    index = sdk.build_background_index(str(backgrounds_dir), recursive=True)
    print(f"indexed backgrounds: {len(index)}")

    result = sdk.recognize_text_positions_dict(
        str(captcha_path),
        include_pixels=args.include_pixels,
    )

    output_json.parent.mkdir(parents=True, exist_ok=True)
    output_json.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"saved json: {output_json.resolve()}")
    print(f"group_id: {result['group_id']}")
    print(f"region_count: {result['stats']['region_count']}")
    print(f"component_count: {result['stats']['component_count']}")

    regions = result["regions"]
    for idx, region in enumerate(regions, start=1):
        left, top, right, bottom = region["bbox"]
        width = right - left + 1
        height = bottom - top + 1
        print(
            f"[{idx}] bbox={region['bbox']} size={width}x{height} "
            f"pixels={region['pixel_count']} components={region['component_count']} "
            f"score={region['score']:.4f}"
        )

    if not regions:
        raise SystemExit(
            "No text region detected. Check that captcha size/group_id matches backgrounds and tune thresholds."
        )


if __name__ == "__main__":
    main()
