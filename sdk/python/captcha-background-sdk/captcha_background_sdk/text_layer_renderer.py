from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Iterable, Optional

from PIL import Image

from .types import BBox, TextRegion


@dataclass(frozen=True)
class TextLayerRenderOutput:
    text_bbox: Optional[BBox]
    text_pixel_count: int
    output_path: Optional[str]


def _to_pil_crop_box(bbox: BBox) -> tuple[int, int, int, int]:
    left, top, right, bottom = bbox
    return (left, top, right + 1, bottom + 1)


def _safe_pixel_index(width: int, height: int, x: int, y: int) -> Optional[int]:
    if x < 0 or y < 0 or x >= width or y >= height:
        return None
    return y * width + x


def render_text_layer(
    captcha_path: str,
    regions: Iterable[TextRegion],
    text_bbox: Optional[BBox],
    output_path: Optional[str],
    crop_to_content: bool,
) -> TextLayerRenderOutput:
    with Image.open(captcha_path) as image:
        src = image.convert("RGBA")
        width, height = src.size
        src_pixels = list(src.getdata())

    out_pixels = [(0, 0, 0, 0)] * (width * height)
    picked = set()
    for region in regions:
        for x, y in region.pixels:
            idx = _safe_pixel_index(width, height, x, y)
            if idx is None or idx in picked:
                continue
            picked.add(idx)
            out_pixels[idx] = src_pixels[idx]

    out_image = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    out_image.putdata(out_pixels)

    if crop_to_content and text_bbox is not None:
        out_image = out_image.crop(_to_pil_crop_box(text_bbox))

    normalized_output_path: Optional[str] = None
    if output_path:
        target = Path(output_path)
        if target.parent and not target.parent.exists():
            target.parent.mkdir(parents=True, exist_ok=True)
        out_image.save(target)
        normalized_output_path = str(target)

    return TextLayerRenderOutput(
        text_bbox=text_bbox,
        text_pixel_count=len(picked),
        output_path=normalized_output_path,
    )
