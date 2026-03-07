from __future__ import annotations

from dataclasses import asdict
from typing import Dict, Iterable, Optional

from .background_index import (
    build_background_index as _build_background_index,
    compute_group_id as _compute_group_id,
    load_rgba_pixels,
)
from .diff_engine import build_diff
from .group_id import group_id_from_pixels
from .mask_component_extractor import extract_mask_components
from .types import BackgroundMeta, SliderGap, SliderLocateResult


class CaptchaSliderLocator:
    """Captcha slider-gap locator SDK."""

    def __init__(
        self,
        diff_threshold: int = 18,
        min_gap_pixels: int = 20,
        connectivity: int = 8,
    ) -> None:
        if connectivity not in (4, 8):
            raise ValueError("connectivity must be 4 or 8")
        self.diff_threshold = diff_threshold
        self.min_gap_pixels = min_gap_pixels
        self.connectivity = connectivity
        self._backgrounds: Dict[str, BackgroundMeta] = {}

    @property
    def backgrounds(self) -> Dict[str, BackgroundMeta]:
        return self._backgrounds

    def set_background_index(self, index: Dict[str, BackgroundMeta]) -> None:
        self._backgrounds = dict(index)

    def build_background_index(
        self,
        background_dir: str,
        recursive: bool = True,
        exts: Optional[Iterable[str]] = None,
    ) -> Dict[str, BackgroundMeta]:
        index = _build_background_index(background_dir, recursive=recursive, exts=exts)
        self.set_background_index(index)
        return index

    def compute_group_id(self, image_path: str) -> str:
        return _compute_group_id(image_path)

    def locate_gap(self, captcha_path: str) -> SliderLocateResult:
        if not self._backgrounds:
            raise RuntimeError("background index is empty, call build_background_index first")

        width, height, captcha_pixels = load_rgba_pixels(captcha_path)
        group_id = group_id_from_pixels(captcha_pixels, width, height)
        if group_id not in self._backgrounds:
            raise KeyError(f"group_id not found in background index: {group_id}")

        background_meta = self._backgrounds[group_id]
        bg_width, bg_height, background_pixels = load_rgba_pixels(background_meta.image_path)
        if (bg_width, bg_height) != (width, height):
            raise ValueError(
                f"background size mismatch: captcha={width}x{height}, background={bg_width}x{bg_height}"
            )

        diff_mask, _ = build_diff(
            captcha_pixels,
            background_pixels,
            width,
            height,
            self.diff_threshold,
        )
        components = extract_mask_components(
            diff_mask,
            width,
            height,
            connectivity=self.connectivity,
            min_component_pixels=self.min_gap_pixels,
        )

        best = components[0] if components else None
        gap = None
        if best is not None:
            left, top, right, bottom = best.bbox
            gap = SliderGap(
                bbox=best.bbox,
                center=((left + right) // 2, (top + bottom) // 2),
                pixel_count=best.pixel_count,
            )

        return SliderLocateResult(
            group_id=group_id,
            background_path=background_meta.image_path,
            image_size=(width, height),
            gap=gap,
            stats={
                "diff_pixels": sum(1 for value in diff_mask if value),
                "region_count": len(components),
                "min_gap_pixels": self.min_gap_pixels,
                "diff_threshold": self.diff_threshold,
            },
        )

    def locate_gap_dict(self, captcha_path: str) -> Dict:
        return asdict(self.locate_gap(captcha_path))
