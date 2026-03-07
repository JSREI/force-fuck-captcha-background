from __future__ import annotations

import re
from dataclasses import dataclass, field
from pathlib import Path
from typing import Dict, Iterable, List, Tuple

from PIL import Image

from .local_restore_types import BucketSummary


IMAGE_EXTENSIONS = {".png", ".jpg", ".jpeg", ".webp", ".bmp", ".gif"}
_BUCKET_ID_SANITIZE_RE = re.compile(r"[^a-zA-Z0-9_-]")


@dataclass
class BucketState:
    id: str
    width: int
    height: int
    image_count: int = 0
    pixel_votes: Dict[int, Dict[int, int]] = field(default_factory=dict)
    final_image_path: str | None = None


def _rgb24(pixel: Tuple[int, ...]) -> int:
    return (int(pixel[0]) << 16) | (int(pixel[1]) << 8) | int(pixel[2])


def _build_bucket_id(pixels: List[Tuple[int, ...]], width: int, height: int) -> str:
    lt = _rgb24(pixels[0])
    rt = _rgb24(pixels[width - 1])
    lb = _rgb24(pixels[(height - 1) * width])
    rb = _rgb24(pixels[(height - 1) * width + (width - 1)])
    return f"{width}x{height}|{lt}|{rt}|{lb}|{rb}"


def process_image_into_buckets(file_path: str, buckets: Dict[str, BucketState]) -> None:
    with Image.open(file_path) as image:
        rgba = image.convert("RGBA")
        width, height = rgba.size
        pixels = list(rgba.getdata())

    if width <= 0 or height <= 0:
        raise ValueError("invalid_image_dimensions")

    bucket_id = _build_bucket_id(pixels, width, height)
    bucket = buckets.get(bucket_id)
    if bucket is None:
        bucket = BucketState(id=bucket_id, width=width, height=height)
        buckets[bucket_id] = bucket

    bucket.image_count += 1
    for pixel_index, pixel in enumerate(pixels):
        rgb24 = _rgb24(pixel)
        color_votes = bucket.pixel_votes.get(pixel_index)
        if color_votes is None:
            color_votes = {}
            bucket.pixel_votes[pixel_index] = color_votes
        color_votes[rgb24] = color_votes.get(rgb24, 0) + 1


def _pick_best_rgb24(color_votes: Dict[int, int]) -> int:
    best_votes = -1
    best_rgb24 = (1 << 24) - 1
    for rgb24, votes in color_votes.items():
        if votes > best_votes or (votes == best_votes and rgb24 < best_rgb24):
            best_votes = votes
            best_rgb24 = rgb24
    return best_rgb24


def _rgb24_to_rgba(rgb24: int) -> tuple[int, int, int, int]:
    return ((rgb24 >> 16) & 0xFF, (rgb24 >> 8) & 0xFF, rgb24 & 0xFF, 255)


def _safe_bucket_id(bucket_id: str) -> str:
    return _BUCKET_ID_SANITIZE_RE.sub("_", bucket_id)[:120]


def generate_bucket_outputs(output_dir: str, buckets: Iterable[BucketState]) -> List[BucketSummary]:
    output_root = Path(output_dir)
    output_root.mkdir(parents=True, exist_ok=True)

    summaries: List[BucketSummary] = []
    for index, bucket in enumerate(buckets, start=1):
        pixel_count = bucket.width * bucket.height
        rgba_pixels = [(0, 0, 0, 0)] * pixel_count

        for pixel_index in range(pixel_count):
            color_votes = bucket.pixel_votes.get(pixel_index)
            if not color_votes:
                continue
            rgba_pixels[pixel_index] = _rgb24_to_rgba(_pick_best_rgb24(color_votes))

        safe_bucket_id = _safe_bucket_id(bucket.id)
        output_file = f"background_{index}_{safe_bucket_id}_{bucket.image_count}.png"
        output_path = output_root / output_file

        out_image = Image.new("RGBA", (bucket.width, bucket.height))
        out_image.putdata(rgba_pixels)
        out_image.save(output_path)

        bucket.final_image_path = str(output_path)
        summaries.append(
            BucketSummary(
                id=bucket.id,
                width=bucket.width,
                height=bucket.height,
                image_count=bucket.image_count,
                output_file=output_file,
                output_path=str(output_path),
            )
        )
    return summaries
