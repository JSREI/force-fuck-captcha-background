"""Pytest configuration and fixtures."""

import pytest
from pathlib import Path
from PIL import Image
import tempfile
import shutil


@pytest.fixture
def temp_dir():
    """Create a temporary directory for tests."""
    tmp_path = Path(tempfile.mkdtemp())
    yield tmp_path
    shutil.rmtree(tmp_path)


@pytest.fixture
def sample_background_dir(temp_dir):
    """Create a sample background directory with test images."""
    bg_dir = temp_dir / "backgrounds"
    bg_dir.mkdir()

    # Create background images with different corner colors
    for i in range(3):
        img = Image.new('RGBA', (200, 100))
        pixels = img.load()
        corner_color = (i * 50, i * 50, i * 50, 255)
        for y in range(100):
            for x in range(200):
                pixels[x, y] = corner_color
        img.save(bg_dir / f"bg_{i}.png")

    return str(bg_dir)


@pytest.fixture
def sample_captcha_image(temp_dir):
    """Create a sample captcha image."""
    img = Image.new('RGBA', (200, 100), color=(100, 100, 100, 255))
    pixels = img.load()

    # Add some "text" pixels
    for y in range(40, 60):
        for x in range(50, 70):
            pixels[x, y] = (0, 0, 0, 255)

    captcha_path = temp_dir / "captcha.png"
    img.save(captcha_path)
    return str(captcha_path)


@pytest.fixture
def sample_slider_captcha(temp_dir):
    """Create a sample slider captcha image."""
    img = Image.new('RGBA', (200, 100), color=(100, 100, 100, 255))
    pixels = img.load()

    # Add a "gap" region
    for y in range(30, 70):
        for x in range(80, 120):
            pixels[x, y] = (0, 0, 0, 255)

    captcha_path = temp_dir / "slider_captcha.png"
    img.save(captcha_path)
    return str(captcha_path)
