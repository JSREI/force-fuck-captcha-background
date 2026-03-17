"""Tests for captcha_background_sdk."""

import pytest
from pathlib import Path
from PIL import Image

from captcha_background_sdk import (
    CaptchaRecognizer,
    CaptchaFontLocator,
    CaptchaSliderLocator,
    CaptchaType,
    GlyphRenderMode,
    normalize_captcha_type,
    normalize_glyph_render_mode,
)


class TestTypes:
    """Test type definitions and utilities."""

    def test_captcha_type_enum(self):
        assert CaptchaType.TEXT.value == "text"
        assert CaptchaType.FONT.value == "font"
        assert CaptchaType.SLIDER.value == "slider"

    def test_normalize_captcha_type(self):
        assert normalize_captcha_type(CaptchaType.TEXT) == CaptchaType.TEXT
        assert normalize_captcha_type("text") == CaptchaType.TEXT
        assert normalize_captcha_type("TEXT") == CaptchaType.TEXT
        assert normalize_captcha_type("font") == CaptchaType.FONT
        assert normalize_captcha_type("slider") == CaptchaType.SLIDER

        with pytest.raises(ValueError):
            normalize_captcha_type("invalid")

    def test_glyph_render_mode(self):
        assert GlyphRenderMode.ORIGINAL.value == "original"
        assert GlyphRenderMode.BLACK_ON_TRANSPARENT.value == "black_on_transparent"

    def test_normalize_glyph_render_mode(self):
        assert normalize_glyph_render_mode(GlyphRenderMode.ORIGINAL) == GlyphRenderMode.ORIGINAL
        assert normalize_glyph_render_mode("original") == GlyphRenderMode.ORIGINAL
        assert normalize_glyph_render_mode("black_on_white") == GlyphRenderMode.BLACK_ON_WHITE

        with pytest.raises(ValueError):
            normalize_glyph_render_mode("invalid")


class TestCaptchaRecognizer:
    """Test CaptchaRecognizer class."""

    def test_create_with_defaults(self):
        sdk = CaptchaRecognizer()
        assert sdk.font.diff_threshold == 18
        assert sdk.slider.diff_threshold == 18

    def test_create_with_custom_options(self):
        sdk = CaptchaRecognizer(
            diff_threshold=25,
            font_min_component_pixels=12,
            slider_min_gap_pixels=30,
            connectivity=4,
        )
        assert sdk.font.diff_threshold == 25
        assert sdk.font.min_component_pixels == 12
        assert sdk.slider.min_gap_pixels == 30
        assert sdk.font.connectivity == 4

    def test_backgrounds_property(self):
        sdk = CaptchaRecognizer()
        assert sdk.backgrounds == {}


class TestCaptchaFontLocator:
    """Test CaptchaFontLocator class."""

    def test_create_with_defaults(self):
        locator = CaptchaFontLocator()
        assert locator.diff_threshold == 18
        assert locator.min_component_pixels == 8
        assert locator.connectivity == 8

    def test_invalid_connectivity(self):
        with pytest.raises(ValueError, match="connectivity must be 4 or 8"):
            CaptchaFontLocator(connectivity=6)

    def test_empty_backgrounds(self):
        locator = CaptchaFontLocator()
        assert locator.backgrounds == {}


class TestCaptchaSliderLocator:
    """Test CaptchaSliderLocator class."""

    def test_create_with_defaults(self):
        locator = CaptchaSliderLocator()
        assert locator.diff_threshold == 18
        assert locator.min_gap_pixels == 20
        assert locator.connectivity == 8

    def test_invalid_connectivity(self):
        with pytest.raises(ValueError, match="connectivity must be 4 or 8"):
            CaptchaSliderLocator(connectivity=3)


class TestBackgroundIndex:
    """Test background index building."""

    def test_empty_index(self, tmp_path):
        locator = CaptchaFontLocator()
        index = locator.build_background_index(str(tmp_path))
        assert index == {}

    def test_build_index_with_images(self, tmp_path):
        # Create test images
        for i in range(3):
            img = Image.new('RGB', (100 + i, 100), color=(i * 50, i * 50, i * 50))
            img.save(tmp_path / f"bg_{i}.png")

        locator = CaptchaFontLocator()
        index = locator.build_background_index(str(tmp_path))
        assert len(index) == 3

        # Check all backgrounds are indexed
        for meta in index.values():
            assert Path(meta.image_path).exists()
            assert meta.width > 0
            assert meta.height > 0


