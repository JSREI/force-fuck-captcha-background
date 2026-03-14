from __future__ import annotations

from pathlib import Path
from typing import Optional, Tuple

from PIL import Image

BBox = Tuple[int, int, int, int]


def _clamp_bbox(bbox: BBox, width: int, height: int, padding: int = 0) -> BBox:
    left, top, right, bottom = bbox
    left = max(0, left - padding)
    top = max(0, top - padding)
    right = min(width - 1, right + padding)
    bottom = min(height - 1, bottom + padding)
    if right < left:
        right = left
    if bottom < top:
        bottom = top
    return (left, top, right, bottom)


def extract_patch(
    image_path: str,
    bbox: BBox,
    output_path: Optional[str] = None,
    padding: int = 0,
) -> dict:
    with Image.open(image_path) as image:
        rgba = image.convert("RGBA")
        width, height = rgba.size
        left, top, right, bottom = _clamp_bbox(bbox, width=width, height=height, padding=padding)
        patch = rgba.crop((left, top, right + 1, bottom + 1))

    normalized_output_path = None
    if output_path:
        target = Path(output_path)
        if target.parent and not target.parent.exists():
            target.parent.mkdir(parents=True, exist_ok=True)
        patch.save(target)
        normalized_output_path = str(target)

    patch_width, patch_height = patch.size
    return {
        "source_image_path": image_path,
        "bbox": (left, top, right, bottom),
        "patch_size": (patch_width, patch_height),
        "output_path": normalized_output_path,
    }
