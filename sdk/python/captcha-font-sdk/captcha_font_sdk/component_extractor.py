from __future__ import annotations

from collections import deque
from typing import Iterable, List, Optional, Tuple

from .types import FontComponent, Pixel, RGB


def neighbors(x: int, y: int, width: int, height: int, connectivity: int) -> Iterable[Pixel]:
    if connectivity == 4:
        dirs = ((1, 0), (-1, 0), (0, 1), (0, -1))
    else:
        dirs = ((1, 0), (-1, 0), (0, 1), (0, -1), (1, 1), (1, -1), (-1, 1), (-1, -1))
    for dx, dy in dirs:
        nx, ny = x + dx, y + dy
        if 0 <= nx < width and 0 <= ny < height:
            yield nx, ny


def extract_components(
    mask: List[bool],
    colors: List[Optional[RGB]],
    width: int,
    height: int,
    connectivity: int,
    min_component_pixels: int,
    include_pixels: bool,
) -> List[FontComponent]:
    visited = [False] * (width * height)
    components: List[FontComponent] = []

    for idx, is_diff in enumerate(mask):
        if not is_diff or visited[idx]:
            continue
        base_color = colors[idx]
        if base_color is None:
            continue

        q = deque([idx])
        visited[idx] = True
        pixels: List[Pixel] = []
        min_x = max_x = idx % width
        min_y = max_y = idx // width

        while q:
            cur = q.popleft()
            x = cur % width
            y = cur // width
            pixels.append((x, y))
            if x < min_x:
                min_x = x
            if x > max_x:
                max_x = x
            if y < min_y:
                min_y = y
            if y > max_y:
                max_y = y

            for nx, ny in neighbors(x, y, width, height, connectivity):
                ni = ny * width + nx
                if visited[ni] or not mask[ni]:
                    continue
                if colors[ni] != base_color:
                    continue
                visited[ni] = True
                q.append(ni)

        if len(pixels) < min_component_pixels:
            continue

        components.append(
            FontComponent(
                color=base_color,
                bbox=(min_x, min_y, max_x, max_y),
                pixel_count=len(pixels),
                pixels=pixels if include_pixels else [],
            )
        )

    components.sort(key=lambda c: c.pixel_count, reverse=True)
    return components

