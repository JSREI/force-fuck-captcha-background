from __future__ import annotations

from dataclasses import dataclass
from typing import Iterable, List, Optional, Tuple

from .types import FontComponent, FontGlyph, RGBA, TextRegion


@dataclass(frozen=True)
class CaptchaRgbaImage:
    width: int
    height: int
    pixels: List[Tuple[int, ...]]


def _glyph_size(component: FontComponent) -> tuple[int, int]:
    left, top, right, bottom = component.bbox
    return right - left + 1, bottom - top + 1


def sort_components_by_rect_index(components: Iterable[FontComponent]) -> List[FontComponent]:
    # Left-to-right ordering for common captcha text layout.
    return sorted(components, key=lambda c: (c.bbox[0], c.bbox[1], c.bbox[2], c.bbox[3]))


def _build_bitmap_2d(component: FontComponent) -> List[List[int]]:
    left, top, _right, _bottom = component.bbox
    width, height = _glyph_size(component)
    bitmap = [[0 for _ in range(width)] for _ in range(height)]
    for x, y in component.pixels:
        rx = x - left
        ry = y - top
        if 0 <= rx < width and 0 <= ry < height:
            bitmap[ry][rx] = 1
    return bitmap


def _build_rgba_2d(
    component: FontComponent,
    captcha_image: CaptchaRgbaImage,
) -> List[List[RGBA]]:
    left, top, _right, _bottom = component.bbox
    width, height = _glyph_size(component)
    rgba_2d: List[List[RGBA]] = [[(0, 0, 0, 0) for _ in range(width)] for _ in range(height)]

    for x, y in component.pixels:
        rx = x - left
        ry = y - top
        if not (0 <= rx < width and 0 <= ry < height):
            continue
        if x < 0 or y < 0 or x >= captcha_image.width or y >= captcha_image.height:
            continue
        pixel = captcha_image.pixels[y * captcha_image.width + x]
        rgba_2d[ry][rx] = (
            int(pixel[0]),
            int(pixel[1]),
            int(pixel[2]),
            int(pixel[3] if len(pixel) > 3 else 255),
        )
    return rgba_2d


def _build_bitmap_2d_from_bbox_pixels(
    bbox: tuple[int, int, int, int],
    pixels: List[tuple[int, int]],
) -> List[List[int]]:
    left, top, right, bottom = bbox
    width = right - left + 1
    height = bottom - top + 1
    bitmap = [[0 for _ in range(width)] for _ in range(height)]
    for x, y in pixels:
        rx = x - left
        ry = y - top
        if 0 <= rx < width and 0 <= ry < height:
            bitmap[ry][rx] = 1
    return bitmap


def _build_rgba_2d_from_bbox_pixels(
    bbox: tuple[int, int, int, int],
    pixels: List[tuple[int, int]],
    captcha_image: CaptchaRgbaImage,
) -> List[List[RGBA]]:
    left, top, right, bottom = bbox
    width = right - left + 1
    height = bottom - top + 1
    rgba_2d: List[List[RGBA]] = [[(0, 0, 0, 0) for _ in range(width)] for _ in range(height)]

    for x, y in pixels:
        rx = x - left
        ry = y - top
        if not (0 <= rx < width and 0 <= ry < height):
            continue
        if x < 0 or y < 0 or x >= captcha_image.width or y >= captcha_image.height:
            continue
        pixel = captcha_image.pixels[y * captcha_image.width + x]
        rgba_2d[ry][rx] = (
            int(pixel[0]),
            int(pixel[1]),
            int(pixel[2]),
            int(pixel[3] if len(pixel) > 3 else 255),
        )
    return rgba_2d


def build_font_glyphs(
    components: Iterable[FontComponent],
    captcha_image: Optional[CaptchaRgbaImage],
    include_pixels: bool,
    include_rgba_2d: bool,
) -> List[FontGlyph]:
    sorted_components = sort_components_by_rect_index(components)
    glyphs: List[FontGlyph] = []

    for rect_index, component in enumerate(sorted_components):
        width, height = _glyph_size(component)
        bitmap_2d = _build_bitmap_2d(component)
        rgba_2d = None
        if include_rgba_2d:
            if captcha_image is None:
                raise ValueError("captcha_image is required when include_rgba_2d=True")
            rgba_2d = _build_rgba_2d(component, captcha_image)

        glyphs.append(
            FontGlyph(
                rect_index=rect_index,
                bbox=component.bbox,
                width=width,
                height=height,
                color=component.color,
                pixel_count=component.pixel_count,
                pixels=component.pixels if include_pixels else [],
                bitmap_2d=bitmap_2d,
                rgba_2d=rgba_2d,
            )
        )

    return glyphs


def build_font_glyphs_from_text_regions(
    regions: Iterable[TextRegion],
    captcha_image: Optional[CaptchaRgbaImage],
    include_pixels: bool,
    include_rgba_2d: bool,
) -> List[FontGlyph]:
    sorted_regions = sorted(regions, key=lambda r: (r.bbox[0], r.bbox[1], r.bbox[2], r.bbox[3]))
    glyphs: List[FontGlyph] = []

    for rect_index, region in enumerate(sorted_regions):
        left, top, right, bottom = region.bbox
        width = right - left + 1
        height = bottom - top + 1
        bitmap_2d = _build_bitmap_2d_from_bbox_pixels(region.bbox, region.pixels)
        rgba_2d = None
        if include_rgba_2d:
            if captcha_image is None:
                raise ValueError("captcha_image is required when include_rgba_2d=True")
            rgba_2d = _build_rgba_2d_from_bbox_pixels(region.bbox, region.pixels, captcha_image)

        color = tuple(region.colors[0]) if region.colors else (0, 0, 0)
        glyphs.append(
            FontGlyph(
                rect_index=rect_index,
                bbox=region.bbox,
                width=width,
                height=height,
                color=(int(color[0]), int(color[1]), int(color[2])),
                pixel_count=region.pixel_count,
                pixels=region.pixels if include_pixels else [],
                bitmap_2d=bitmap_2d,
                rgba_2d=rgba_2d,
            )
        )

    return glyphs
