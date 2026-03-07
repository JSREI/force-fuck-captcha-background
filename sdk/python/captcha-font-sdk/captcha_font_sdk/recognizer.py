from __future__ import annotations

from dataclasses import asdict
import json
from pathlib import Path
from typing import Dict, Iterable, Optional

from .background_index import (
    build_background_index as _build_background_index,
    build_background_index_from_files,
)
from .font_glyph_batch import batch_extract_font_glyph_features
from .font_glyph_dataset import export_glyph_dataset_npz
from .local_restore_runner import run_local_restore
from .local_restore_types import LocalRestoreConfig, ProgressCallback, StopChecker
from .locator import CaptchaFontLocator
from .slider_locator import CaptchaSliderLocator
from .types import BackgroundMeta, CaptchaType, RecognitionResult


class CaptchaRecognizer:
    """Facade API for both font captcha and slider captcha."""

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
        )
        self.slider = CaptchaSliderLocator(
            diff_threshold=diff_threshold,
            min_gap_pixels=slider_min_gap_pixels,
            connectivity=connectivity,
        )

    @property
    def backgrounds(self) -> Dict[str, BackgroundMeta]:
        return self.font.backgrounds

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
    ):
        return self.font.export_font_glyph_images(
            captcha_path=captcha_path,
            output_dir=output_dir,
            file_prefix=file_prefix,
        )

    def export_font_glyph_images_dict(
        self,
        captcha_path: str,
        output_dir: str,
        file_prefix: Optional[str] = None,
    ) -> Dict:
        return self.font.export_font_glyph_images_dict(
            captcha_path=captcha_path,
            output_dir=output_dir,
            file_prefix=file_prefix,
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
        captcha_type: CaptchaType,
        include_pixels: bool = True,
    ) -> RecognitionResult:
        if captcha_type == "font":
            return self.recognize_font(captcha_path, include_pixels=include_pixels)
        if captcha_type == "slider":
            return self.recognize_slider(captcha_path)
        raise ValueError(f"unsupported captcha_type: {captcha_type}")

    def recognize_dict(
        self,
        captcha_path: str,
        captcha_type: CaptchaType,
        include_pixels: bool = True,
    ) -> Dict:
        return asdict(self.recognize(captcha_path, captcha_type=captcha_type, include_pixels=include_pixels))