class TestGroupID:
    """Test group ID computation."""

    def test_group_id_format(self, tmp_path):
        # Create a test image
        img = Image.new('RGBA', (200, 100), color=(255, 0, 0, 255))
        img_path = tmp_path / "test.png"
        img.save(img_path)

        from captcha_background_sdk.background_index import compute_group_id
        group_id = compute_group_id(str(img_path))

        # Check format: {width}x{height}|lt_r,lt_g,lt_b|rt_r,rt_g,rt_b|lb_r,lb_g,lb_b|rb_r,rb_g,rb_b
        parts = group_id.split("|")
        assert len(parts) == 5
        assert parts[0] == "200x100"

    def test_same_image_same_group_id(self, tmp_path):
        # Create identical images
        img1 = Image.new('RGBA', (200, 100), color=(255, 0, 0, 255))
        img2 = Image.new('RGBA', (200, 100), color=(255, 0, 0, 255))

        path1 = tmp_path / "test1.png"
        path2 = tmp_path / "test2.png"
        img1.save(path1)
        img2.save(path2)

        from captcha_background_sdk.background_index import compute_group_id
        group_id1 = compute_group_id(str(path1))
        group_id2 = compute_group_id(str(path2))

        assert group_id1 == group_id2

    def test_different_corners_different_group_id(self, tmp_path):
        # Create images with different corners
        img1 = Image.new('RGBA', (200, 100), color=(255, 0, 0, 255))
        img2 = Image.new('RGBA', (200, 100), color=(0, 255, 0, 255))

        path1 = tmp_path / "test1.png"
        path2 = tmp_path / "test2.png"
        img1.save(path1)
        img2.save(path2)

        from captcha_background_sdk.background_index import compute_group_id
        group_id1 = compute_group_id(str(path1))
        group_id2 = compute_group_id(str(path2))

        assert group_id1 != group_id2


class TestDiffEngine:
    """Test diff engine."""

    def test_no_diff_for_identical_images(self):
        from captcha_background_sdk.diff_engine import build_diff
        from captcha_background_sdk.background_index import load_rgba_pixels

        # Create two identical pixel arrays
        width, height = 10, 10
        pixels1 = [(255, 0, 0, 255)] * (width * height)
        pixels2 = [(255, 0, 0, 255)] * (width * height)

        diff_mask, _ = build_diff(pixels1, pixels2, width, height, diff_threshold=18)
        assert sum(diff_mask) == 0

    def test_detects_diff_for_different_images(self):
        from captcha_background_sdk.diff_engine import build_diff

        width, height = 10, 10
        pixels1 = [(255, 0, 0, 255)] * (width * height)
        pixels2 = [(0, 255, 0, 255)] * (width * height)

        diff_mask, _ = build_diff(pixels1, pixels2, width, height, diff_threshold=10)
        assert sum(diff_mask) == width * height  # All pixels are different


class TestComponentExtractor:
    """Test component extraction."""

    def test_extract_single_component(self):
        from captcha_background_sdk.component_extractor import extract_components

        width, height = 10, 10
        # Single 2x2 component in center
        diff_mask = [False] * (width * height)
        diff_mask[4 * width + 4] = True
        diff_mask[4 * width + 5] = True
        diff_mask[5 * width + 4] = True
        diff_mask[5 * width + 5] = True

        colors = [(0, 0, 0)] * (width * height)

        components = extract_components(
            diff_mask, colors, width, height,
            connectivity=4, min_component_pixels=1, include_pixels=True, color_sensitive=False
        )

        assert len(components) == 1
        assert components[0].pixel_count == 4

    def test_extract_multiple_components(self):
        from captcha_background_sdk.component_extractor import extract_components

        width, height = 10, 10
        diff_mask = [False] * (width * height)
        # Two separate components
        diff_mask[2 * width + 2] = True
        diff_mask[7 * width + 7] = True

        colors = [(0, 0, 0)] * (width * height)

        components = extract_components(
            diff_mask, colors, width, height,
            connectivity=4, min_component_pixels=1, include_pixels=True, color_sensitive=False
        )

        assert len(components) == 2


class TestCaptchaAutoDetection:
    """Test auto captcha type detection."""

    def test_decide_text_captcha(self):
        sdk = CaptchaRecognizer()

        # High text score scenario
        detected, text_score, slider_score, confidence, reason = sdk._decide_captcha_type(
            text_region_count=4,
            text_pixel_count=500,
            font_component_count=4,
            font_component_pixels=500,
            slider_region_count=0,
            slider_gap_pixels=0,
            slider_gap_width=0,
            slider_gap_height=0,
        )

        assert detected == "text"
        assert confidence > 0.5
        assert "text" in reason.lower()

    def test_decide_slider_captcha(self):
        sdk = CaptchaRecognizer()

        # High slider score scenario
        detected, text_score, slider_score, confidence, reason = sdk._decide_captcha_type(
            text_region_count=0,
            text_pixel_count=0,
            font_component_count=1,
            font_component_pixels=50,
            slider_region_count=1,
            slider_gap_pixels=300,
            slider_gap_width=50,
            slider_gap_height=50,
        )

        assert detected == "slider"
        assert confidence > 0.5
        assert "slider" in reason.lower()

    def test_decide_unknown(self):
        sdk = CaptchaRecognizer()

        # Low scores scenario
        detected, text_score, slider_score, confidence, reason = sdk._decide_captcha_type(
            text_region_count=0,
            text_pixel_count=0,
            font_component_count=0,
            font_component_pixels=0,
            slider_region_count=0,
            slider_gap_pixels=0,
            slider_gap_width=0,
            slider_gap_height=0,
        )

        assert detected == "unknown"
