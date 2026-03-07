from __future__ import annotations

from typing import Iterable, List

from .bitmap_ops import flatten_bitmap, normalize_bitmap_to_canvas
from .types import FontGlyph, FontGlyphFeature


def _bitmap_density(bitmap_2d: List[List[int]]) -> float:
    if not bitmap_2d or not bitmap_2d[0]:
        return 0.0
    pixel_total = len(bitmap_2d) * len(bitmap_2d[0])
    active = sum(value for row in bitmap_2d for value in row)
    return float(active) / float(pixel_total)


def build_font_glyph_features(
    glyphs: Iterable[FontGlyph],
    target_width: int = 32,
    target_height: int = 32,
    keep_aspect_ratio: bool = True,
) -> List[FontGlyphFeature]:
    features: List[FontGlyphFeature] = []
    for glyph in glyphs:
        resized_bitmap = normalize_bitmap_to_canvas(
            glyph.bitmap_2d,
            target_width=target_width,
            target_height=target_height,
            keep_aspect_ratio=keep_aspect_ratio,
        )
        features.append(
            FontGlyphFeature(
                rect_index=glyph.rect_index,
                bbox=glyph.bbox,
                width=glyph.width,
                height=glyph.height,
                color=glyph.color,
                pixel_count=glyph.pixel_count,
                density=round(_bitmap_density(glyph.bitmap_2d), 6),
                bitmap_2d=glyph.bitmap_2d,
                resized_bitmap_2d=resized_bitmap,
                vector_1d=flatten_bitmap(resized_bitmap),
            )
        )
    return features
