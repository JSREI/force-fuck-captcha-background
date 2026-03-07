from __future__ import annotations

from typing import List, Tuple

RGB = Tuple[int, int, int]


def rgb_at(pix: List[Tuple[int, ...]], width: int, x: int, y: int) -> RGB:
    p = pix[y * width + x]
    return int(p[0]), int(p[1]), int(p[2])


def group_id_from_pixels(pix: List[Tuple[int, ...]], width: int, height: int) -> str:
    corners = [
        rgb_at(pix, width, 0, 0),  # lt
        rgb_at(pix, width, width - 1, 0),  # rt
        rgb_at(pix, width, 0, height - 1),  # lb
        rgb_at(pix, width, width - 1, height - 1),  # rb
    ]
    return f"{width}x{height}|" + "|".join(f"{r},{g},{b}" for r, g, b in corners)

