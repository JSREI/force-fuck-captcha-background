from __future__ import annotations

from dataclasses import asdict
import json
from pathlib import Path
from typing import Dict, Iterable, List, Optional

from .background_index import (
    build_background_index as _build_background_index,
    build_background_index_from_files,
    load_rgba_pixels,
)
from .background_feature_engine import (
    extract_background_deep_vector,
    extract_background_texture_metrics,
)
from .font_glyph_batch import batch_extract_font_glyph_features
from .font_glyph_dataset import export_glyph_dataset_npz
from .foreground_skew import estimate_foreground_skew as estimate_foreground_skew_pixels
from .local_restore_runner import run_local_restore
from .local_restore_types import LocalRestoreConfig, ProgressCallback, StopChecker
from .locator import CaptchaFontLocator
from .patch_extractor import extract_patch
from .slider_locator import CaptchaSliderLocator
from .types import (
    CaptchaAutoResult,
    BackgroundDeepFeatureResult,
    BackgroundMeta,
    BackgroundTextureResult,
    CaptchaType,
    CaptchaTypeLike,
    ForegroundSkewEstimateResult,
    GlyphRenderMode,
    GlyphRenderModeLike,
    RecognitionResult,
    normalize_captcha_type,
)


class CaptchaRecognizer:
    """Facade API for text captcha and slider captcha."""

    def __init__(
        self,
        diff_threshold: int = 18,
        font_min_component_pixels: int = 8,
        slider_min_gap_pixels: int = 20,
        connectivity: int = 8,
        text_min_width: int = 3,
        text_min_height: int = 3,
        text_min_fill_ratio: float = 0.06,
        text_max_fill_ratio: float = 0.95,
        text_merge_gap: int = 2,
        text_min_vertical_overlap_ratio: float = 0.4,
        text_expected_region_count: Optional[int] = 4,
        text_force_merge_max_gap: int = 28,
    ) -> None:
        self.font = CaptchaFontLocator(
            diff_threshold=diff_threshold,
            min_component_pixels=font_min_component_pixels,
            connectivity=connectivity,
            text_min_width=text_min_width,
            text_min_height=text_min_height,
            text_min_fill_ratio=text_min_fill_ratio,
            text_max_fill_ratio=text_max_fill_ratio,
            text_merge_gap=text_merge_gap,
            text_min_vertical_overlap_ratio=text_min_vertical_overlap_ratio,
            text_expected_region_count=text_expected_region_count,
            text_force_merge_max_gap=text_force_merge_max_gap,
        )
        self.slider = CaptchaSliderLocator(
            diff_threshold=diff_threshold,
            min_gap_pixels=slider_min_gap_pixels,
            connectivity=connectivity,
        )

    @property
    def backgrounds(self) -> Dict[str, BackgroundMeta]:
        return self.font.backgrounds

    def _resolve_background_for_captcha(
        self,
        captcha_path: str,
    ) -> tuple[str, str, tuple[int, int]]:
        restored = self.font.restore_background(captcha_path=captcha_path, output_path=None)
        return restored.group_id, restored.background_path, restored.image_size

    @staticmethod
    def _clamp01(value: float) -> float:
        return max(0.0, min(1.0, value))

    def _decide_captcha_type(
        self,
        text_region_count: int,
        text_pixel_count: int,
        font_component_count: int,
        font_component_pixels: int,
        slider_region_count: int,
        slider_gap_pixels: int,
        slider_gap_width: int,
        slider_gap_height: int,
    ) -> tuple[str, float, float, float, str]:
        text_score = 0.0
        slider_score = 0.0

        if font_component_count > 0:
            text_score += min(float(font_component_count), 10.0) * 0.9
        if font_component_count >= 3:
            text_score += 2.0
        text_score += min(float(font_component_pixels) / 120.0, 6.0)

        if text_region_count > 0:
            text_score += min(float(text_region_count), 8.0) * 1.2
        if 2 <= text_region_count <= 8:
            text_score += 2.0
        text_score += min(float(text_pixel_count) / 70.0, 8.0)

        if slider_gap_pixels > 0:
            if slider_gap_pixels >= 180:
                slider_score += 3.0 + min(float(slider_gap_pixels) / 80.0, 10.0)
            else:
                slider_score += min(float(slider_gap_pixels) / 120.0, 1.5)
        slider_score += min(float(slider_region_count), 6.0) * 0.6
        if slider_gap_width > 0 and slider_gap_height > 0:
            ratio = min(slider_gap_width, slider_gap_height) / max(slider_gap_width, slider_gap_height)
            slider_score += ratio * 2.0
            if ratio < 0.6:
                slider_score -= 0.8

        if slider_gap_pixels > 0 and text_region_count <= 1 and font_component_count <= 1:
            text_score -= 1.5
        if (text_region_count >= 3 or font_component_count >= 3) and slider_gap_pixels > 0:
            slider_score -= 1.0
        if 0 < slider_gap_pixels < 180:
            slider_score -= 1.0
            if text_region_count >= 1:
                text_score += 1.2

        detected_type = "unknown"
        reason = "insufficient foreground evidence for text or slider"
        if text_score > slider_score and text_score > 1.0:
            detected_type = "text"
            reason = (
                f"text_score={text_score:.2f} > slider_score={slider_score:.2f}; "
                f"font_components={font_component_count}, region_count={text_region_count}, text_pixels={text_pixel_count}"
            )
        elif slider_score > text_score and slider_score > 1.0:
            detected_type = "slider"
            reason = (
                f"slider_score={slider_score:.2f} > text_score={text_score:.2f}; "
                f"gap_pixels={slider_gap_pixels}, slider_regions={slider_region_count}, "
                f"gap_size={slider_gap_width}x{slider_gap_height}, font_components={font_component_count}"
            )

        denom = max(1.0, abs(text_score) + abs(slider_score))
        confidence = self._clamp01(abs(text_score - slider_score) / denom)
        return detected_type, text_score, slider_score, confidence, reason

    def build_background_index(
        self,
        background_dir: str,
        recursive: bool = True,
        exts: Optional[Iterable[str]] = None,
    ) -> Dict[str, BackgroundMeta]:
        index = _build_background_index(background_dir, recursive=recursive, exts=exts)
        self.font.set_background_index(index)
        self.slider.set_background_index(index)
        return index

    def recognize_font(self, captcha_path: str, include_pixels: bool = True):
        return self.font.locate_fonts(captcha_path, include_pixels=include_pixels)

    def recognize_font_dict(self, captcha_path: str, include_pixels: bool = True) -> Dict:
        return self.font.locate_fonts_dict(captcha_path, include_pixels=include_pixels)

    # Neutral naming alias: "text" is preferred over legacy "font".
    def recognize_text(self, captcha_path: str, include_pixels: bool = True):
        return self.recognize_text_positions(captcha_path, include_pixels=include_pixels)

    def recognize_text_dict(self, captcha_path: str, include_pixels: bool = True) -> Dict:
        return self.recognize_text_positions_dict(captcha_path, include_pixels=include_pixels)

    def recognize_text_positions(self, captcha_path: str, include_pixels: bool = True):
        return self.font.locate_text_positions(captcha_path, include_pixels=include_pixels)

    def recognize_text_positions_dict(self, captcha_path: str, include_pixels: bool = True) -> Dict:
        return self.font.locate_text_positions_dict(captcha_path, include_pixels=include_pixels)

    def extract_text_layer(
        self,
        captcha_path: str,
        output_path: Optional[str] = None,
        crop_to_content: bool = False,
    ):
        return self.font.extract_text_layer(
            captcha_path=captcha_path,
            output_path=output_path,
            crop_to_content=crop_to_content,
        )

    def extract_text_layer_dict(
        self,
        captcha_path: str,
        output_path: Optional[str] = None,
        crop_to_content: bool = False,
    ) -> Dict:
        return self.font.extract_text_layer_dict(
            captcha_path=captcha_path,
            output_path=output_path,
            crop_to_content=crop_to_content,
        )

    def restore_background_by_captcha(
        self,
        captcha_path: str,
        output_path: Optional[str] = None,
    ):
        return self.font.restore_background_by_captcha(
            captcha_path=captcha_path,
            output_path=output_path,
        )

    def restore_background_by_captcha_dict(
        self,
        captcha_path: str,
        output_path: Optional[str] = None,
    ) -> Dict:
        return self.font.restore_background_by_captcha_dict(
            captcha_path=captcha_path,
            output_path=output_path,
        )

    def extract_font_glyphs(
        self,
        captcha_path: str,
        include_pixels: bool = True,
        include_rgba_2d: bool = False,
    ):
        return self.font.extract_font_glyphs(
            captcha_path=captcha_path,
            include_pixels=include_pixels,
            include_rgba_2d=include_rgba_2d,
        )

    def extract_font_glyphs_dict(
        self,
        captcha_path: str,
        include_pixels: bool = True,
        include_rgba_2d: bool = False,
    ) -> Dict:
        return self.font.extract_font_glyphs_dict(
            captcha_path=captcha_path,
            include_pixels=include_pixels,
            include_rgba_2d=include_rgba_2d,
        )

    def extract_font_glyph_features(
        self,
        captcha_path: str,
        target_width: int = 32,
        target_height: int = 32,
        keep_aspect_ratio: bool = True,
    ):
        return self.font.extract_font_glyph_features(
            captcha_path=captcha_path,
            target_width=target_width,
            target_height=target_height,
            keep_aspect_ratio=keep_aspect_ratio,
        )

    def extract_font_glyph_features_dict(
        self,
        captcha_path: str,
        target_width: int = 32,
        target_height: int = 32,
        keep_aspect_ratio: bool = True,
    ) -> Dict:
        return self.font.extract_font_glyph_features_dict(
            captcha_path=captcha_path,
            target_width=target_width,
            target_height=target_height,
            keep_aspect_ratio=keep_aspect_ratio,
        )

    def extract_font_glyph_slots(
        self,
        captcha_path: str,
        slot_count: int = 5,
        target_width: int = 32,
        target_height: int = 32,
        keep_aspect_ratio: bool = True,
    ):
        return self.font.extract_font_glyph_slots(
            captcha_path=captcha_path,
            slot_count=slot_count,
            target_width=target_width,
            target_height=target_height,
            keep_aspect_ratio=keep_aspect_ratio,
        )

    def extract_font_glyph_slots_dict(
        self,
        captcha_path: str,
        slot_count: int = 5,
        target_width: int = 32,
        target_height: int = 32,
        keep_aspect_ratio: bool = True,
    ) -> Dict:
        return self.font.extract_font_glyph_slots_dict(
            captcha_path=captcha_path,
            slot_count=slot_count,
            target_width=target_width,
            target_height=target_height,
            keep_aspect_ratio=keep_aspect_ratio,
        )

    def export_font_glyph_images(
        self,
        captcha_path: str,
        output_dir: str,
        file_prefix: Optional[str] = None,
        render_mode: GlyphRenderModeLike = GlyphRenderMode.ORIGINAL,
        use_text_regions: bool = False,
    ):
        return self.font.export_font_glyph_images(
            captcha_path=captcha_path,
            output_dir=output_dir,
            file_prefix=file_prefix,
            render_mode=render_mode,
            use_text_regions=use_text_regions,
        )

    def export_font_glyph_images_dict(
        self,
        captcha_path: str,
        output_dir: str,
        file_prefix: Optional[str] = None,
        render_mode: GlyphRenderModeLike = GlyphRenderMode.ORIGINAL,
        use_text_regions: bool = False,
    ) -> Dict:
        return self.font.export_font_glyph_images_dict(
            captcha_path=captcha_path,
            output_dir=output_dir,
            file_prefix=file_prefix,
            render_mode=render_mode,
            use_text_regions=use_text_regions,
        )

    def export_text_glyph_images(
        self,
        captcha_path: str,
        output_dir: str,
        file_prefix: Optional[str] = None,
        render_mode: GlyphRenderModeLike = GlyphRenderMode.ORIGINAL,
    ):
        return self.font.export_text_glyph_images(
            captcha_path=captcha_path,
            output_dir=output_dir,
            file_prefix=file_prefix,
            render_mode=render_mode,
        )

    def export_text_glyph_images_dict(
        self,
        captcha_path: str,
        output_dir: str,
        file_prefix: Optional[str] = None,
        render_mode: GlyphRenderModeLike = GlyphRenderMode.ORIGINAL,
    ) -> Dict:
        return self.font.export_text_glyph_images_dict(
            captcha_path=captcha_path,
            output_dir=output_dir,
            file_prefix=file_prefix,
            render_mode=render_mode,
        )

    def batch_extract_font_glyph_features(
        self,
        input_dir: str,
        target_width: int = 32,
        target_height: int = 32,
        recursive: bool = True,
        exts: Optional[Iterable[str]] = None,
        limit: Optional[int] = None,
        include_payload: bool = False,
        continue_on_error: bool = True,
    ):
        return batch_extract_font_glyph_features(
            input_dir=input_dir,
            extractor=lambda captcha_path: self.font.extract_font_glyph_features(
                captcha_path=captcha_path,
                target_width=target_width,
                target_height=target_height,
                keep_aspect_ratio=True,
            ),
            target_width=target_width,
            target_height=target_height,
            recursive=recursive,
            exts=exts,
            limit=limit,
            include_payload=include_payload,
            continue_on_error=continue_on_error,
        )

    def batch_extract_font_glyph_features_dict(
        self,
        input_dir: str,
        target_width: int = 32,
        target_height: int = 32,
        recursive: bool = True,
        exts: Optional[Iterable[str]] = None,
        limit: Optional[int] = None,
        include_payload: bool = False,
        continue_on_error: bool = True,
        output_json_path: Optional[str] = None,
    ) -> Dict:
        result = self.batch_extract_font_glyph_features(
            input_dir=input_dir,
            target_width=target_width,
            target_height=target_height,
            recursive=recursive,
            exts=exts,
            limit=limit,
            include_payload=include_payload,
            continue_on_error=continue_on_error,
        )
        data = asdict(result)
        if output_json_path:
            output = Path(output_json_path)
            if output.parent and not output.parent.exists():
                output.parent.mkdir(parents=True, exist_ok=True)
            output.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
        return data

    def export_font_glyph_dataset_npz(
        self,
        input_dir: str,
        output_npz_path: str,
        target_width: int = 32,
        target_height: int = 32,
        recursive: bool = True,
        exts: Optional[Iterable[str]] = None,
        limit: Optional[int] = None,
        continue_on_error: bool = True,
        output_json_path: Optional[str] = None,
    ):
        batch_result = self.batch_extract_font_glyph_features(
            input_dir=input_dir,
            target_width=target_width,
            target_height=target_height,
            recursive=recursive,
            exts=exts,
            limit=limit,
            include_payload=True,
            continue_on_error=continue_on_error,
        )
        return export_glyph_dataset_npz(
            batch_result=batch_result,
            output_npz_path=output_npz_path,
            output_json_path=output_json_path,
        )

    def export_font_glyph_dataset_npz_dict(
        self,
        input_dir: str,
        output_npz_path: str,
        target_width: int = 32,
        target_height: int = 32,
        recursive: bool = True,
        exts: Optional[Iterable[str]] = None,
        limit: Optional[int] = None,
        continue_on_error: bool = True,
        output_json_path: Optional[str] = None,
    ) -> Dict:
        return asdict(
            self.export_font_glyph_dataset_npz(
                input_dir=input_dir,
                output_npz_path=output_npz_path,
                target_width=target_width,
                target_height=target_height,
                recursive=recursive,
                exts=exts,
                limit=limit,
                continue_on_error=continue_on_error,
                output_json_path=output_json_path,
            )
        )

    def recognize_auto(
        self,
        captcha_path: str,
        background_dir: Optional[str] = None,
        include_pixels: bool = True,
        text_layer_output_path: Optional[str] = None,
        text_glyph_output_dir: Optional[str] = None,
        slider_gap_output_path: Optional[str] = None,
        slider_background_patch_output_path: Optional[str] = None,
        slider_patch_padding: int = 2,
    ) -> CaptchaAutoResult:
        if background_dir:
            self.build_background_index(background_dir)

        text_result = self.recognize_text_positions(
            captcha_path=captcha_path,
            include_pixels=include_pixels,
        )
        font_result = self.recognize_font(
            captcha_path=captcha_path,
            include_pixels=include_pixels,
        )
        slider_result = self.recognize_slider(captcha_path=captcha_path)

        text_region_count = int(text_result.stats.get("region_count", 0))
        text_pixel_count = int(text_result.stats.get("text_pixel_count", 0))
        font_component_count = int(font_result.stats.get("component_count", 0))
        font_component_pixels = int(sum(component.pixel_count for component in font_result.components))
        slider_region_count = int(slider_result.stats.get("region_count", 0))
        slider_gap_pixels = int(slider_result.gap.pixel_count) if slider_result.gap else 0
        slider_gap_width = 0
        slider_gap_height = 0
        if slider_result.gap:
            left, top, right, bottom = slider_result.gap.bbox
            slider_gap_width = right - left + 1
            slider_gap_height = bottom - top + 1

        detected_type, text_score, slider_score, confidence, reason = self._decide_captcha_type(
            text_region_count=text_region_count,
            text_pixel_count=text_pixel_count,
            font_component_count=font_component_count,
            font_component_pixels=font_component_pixels,
            slider_region_count=slider_region_count,
            slider_gap_pixels=slider_gap_pixels,
            slider_gap_width=slider_gap_width,
            slider_gap_height=slider_gap_height,
        )

        text_payload: Dict = {
            "locate": asdict(text_result),
            "components": asdict(font_result),
        }
        if text_layer_output_path:
            text_payload["text_layer"] = self.extract_text_layer_dict(
                captcha_path=captcha_path,
                output_path=text_layer_output_path,
                crop_to_content=False,
            )
        else:
            text_payload["text_layer"] = None
        if text_glyph_output_dir:
            text_payload["glyph_images"] = self.export_text_glyph_images_dict(
                captcha_path=captcha_path,
                output_dir=text_glyph_output_dir,
                render_mode=GlyphRenderMode.ORIGINAL,
            )
        else:
            text_payload["glyph_images"] = None

        slider_payload: Dict = {"locate": asdict(slider_result)}
        gap_patch = None
        background_patch = None
        if slider_result.gap:
            if slider_gap_output_path:
                gap_patch = extract_patch(
                    image_path=captcha_path,
                    bbox=slider_result.gap.bbox,
                    output_path=slider_gap_output_path,
                    padding=slider_patch_padding,
                )
            if slider_background_patch_output_path:
                background_patch = extract_patch(
                    image_path=slider_result.background_path,
                    bbox=slider_result.gap.bbox,
                    output_path=slider_background_patch_output_path,
                    padding=slider_patch_padding,
                )
        slider_payload["gap_patch"] = gap_patch
        slider_payload["background_patch"] = background_patch

        return CaptchaAutoResult(
            detected_type=detected_type,  # text | slider | unknown
            confidence=confidence,
            reason=reason,
            group_id=text_result.group_id,
            background_path=text_result.background_path,
            image_size=text_result.image_size,
            text_score=text_score,
            slider_score=slider_score,
            text_payload=text_payload,
            slider_payload=slider_payload,
            stats={
                "text_region_count": float(text_region_count),
                "text_pixel_count": float(text_pixel_count),
                "font_component_count": float(font_component_count),
                "font_component_pixels": float(font_component_pixels),
                "slider_region_count": float(slider_region_count),
                "slider_gap_pixels": float(slider_gap_pixels),
                "slider_gap_width": float(slider_gap_width),
                "slider_gap_height": float(slider_gap_height),
            },
        )

    def recognize_auto_dict(
        self,
        captcha_path: str,
        background_dir: Optional[str] = None,
        include_pixels: bool = True,
        text_layer_output_path: Optional[str] = None,
        text_glyph_output_dir: Optional[str] = None,
        slider_gap_output_path: Optional[str] = None,
        slider_background_patch_output_path: Optional[str] = None,
        slider_patch_padding: int = 2,
    ) -> Dict:
        return asdict(
            self.recognize_auto(
                captcha_path=captcha_path,
                background_dir=background_dir,
                include_pixels=include_pixels,
                text_layer_output_path=text_layer_output_path,
                text_glyph_output_dir=text_glyph_output_dir,
                slider_gap_output_path=slider_gap_output_path,
                slider_background_patch_output_path=slider_background_patch_output_path,
                slider_patch_padding=slider_patch_padding,
            )
        )

    def analyze_background_texture(
        self,
        captcha_path: str,
        grid_rows: int = 4,
        grid_cols: int = 4,
        histogram_bins: int = 16,
        edge_threshold: float = 18.0,
    ) -> BackgroundTextureResult:
        group_id, background_path, image_size = self._resolve_background_for_captcha(captcha_path)
        width, height, background_pixels = load_rgba_pixels(background_path)
        metrics = extract_background_texture_metrics(
            rgba_pixels=background_pixels,
            width=width,
            height=height,
            grid_rows=grid_rows,
            grid_cols=grid_cols,
            histogram_bins=histogram_bins,
            edge_threshold=edge_threshold,
        )
        return BackgroundTextureResult(
            group_id=group_id,
            background_path=background_path,
            image_size=image_size,
            mean_intensity=metrics["mean_intensity"],
            std_intensity=metrics["std_intensity"],
            entropy=metrics["entropy"],
            edge_density=metrics["edge_density"],
            histogram=metrics["histogram"],
            grid_energy=metrics["grid_energy"],
            stats=metrics["stats"],
        )

    def analyze_background_texture_dict(
        self,
        captcha_path: str,
        grid_rows: int = 4,
        grid_cols: int = 4,
        histogram_bins: int = 16,
        edge_threshold: float = 18.0,
    ) -> Dict:
        return asdict(
            self.analyze_background_texture(
                captcha_path=captcha_path,
                grid_rows=grid_rows,
                grid_cols=grid_cols,
                histogram_bins=histogram_bins,
                edge_threshold=edge_threshold,
            )
        )

    def extract_background_deep_features(
        self,
        captcha_path: str,
        levels: Optional[Iterable[int]] = None,
        edge_threshold: float = 18.0,
    ) -> BackgroundDeepFeatureResult:
        group_id, background_path, image_size = self._resolve_background_for_captcha(captcha_path)
        width, height, background_pixels = load_rgba_pixels(background_path)
        deep_features = extract_background_deep_vector(
            rgba_pixels=background_pixels,
            width=width,
            height=height,
            levels=levels,
            edge_threshold=edge_threshold,
        )
        return BackgroundDeepFeatureResult(
            group_id=group_id,
            background_path=background_path,
            image_size=image_size,
            levels=deep_features["levels"],
            patch_count=deep_features["patch_count"],
            vector_1d=deep_features["vector_1d"],
            stats=deep_features["stats"],
        )

    def extract_background_deep_features_dict(
        self,
        captcha_path: str,
        levels: Optional[Iterable[int]] = None,
        edge_threshold: float = 18.0,
    ) -> Dict:
        return asdict(
            self.extract_background_deep_features(
                captcha_path=captcha_path,
                levels=levels,
                edge_threshold=edge_threshold,
            )
        )

    def estimate_foreground_skew(
        self,
        captcha_path: str,
        min_pixels: int = 20,
        max_abs_angle: float = 45.0,
    ) -> ForegroundSkewEstimateResult:
        text_result = self.recognize_text_positions(captcha_path=captcha_path, include_pixels=True)
        foreground_pixels: List[tuple[int, int]] = []
        for region in text_result.regions:
            foreground_pixels.extend(region.pixels)

        skew = estimate_foreground_skew_pixels(
            pixels=foreground_pixels,
            min_pixels=min_pixels,
            max_abs_angle=max_abs_angle,
        )
        return ForegroundSkewEstimateResult(
            group_id=text_result.group_id,
            background_path=text_result.background_path,
            image_size=text_result.image_size,
            angle_degrees=skew["angle_degrees"],
            confidence=skew["confidence"],
            pixel_count=skew["pixel_count"],
            eigen_ratio=skew["eigen_ratio"],
        )

    def estimate_foreground_skew_dict(
        self,
        captcha_path: str,
        min_pixels: int = 20,
        max_abs_angle: float = 45.0,
    ) -> Dict:
        return asdict(
            self.estimate_foreground_skew(
                captcha_path=captcha_path,
                min_pixels=min_pixels,
                max_abs_angle=max_abs_angle,
            )
        )

    def recognize_slider(self, captcha_path: str):
        return self.slider.locate_gap(captcha_path)

    def recognize_slider_dict(self, captcha_path: str) -> Dict:
        return self.slider.locate_gap_dict(captcha_path)

    def run_local_restore(
        self,
        input_dir: str,
        output_dir: str,
        clear_output_before_run: bool = False,
        recursive: bool = True,
        max_error_items: int = 200,
        progress_callback: Optional[ProgressCallback] = None,
        stop_checker: Optional[StopChecker] = None,
    ):
        summary = run_local_restore(
            LocalRestoreConfig(
                input_dir=input_dir,
                output_dir=output_dir,
                clear_output_before_run=clear_output_before_run,
                recursive=recursive,
                max_error_items=max_error_items,
            ),
            progress_callback=progress_callback,
            stop_checker=stop_checker,
        )
        if summary.output_files > 0:
            index = build_background_index_from_files([bucket.output_path for bucket in summary.buckets])
            self.font.set_background_index(index)
            self.slider.set_background_index(index)
        return summary

    def run_local_restore_dict(
        self,
        input_dir: str,
        output_dir: str,
        clear_output_before_run: bool = False,
        recursive: bool = True,
        max_error_items: int = 200,
        progress_callback: Optional[ProgressCallback] = None,
        stop_checker: Optional[StopChecker] = None,
    ) -> Dict:
        return asdict(
            self.run_local_restore(
                input_dir=input_dir,
                output_dir=output_dir,
                clear_output_before_run=clear_output_before_run,
                recursive=recursive,
                max_error_items=max_error_items,
                progress_callback=progress_callback,
                stop_checker=stop_checker,
            )
        )

    def recognize(
        self,
        captcha_path: str,
        captcha_type: CaptchaTypeLike = CaptchaType.TEXT,
        include_pixels: bool = True,
    ) -> RecognitionResult:
        normalized_type = normalize_captcha_type(captcha_type)
        if normalized_type == CaptchaType.TEXT:
            return self.recognize_text_positions(captcha_path, include_pixels=include_pixels)
        if normalized_type == CaptchaType.FONT:
            return self.recognize_font(captcha_path, include_pixels=include_pixels)
        if normalized_type == CaptchaType.SLIDER:
            return self.recognize_slider(captcha_path)
        raise ValueError(f"unsupported captcha_type: {captcha_type}")

    def recognize_dict(
        self,
        captcha_path: str,
        captcha_type: CaptchaTypeLike = CaptchaType.TEXT,
        include_pixels: bool = True,
    ) -> Dict:
        return asdict(self.recognize(captcha_path, captcha_type=captcha_type, include_pixels=include_pixels))
