from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, List, Literal, Optional, Tuple, Union


RGB = Tuple[int, int, int]
RGBA = Tuple[int, int, int, int]
BBox = Tuple[int, int, int, int]  # left, top, right, bottom (inclusive)
Pixel = Tuple[int, int]  # x, y
CaptchaType = Literal["font", "slider"]


@dataclass(frozen=True)
class BackgroundMeta:
    group_id: str
    image_path: str
    width: int
    height: int


@dataclass
class FontComponent:
    color: RGB
    bbox: BBox
    pixel_count: int
    pixels: List[Pixel]


@dataclass
class LocateResult:
    group_id: str
    background_path: str
    image_size: Tuple[int, int]
    components: List[FontComponent]
    stats: Dict[str, int]


@dataclass
class SliderGap:
    bbox: BBox
    center: Pixel
    pixel_count: int


@dataclass
class SliderLocateResult:
    group_id: str
    background_path: str
    image_size: Tuple[int, int]
    gap: Optional[SliderGap]
    stats: Dict[str, int]


@dataclass
class TextRegion:
    bbox: BBox
    pixel_count: int
    component_count: int
    colors: List[RGB]
    score: float
    pixels: List[Pixel]


@dataclass
class TextLocateResult:
    group_id: str
    background_path: str
    image_size: Tuple[int, int]
    regions: List[TextRegion]
    stats: Dict[str, int]


@dataclass
class TextLayerResult:
    group_id: str
    background_path: str
    image_size: Tuple[int, int]
    text_bbox: Optional[BBox]
    text_pixel_count: int
    output_path: Optional[str]
    stats: Dict[str, int]


@dataclass
class BackgroundRestoreResult:
    group_id: str
    background_path: str
    image_size: Tuple[int, int]
    output_path: Optional[str]


@dataclass
class FontGlyph:
    rect_index: int
    bbox: BBox
    width: int
    height: int
    color: RGB
    pixel_count: int
    pixels: List[Pixel]
    bitmap_2d: List[List[int]]
    rgba_2d: Optional[List[List[RGBA]]]


@dataclass
class FontGlyphExtractResult:
    group_id: str
    background_path: str
    image_size: Tuple[int, int]
    glyphs: List[FontGlyph]
    stats: Dict[str, int]


@dataclass
class FontGlyphFeature:
    rect_index: int
    bbox: BBox
    width: int
    height: int
    color: RGB
    pixel_count: int
    density: float
    bitmap_2d: List[List[int]]
    resized_bitmap_2d: List[List[int]]
    vector_1d: List[int]


@dataclass
class FontGlyphFeatureExtractResult:
    group_id: str
    background_path: str
    image_size: Tuple[int, int]
    target_size: Tuple[int, int]
    glyph_features: List[FontGlyphFeature]
    stats: Dict[str, int]


@dataclass
class BatchGlyphExtractItem:
    captcha_path: str
    status: Literal["ok", "error"]
    group_id: Optional[str]
    glyph_count: int
    error: Optional[str]
    result: Optional[FontGlyphFeatureExtractResult]


@dataclass
class BatchGlyphExtractResult:
    input_dir: str
    total_files: int
    processed_files: int
    success_count: int
    error_count: int
    target_size: Tuple[int, int]
    items: List[BatchGlyphExtractItem]


@dataclass
class GlyphDatasetExportResult:
    input_dir: str
    total_files: int
    processed_files: int
    success_count: int
    error_count: int
    glyph_sample_count: int
    target_size: Tuple[int, int]
    output_npz_path: str
    output_json_path: Optional[str]


@dataclass
class FontGlyphSlot:
    slot_index: int
    present: bool
    rect_index: Optional[int]
    bbox: Optional[BBox]
    vector_1d: List[int]
    density: float


@dataclass
class FontGlyphSlotExtractResult:
    group_id: str
    background_path: str
    image_size: Tuple[int, int]
    target_size: Tuple[int, int]
    slot_count: int
    slots: List[FontGlyphSlot]
    stats: Dict[str, int]


@dataclass
class FontGlyphImageItem:
    rect_index: int
    bbox: BBox
    image_path: str
    width: int
    height: int
    pixel_count: int


@dataclass
class FontGlyphImageExportResult:
    group_id: str
    background_path: str
    image_size: Tuple[int, int]
    output_dir: str
    glyph_images: List[FontGlyphImageItem]
    stats: Dict[str, int]


RecognitionResult = Union[LocateResult, SliderLocateResult, TextLocateResult]
