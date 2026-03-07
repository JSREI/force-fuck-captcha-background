from __future__ import annotations

from dataclasses import asdict
from pathlib import Path
import shutil
from typing import Dict, Iterable, Optional

from .background_index import (
    build_background_index as _build_background_index,
    compute_group_id as _compute_group_id,
    load_rgba_pixels,
)
from .component_extractor import extract_components
from .diff_engine import build_diff
from .font_glyph_extractor import CaptchaRgbaImage, build_font_glyphs
from .font_glyph_features import build_font_glyph_features
from .font_glyph_images import export_font_glyph_images
from .font_glyph_slots import align_font_glyph_features_to_slots
from .group_id import group_id_from_pixels
from .text_layer_renderer import render_text_layer
from .text_region_builder import TextRegionFilterConfig, build_text_regions, union_bbox
from .types import (
    BackgroundMeta,
    BackgroundRestoreResult,
    FontGlyphFeatureExtractResult,
    FontGlyphImageExportResult,
    FontGlyphExtractResult,
    FontGlyphSlotExtractResult,
    LocateResult,
    TextLayerResult,
    TextLocateResult,
)


class CaptchaFontLocator:
    """Captcha font locator SDK.

    Flow:
    1) Build mapping: group_id -> background image.
    2) For a captcha image, compute group_id and find matching background.
    3) Diff captcha vs background and extract font components by color-aware flood fill.
    """

    def __init__(
        self,
        diff_threshold: int = 18,
        min_component_pixels: int = 8,
        connectivity: int = 8,
        text_min_width: int = 3,
        text_min_height: int = 3,
        text_min_fill_ratio: float = 0.06,
        text_max_fill_ratio: float = 0.95,
        text_merge_gap: int = 2,
        text_min_vertical_overlap_ratio: float = 0.4,
    ) -> None:
        if connectivity not in (4, 8):
            raise ValueError("connectivity must be 4 or 8")
        self.diff_threshold = diff_threshold
        self.min_component_pixels = min_component_pixels
        self.connectivity = connectivity
        self._text_region_filter = TextRegionFilterConfig(
            min_width=text_min_width,
            min_height=text_min_height,
            min_fill_ratio=text_min_fill_ratio,
            max_fill_ratio=text_max_fill_ratio,
            merge_gap=text_merge_gap,
            min_vertical_overlap_ratio=text_min_vertical_overlap_ratio,
        )
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

    def _match_background_meta(
        self,
        captcha_path: str,
    ) -> tuple[str, tuple[int, int], list[tuple[int, ...]], BackgroundMeta]:
        if not self._backgrounds:
            raise RuntimeError("background index is empty, call build_background_index first")

        width, height, cap_px = load_rgba_pixels(captcha_path)
        group_id = group_id_from_pixels(cap_px, width, height)
        if group_id not in self._backgrounds:
            raise KeyError(f"group_id not found in background index: {group_id}")

        background_meta = self._backgrounds[group_id]
        if (background_meta.width, background_meta.height) != (width, height):
            raise ValueError(
                f"background size mismatch: captcha={width}x{height}, background={background_meta.width}x{background_meta.height}"
            )
        return group_id, (width, height), cap_px, background_meta

    def locate_fonts(
        self,
        captcha_path: str,
        include_pixels: bool = True,
    ) -> LocateResult:
        gid, (w, h), cap_px, bg_meta = self._match_background_meta(captcha_path)
        bg_w, bg_h, bg_px = load_rgba_pixels(bg_meta.image_path)
        if (bg_w, bg_h) != (w, h):
            raise ValueError(
                f"background size mismatch: captcha={w}x{h}, background={bg_w}x{bg_h}"
            )

        diff_mask, diff_colors = build_diff(cap_px, bg_px, w, h, self.diff_threshold)
        components = extract_components(
            diff_mask,
            diff_colors,
            w,
            h,
            connectivity=self.connectivity,
            min_component_pixels=self.min_component_pixels,
            include_pixels=include_pixels,
        )

        return LocateResult(
            group_id=gid,
            background_path=bg_meta.image_path,
            image_size=(w, h),
            components=components,
            stats={
                "diff_pixels": sum(1 for v in diff_mask if v),
                "component_count": len(components),
                "min_component_pixels": self.min_component_pixels,
                "diff_threshold": self.diff_threshold,
            },
        )

    def locate_fonts_dict(self, captcha_path: str, include_pixels: bool = True) -> Dict:
        result = self.locate_fonts(captcha_path, include_pixels=include_pixels)
        data = asdict(result)
        data["components"] = sorted(data["components"], key=lambda c: c["pixel_count"], reverse=True)
        return data

    def restore_background(
        self,
        captcha_path: str,
        output_path: Optional[str] = None,
    ) -> BackgroundRestoreResult:
        group_id, image_size, _cap_px, background_meta = self._match_background_meta(captcha_path)
        normalized_output_path = None
        if output_path:
            target = Path(output_path)
            if target.parent and not target.parent.exists():
                target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(background_meta.image_path, target)
            normalized_output_path = str(target)

        return BackgroundRestoreResult(
            group_id=group_id,
            background_path=background_meta.image_path,
            image_size=image_size,
            output_path=normalized_output_path,
        )

    def restore_background_dict(
        self,
        captcha_path: str,
        output_path: Optional[str] = None,
    ) -> Dict:
        return asdict(self.restore_background(captcha_path, output_path=output_path))

    def restore_background_by_captcha(
        self,
        captcha_path: str,
        output_path: Optional[str] = None,
    ) -> BackgroundRestoreResult:
        return self.restore_background(captcha_path, output_path=output_path)

    def restore_background_by_captcha_dict(
        self,
        captcha_path: str,
        output_path: Optional[str] = None,
    ) -> Dict:
        return self.restore_background_dict(captcha_path, output_path=output_path)

    def locate_text_regions(
        self,
        captcha_path: str,
        include_pixels: bool = True,
    ) -> TextLocateResult:
        font_result = self.locate_fonts(captcha_path, include_pixels=include_pixels)
        regions = build_text_regions(
            font_result.components,
            include_pixels=include_pixels,
            config=self._text_region_filter,
        )
        return TextLocateResult(
            group_id=font_result.group_id,
            background_path=font_result.background_path,
            image_size=font_result.image_size,
            regions=regions,
            stats={
                "component_count": len(font_result.components),
                "region_count": len(regions),
                "text_pixel_count": sum(region.pixel_count for region in regions),
                "diff_pixels": font_result.stats["diff_pixels"],
                "diff_threshold": self.diff_threshold,
            },
        )

    def locate_text_regions_dict(
        self,
        captcha_path: str,
        include_pixels: bool = True,
    ) -> Dict:
        return asdict(self.locate_text_regions(captcha_path, include_pixels=include_pixels))

    def locate_text_positions(
        self,
        captcha_path: str,
        include_pixels: bool = True,
    ) -> TextLocateResult:
        return self.locate_text_regions(captcha_path, include_pixels=include_pixels)

    def locate_text_positions_dict(
        self,
        captcha_path: str,
        include_pixels: bool = True,
    ) -> Dict:
        return self.locate_text_regions_dict(captcha_path, include_pixels=include_pixels)

    def extract_text_layer(
        self,
        captcha_path: str,
        output_path: Optional[str] = None,
        crop_to_content: bool = False,
    ) -> TextLayerResult:
        text_result = self.locate_text_regions(captcha_path, include_pixels=True)
        bbox = union_bbox(text_result.regions)
        rendered = render_text_layer(
            captcha_path=captcha_path,
            regions=text_result.regions,
            text_bbox=bbox,
            output_path=output_path,
            crop_to_content=crop_to_content,
        )
        return TextLayerResult(
            group_id=text_result.group_id,
            background_path=text_result.background_path,
            image_size=text_result.image_size,
            text_bbox=rendered.text_bbox,
            text_pixel_count=rendered.text_pixel_count,
            output_path=rendered.output_path,
            stats={
                "region_count": text_result.stats["region_count"],
                "component_count": text_result.stats["component_count"],
                "diff_pixels": text_result.stats["diff_pixels"],
                "diff_threshold": text_result.stats["diff_threshold"],
            },
        )

    def extract_text_layer_dict(
        self,
        captcha_path: str,
        output_path: Optional[str] = None,
        crop_to_content: bool = False,
    ) -> Dict:
        return asdict(
            self.extract_text_layer(
                captcha_path=captcha_path,
                output_path=output_path,
                crop_to_content=crop_to_content,
            )
        )

    def extract_font_glyphs(
        self,
        captcha_path: str,
        include_pixels: bool = True,
        include_rgba_2d: bool = False,
    ) -> FontGlyphExtractResult:
        locate_result = self.locate_fonts(captcha_path, include_pixels=True)
        captcha_image = None
        if include_rgba_2d:
            width, height, pixels = load_rgba_pixels(captcha_path)
            captcha_image = CaptchaRgbaImage(width=width, height=height, pixels=pixels)

        glyphs = build_font_glyphs(
            locate_result.components,
            captcha_image=captcha_image,
            include_pixels=include_pixels,
            include_rgba_2d=include_rgba_2d,
        )

        return FontGlyphExtractResult(
            group_id=locate_result.group_id,
            background_path=locate_result.background_path,
            image_size=locate_result.image_size,
            glyphs=glyphs,
            stats={
                "glyph_count": len(glyphs),
                "component_count": locate_result.stats["component_count"],
                "diff_pixels": locate_result.stats["diff_pixels"],
                "diff_threshold": self.diff_threshold,
            },
        )

    def extract_font_glyphs_dict(
        self,
        captcha_path: str,
        include_pixels: bool = True,
        include_rgba_2d: bool = False,
    ) -> Dict:
        return asdict(
            self.extract_font_glyphs(
                captcha_path=captcha_path,
                include_pixels=include_pixels,
                include_rgba_2d=include_rgba_2d,
            )
        )

    def extract_font_glyph_features(
        self,
        captcha_path: str,
        target_width: int = 32,
        target_height: int = 32,
        keep_aspect_ratio: bool = True,
    ) -> FontGlyphFeatureExtractResult:
        glyph_result = self.extract_font_glyphs(
            captcha_path=captcha_path,
            include_pixels=False,
            include_rgba_2d=False,
        )
        glyph_features = build_font_glyph_features(
            glyph_result.glyphs,
            target_width=target_width,
            target_height=target_height,
            keep_aspect_ratio=keep_aspect_ratio,
        )
        return FontGlyphFeatureExtractResult(
            group_id=glyph_result.group_id,
            background_path=glyph_result.background_path,
            image_size=glyph_result.image_size,
            target_size=(target_width, target_height),
            glyph_features=glyph_features,
            stats={
                "glyph_count": len(glyph_features),
                "component_count": glyph_result.stats["component_count"],
                "diff_pixels": glyph_result.stats["diff_pixels"],
                "diff_threshold": self.diff_threshold,
            },
        )

    def extract_font_glyph_features_dict(
        self,
        captcha_path: str,
        target_width: int = 32,
        target_height: int = 32,
        keep_aspect_ratio: bool = True,
    ) -> Dict:
        return asdict(
            self.extract_font_glyph_features(
                captcha_path=captcha_path,
                target_width=target_width,
                target_height=target_height,
                keep_aspect_ratio=keep_aspect_ratio,
            )
        )

    def extract_font_glyph_slots(
        self,
        captcha_path: str,
        slot_count: int = 5,
        target_width: int = 32,
        target_height: int = 32,
        keep_aspect_ratio: bool = True,
    ) -> FontGlyphSlotExtractResult:
        feature_result = self.extract_font_glyph_features(
            captcha_path=captcha_path,
            target_width=target_width,
            target_height=target_height,
            keep_aspect_ratio=keep_aspect_ratio,
        )
        vector_length = target_width * target_height
        slots = align_font_glyph_features_to_slots(
            feature_result.glyph_features,
            slot_count=slot_count,
            vector_length=vector_length,
        )
        return FontGlyphSlotExtractResult(
            group_id=feature_result.group_id,
            background_path=feature_result.background_path,
            image_size=feature_result.image_size,
            target_size=feature_result.target_size,
            slot_count=slot_count,
            slots=slots,
            stats={
                "slot_count": slot_count,
                "filled_slots": sum(1 for slot in slots if slot.present),
                "glyph_count": feature_result.stats["glyph_count"],
                "component_count": feature_result.stats["component_count"],
            },
        )

    def extract_font_glyph_slots_dict(
        self,
        captcha_path: str,
        slot_count: int = 5,
        target_width: int = 32,
        target_height: int = 32,
        keep_aspect_ratio: bool = True,
    ) -> Dict:
        return asdict(
            self.extract_font_glyph_slots(
                captcha_path=captcha_path,
                slot_count=slot_count,
                target_width=target_width,
                target_height=target_height,
                keep_aspect_ratio=keep_aspect_ratio,
            )
        )

    def export_font_glyph_images(
        self,
        captcha_path: str,
        output_dir: str,
        file_prefix: Optional[str] = None,
    ) -> FontGlyphImageExportResult:
        glyph_result = self.extract_font_glyphs(
            captcha_path=captcha_path,
            include_pixels=False,
            include_rgba_2d=True,
        )
        prefix = file_prefix or Path(captcha_path).stem
        return export_font_glyph_images(
            group_id=glyph_result.group_id,
            background_path=glyph_result.background_path,
            image_size=glyph_result.image_size,
            glyphs=glyph_result.glyphs,
            output_dir=output_dir,
            file_prefix=prefix,
        )

    def export_font_glyph_images_dict(
        self,
        captcha_path: str,
        output_dir: str,
        file_prefix: Optional[str] = None,
    ) -> Dict:
        return asdict(
            self.export_font_glyph_images(
                captcha_path=captcha_path,
                output_dir=output_dir,
                file_prefix=file_prefix,
            )
        )
