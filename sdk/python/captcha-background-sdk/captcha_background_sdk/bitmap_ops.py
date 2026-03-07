from __future__ import annotations

from typing import List


def flatten_bitmap(bitmap_2d: List[List[int]]) -> List[int]:
    return [value for row in bitmap_2d for value in row]


def resize_bitmap_nearest(
    bitmap_2d: List[List[int]],
    target_width: int,
    target_height: int,
) -> List[List[int]]:
    if target_width <= 0 or target_height <= 0:
        raise ValueError("target_width and target_height must be positive")
    if not bitmap_2d or not bitmap_2d[0]:
        return [[0 for _ in range(target_width)] for _ in range(target_height)]

    src_height = len(bitmap_2d)
    src_width = len(bitmap_2d[0])
    resized = [[0 for _ in range(target_width)] for _ in range(target_height)]

    for y in range(target_height):
        src_y = min(src_height - 1, int(y * src_height / target_height))
        for x in range(target_width):
            src_x = min(src_width - 1, int(x * src_width / target_width))
            resized[y][x] = bitmap_2d[src_y][src_x]

    return resized


def normalize_bitmap_to_canvas(
    bitmap_2d: List[List[int]],
    target_width: int,
    target_height: int,
    keep_aspect_ratio: bool = True,
) -> List[List[int]]:
    if target_width <= 0 or target_height <= 0:
        raise ValueError("target_width and target_height must be positive")
    if not bitmap_2d or not bitmap_2d[0]:
        return [[0 for _ in range(target_width)] for _ in range(target_height)]

    src_height = len(bitmap_2d)
    src_width = len(bitmap_2d[0])
    if not keep_aspect_ratio:
        return resize_bitmap_nearest(bitmap_2d, target_width, target_height)

    scale = min(target_width / float(src_width), target_height / float(src_height))
    new_width = max(1, int(round(src_width * scale)))
    new_height = max(1, int(round(src_height * scale)))
    resized = resize_bitmap_nearest(bitmap_2d, new_width, new_height)

    canvas = [[0 for _ in range(target_width)] for _ in range(target_height)]
    offset_x = (target_width - new_width) // 2
    offset_y = (target_height - new_height) // 2

    for y in range(new_height):
        for x in range(new_width):
            canvas[offset_y + y][offset_x + x] = resized[y][x]
    return canvas
