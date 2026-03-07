from __future__ import annotations

from dataclasses import dataclass
from enum import Enum
from typing import Dict, List, Literal, Optional, Tuple, Union


RGB = Tuple[int, int, int]
RGBA = Tuple[int, int, int, int]
BBox = Tuple[int, int, int, int]  # left, top, right, bottom (inclusive)
Pixel = Tuple[int, int]  # x, y


class CaptchaType(str, Enum):
    """Supported captcha modes in the unified recognize API."""

    TEXT = "text"
    # Kept for backward compatibility with older font-oriented API naming.
    FONT = "font"
    SLIDER = "slider"


class GlyphRenderMode(str, Enum):
    """Render modes for exported glyph PNG images."""

    ORIGINAL = "original"
    BLACK_ON_TRANSPARENT = "black_on_transparent"
    BLACK_ON_WHITE = "black_on_white"
    WHITE_ON_BLACK = "white_on_black"


CaptchaTypeLike = Union[CaptchaType, Literal["text", "font", "slider"], str]
GlyphRenderModeLike = Union[
    GlyphRenderMode,
    Literal["original", "black_on_transparent", "black_on_white", "white_on_black"],
    str,
]


def normalize_captcha_type(captcha_type: CaptchaTypeLike) -> CaptchaType:
    if isinstance(captcha_type, CaptchaType):
        return captcha_type
    value = str(captcha_type).strip().lower()
    if value == CaptchaType.TEXT.value:
        return CaptchaType.TEXT
    if value == CaptchaType.FONT.value:
        return CaptchaType.FONT
    if value == CaptchaType.SLIDER.value:
        return CaptchaType.SLIDER
    raise ValueError(
        "captcha_type must be CaptchaType.TEXT/FONT/SLIDER "
        "or one of 'text'/'font'/'slider'"
    )


def normalize_glyph_render_mode(render_mode: GlyphRenderModeLike) -> GlyphRenderMode:
    if isinstance(render_mode, GlyphRenderMode):
        return render_mode
    value = str(render_mode).strip().lower()
    if value == GlyphRenderMode.ORIGINAL.value:
        return GlyphRenderMode.ORIGINAL
    if value == GlyphRenderMode.BLACK_ON_TRANSPARENT.value:
        return GlyphRenderMode.BLACK_ON_TRANSPARENT
    if value == GlyphRenderMode.BLACK_ON_WHITE.value:
        return GlyphRenderMode.BLACK_ON_WHITE
    if value == GlyphRenderMode.WHITE_ON_BLACK.value:
        return GlyphRenderMode.WHITE_ON_BLACK
    raise ValueError(
        "render_mode must be GlyphRenderMode.ORIGINAL/BLACK_ON_TRANSPARENT/"
        "BLACK_ON_WHITE/WHITE_ON_BLACK or one of "
        "'original'/'black_on_transparent'/'black_on_white'/'white_on_black'"
    )


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


@dataclass
class BackgroundTextureResult:
    group_id: str
    background_path: str
    image_size: Tuple[int, int]
    mean_intensity: float
    std_intensity: float
    entropy: float
    edge_density: float
    histogram: List[float]
    grid_energy: List[float]
    stats: Dict[str, float]


@dataclass
class BackgroundDeepFeatureResult:
    group_id: str
    background_path: str
    image_size: Tuple[int, int]
    levels: List[int]
    patch_count: int
    vector_1d: List[float]
    stats: Dict[str, float]


@dataclass
class ForegroundSkewEstimateResult:
    group_id: str
    background_path: str
    image_size: Tuple[int, int]
    angle_degrees: float
    confidence: float
    pixel_count: int
    eigen_ratio: float


RecognitionResult = Union[LocateResult, SliderLocateResult, TextLocateResult]
