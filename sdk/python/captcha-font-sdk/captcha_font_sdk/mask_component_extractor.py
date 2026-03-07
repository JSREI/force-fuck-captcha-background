from __future__ import annotations

from collections import deque
from dataclasses import dataclass
from typing import Iterable, List

from .component_extractor import neighbors
from .types import BBox


@dataclass
class MaskComponent:
    bbox: BBox
    pixel_count: int


def _mask_neighbors(x: int, y: int, width: int, height: int, connectivity: int) -> Iterable[tuple[int, int]]:
    yield from neighbors(x, y, width, height, connectivity)


def extract_mask_components(
    mask: List[bool],
    width: int,
    height: int,
    connectivity: int,
    min_component_pixels: int,
) -> List[MaskComponent]:
    visited = [False] * (width * height)
    components: List[MaskComponent] = []

    for idx, is_diff in enumerate(mask):
        if not is_diff or visited[idx]:
            continue

        queue = deque([idx])
        visited[idx] = True
        pixel_count = 0
        min_x = max_x = idx % width
        min_y = max_y = idx // width

        while queue:
            current = queue.popleft()
            x = current % width
            y = current // width
            pixel_count += 1

            if x < min_x:
                min_x = x
            if x > max_x:
                max_x = x
            if y < min_y:
                min_y = y
            if y > max_y:
                max_y = y

            for next_x, next_y in _mask_neighbors(x, y, width, height, connectivity):
                next_idx = next_y * width + next_x
                if visited[next_idx] or not mask[next_idx]:
                    continue
                visited[next_idx] = True
                queue.append(next_idx)

        if pixel_count < min_component_pixels:
            continue
        components.append(MaskComponent(bbox=(min_x, min_y, max_x, max_y), pixel_count=pixel_count))

    components.sort(key=lambda c: c.pixel_count, reverse=True)
    return components
