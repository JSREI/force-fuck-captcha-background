from __future__ import annotations

from typing import Iterable, List

from .types import FontGlyphFeature, FontGlyphSlot


def align_font_glyph_features_to_slots(
    glyph_features: Iterable[FontGlyphFeature],
    slot_count: int,
    vector_length: int,
) -> List[FontGlyphSlot]:
    if slot_count <= 0:
        raise ValueError("slot_count must be > 0")
    if vector_length <= 0:
        raise ValueError("vector_length must be > 0")

    sorted_features = sorted(glyph_features, key=lambda g: g.rect_index)
    slots: List[FontGlyphSlot] = []
    for slot_index in range(slot_count):
        if slot_index < len(sorted_features):
            glyph = sorted_features[slot_index]
            slots.append(
                FontGlyphSlot(
                    slot_index=slot_index,
                    present=True,
                    rect_index=glyph.rect_index,
                    bbox=glyph.bbox,
                    vector_1d=glyph.vector_1d,
                    density=glyph.density,
                )
            )
        else:
            slots.append(
                FontGlyphSlot(
                    slot_index=slot_index,
                    present=False,
                    rect_index=None,
                    bbox=None,
                    vector_1d=[0] * vector_length,
                    density=0.0,
                )
            )
    return slots
