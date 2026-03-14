from __future__ import annotations

import argparse
import json
from collections import Counter
from pathlib import Path
from typing import Dict, List

from PIL import Image, ImageDraw

from captcha_background_sdk import CaptchaVisionSDK


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=(
            "Batch validate text-position detection on captcha images, "
            "save boxed visualizations, and output summary stats."
        )
    )
    parser.add_argument("--backgrounds", required=True, help="Directory of full backgrounds.")
    parser.add_argument("--input-dir", required=True, help="Directory of captcha images.")
    parser.add_argument("--output-dir", required=True, help="Directory for outputs.")
    parser.add_argument(
        "--expected-region-count",
        type=int,
        default=4,
        help="Expected text box count per captcha. Use <=0 to disable forcing.",
    )
    parser.add_argument("--diff-threshold", type=int, default=18)
    parser.add_argument("--font-min-component-pixels", type=int, default=8)
    parser.add_argument("--text-min-width", type=int, default=3)
    parser.add_argument("--text-min-height", type=int, default=3)
    parser.add_argument("--text-min-fill-ratio", type=float, default=0.06)
    parser.add_argument("--text-max-fill-ratio", type=float, default=0.95)
    parser.add_argument("--text-merge-gap", type=int, default=2)
    parser.add_argument("--text-min-vertical-overlap-ratio", type=float, default=0.4)
    parser.add_argument("--text-force-merge-max-gap", type=int, default=28)
    return parser.parse_args()


def draw_boxes(image_path: Path, regions: List[Dict], target_path: Path) -> None:
    image = Image.open(image_path).convert("RGBA")
    draw = ImageDraw.Draw(image)
    for idx, region in enumerate(regions, start=1):
        left, top, right, bottom = region["bbox"]
        draw.rectangle((left, top, right, bottom), outline=(255, 0, 0, 255), width=2)
        draw.text((left, max(0, top - 12)), str(idx), fill=(255, 0, 0, 255))
    target_path.parent.mkdir(parents=True, exist_ok=True)
    image.save(target_path)


def main() -> None:
    args = parse_args()
    backgrounds_dir = Path(args.backgrounds)
    input_dir = Path(args.input_dir)
    output_dir = Path(args.output_dir)
    boxed_dir = output_dir / "boxed"
    per_image_dir = output_dir / "per_image_json"

    expected_count = args.expected_region_count if args.expected_region_count > 0 else None
    sdk = CaptchaVisionSDK(
        diff_threshold=args.diff_threshold,
        font_min_component_pixels=args.font_min_component_pixels,
        connectivity=8,
        text_min_width=args.text_min_width,
        text_min_height=args.text_min_height,
        text_min_fill_ratio=args.text_min_fill_ratio,
        text_max_fill_ratio=args.text_max_fill_ratio,
        text_merge_gap=args.text_merge_gap,
        text_min_vertical_overlap_ratio=args.text_min_vertical_overlap_ratio,
        text_expected_region_count=expected_count,
        text_force_merge_max_gap=args.text_force_merge_max_gap,
    )
    index = sdk.build_background_index(str(backgrounds_dir), recursive=True)
    print(f"indexed backgrounds: {len(index)}")

    image_paths = sorted([p for p in input_dir.glob("*") if p.suffix.lower() in {".png", ".jpg", ".jpeg"}])
    total = len(image_paths)
    if total == 0:
        raise SystemExit(f"No captcha images found in {input_dir}")

    region_counts: List[int] = []
    errors: List[Dict] = []
    top_rows: List[Dict] = []

    for idx, image_path in enumerate(image_paths, start=1):
        try:
            result = sdk.recognize_text_positions_dict(str(image_path), include_pixels=False)
            region_count = int(result["stats"]["region_count"])
            region_counts.append(region_count)

            boxed_path = boxed_dir / image_path.name
            draw_boxes(image_path, result["regions"], boxed_path)

            per_image_path = per_image_dir / f"{image_path.stem}.json"
            per_image_path.parent.mkdir(parents=True, exist_ok=True)
            per_image_path.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")

            top_rows.append(
                {
                    "filename": image_path.name,
                    "region_count": region_count,
                    "component_count": int(result["stats"]["component_count"]),
                    "text_pixel_count": int(result["stats"]["text_pixel_count"]),
                }
            )
        except Exception as exc:
            errors.append({"filename": image_path.name, "error": str(exc)})

        if idx % 100 == 0 or idx == total:
            print(f"processed {idx}/{total}")

    counter = Counter(region_counts)
    mean = (sum(region_counts) / len(region_counts)) if region_counts else 0.0

    top20 = sorted(
        top_rows,
        key=lambda row: (row["region_count"], row["component_count"], row["text_pixel_count"], row["filename"]),
        reverse=True,
    )[:20]

    summary = {
        "input_dir": str(input_dir.resolve()),
        "output_dir": str(output_dir.resolve()),
        "total_images": total,
        "ok_images": len(region_counts),
        "error_count": len(errors),
        "region_count_distribution": dict(sorted(counter.items())),
        "region_count_mean": mean,
        "region_count_min": min(region_counts) if region_counts else None,
        "region_count_max": max(region_counts) if region_counts else None,
        "problematic_gt4": [row["filename"] for row in top_rows if row["region_count"] > 4],
        "problematic_lt4": [row["filename"] for row in top_rows if row["region_count"] < 4],
        "top20": top20,
        "errors": errors,
    }

    output_dir.mkdir(parents=True, exist_ok=True)
    summary_path = output_dir / "summary.json"
    summary_path.write_text(json.dumps(summary, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"saved summary: {summary_path.resolve()}")
    print(json.dumps(summary["region_count_distribution"], ensure_ascii=False))
    print(f"mean={mean:.4f}, gt4={len(summary['problematic_gt4'])}, lt4={len(summary['problematic_lt4'])}")


if __name__ == "__main__":
    main()
