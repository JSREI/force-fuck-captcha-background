from __future__ import annotations

from typing import List, Optional, Tuple

RGB = Tuple[int, int, int]


def build_diff(
    cap_px: List[Tuple[int, ...]],
    bg_px: List[Tuple[int, ...]],
    width: int,
    height: int,
    diff_threshold: int,
) -> Tuple[List[bool], List[Optional[RGB]]]:
    total = width * height
    mask = [False] * total
    colors: List[Optional[RGB]] = [None] * total
    for i in range(total):
        cr, cg, cb, _ca = cap_px[i]
        br, bg, bb, _ba = bg_px[i]
        if abs(int(cr) - int(br)) + abs(int(cg) - int(bg)) + abs(int(cb) - int(bb)) >= diff_threshold:
            mask[i] = True
            colors[i] = (int(cr), int(cg), int(cb))
    return mask, colors

