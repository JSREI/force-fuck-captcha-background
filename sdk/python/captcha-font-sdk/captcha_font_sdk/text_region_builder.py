from __future__ import annotations

from dataclasses import dataclass
from typing import Iterable, List, Optional

from .types import BBox, FontComponent, TextRegion


@dataclass(frozen=True)
class TextRegionFilterConfig:
    min_width: int = 3
    min_height: int = 3
    min_fill_ratio: float = 0.06
    max_fill_ratio: float = 0.95
    merge_gap: int = 2
    min_vertical_overlap_ratio: float = 0.4


def _bbox_size(bbox: BBox) -> tuple[int, int]:
    left, top, right, bottom = bbox
    return right - left + 1, bottom - top + 1


def _fill_ratio(pixel_count: int, bbox: BBox) -> float:
    width, height = _bbox_size(bbox)
    area = max(1, width * height)
    return float(pixel_count) / float(area)


def _component_score(pixel_count: int, bbox: BBox) -> float:
    width, height = _bbox_size(bbox)
    area = max(1, width * height)
    fill = float(pixel_count) / float(area)
    fill_term = max(0.0, 1.0 - abs(fill - 0.35) / 0.35)
    area_term = min(1.0, float(pixel_count) / 320.0)
    return 0.6 * fill_term + 0.4 * area_term


def _bbox_union(a: BBox, b: BBox) -> BBox:
    return (
        min(a[0], b[0]),
        min(a[1], b[1]),
        max(a[2], b[2]),
        max(a[3], b[3]),
    )


def _vertical_overlap_ratio(a: BBox, b: BBox) -> float:
    overlap = max(0, min(a[3], b[3]) - max(a[1], b[1]) + 1)
    a_h = a[3] - a[1] + 1
    b_h = b[3] - b[1] + 1
    base = max(1, min(a_h, b_h))
    return float(overlap) / float(base)


def _horizontal_gap(a: BBox, b: BBox) -> int:
    if b[0] <= a[2]:
        return 0
    return b[0] - a[2] - 1


def _should_merge(a: TextRegion, b: TextRegion, config: TextRegionFilterConfig) -> bool:
    gap = _horizontal_gap(a.bbox, b.bbox)
    if gap > config.merge_gap:
        return False
    overlap_ratio = _vertical_overlap_ratio(a.bbox, b.bbox)
    return overlap_ratio >= config.min_vertical_overlap_ratio


def _merge_regions(a: TextRegion, b: TextRegion, include_pixels: bool) -> TextRegion:
    total_pixels = a.pixel_count + b.pixel_count
    merged_colors = list(dict.fromkeys([*a.colors, *b.colors]))
    merged_pixels = [*a.pixels, *b.pixels] if include_pixels else []
    merged_bbox = _bbox_union(a.bbox, b.bbox)
    merged_score = (
        (a.score * float(a.pixel_count) + b.score * float(b.pixel_count)) / float(max(1, total_pixels))
    )
    return TextRegion(
        bbox=merged_bbox,
        pixel_count=total_pixels,
        component_count=a.component_count + b.component_count,
        colors=merged_colors,
        score=merged_score,
        pixels=merged_pixels,
    )


def build_text_regions(
    components: Iterable[FontComponent],
    include_pixels: bool,
    config: Optional[TextRegionFilterConfig] = None,
) -> List[TextRegion]:
    cfg = config or TextRegionFilterConfig()

    regions: List[TextRegion] = []
    for component in components:
        bbox = component.bbox
        width, height = _bbox_size(bbox)
        if width < cfg.min_width or height < cfg.min_height:
            continue

        fill = _fill_ratio(component.pixel_count, bbox)
        if fill < cfg.min_fill_ratio or fill > cfg.max_fill_ratio:
            continue

        regions.append(
            TextRegion(
                bbox=bbox,
                pixel_count=component.pixel_count,
                component_count=1,
                colors=[component.color],
                score=_component_score(component.pixel_count, bbox),
                pixels=component.pixels if include_pixels else [],
            )
        )

    regions.sort(key=lambda r: (r.bbox[0], r.bbox[1]))
    merged: List[TextRegion] = []
    for region in regions:
        if not merged:
            merged.append(region)
            continue
        if _should_merge(merged[-1], region, cfg):
            merged[-1] = _merge_regions(merged[-1], region, include_pixels=include_pixels)
        else:
            merged.append(region)
    return merged


def union_bbox(regions: Iterable[TextRegion]) -> Optional[BBox]:
    boxes = [region.bbox for region in regions]
    if not boxes:
        return None
    left = min(box[0] for box in boxes)
    top = min(box[1] for box in boxes)
    right = max(box[2] for box in boxes)
    bottom = max(box[3] for box in boxes)
    return (left, top, right, bottom)
