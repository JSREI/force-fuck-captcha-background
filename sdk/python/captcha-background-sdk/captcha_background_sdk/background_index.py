from __future__ import annotations

from pathlib import Path
from typing import Dict, Iterable, List, Optional, Tuple

from PIL import Image

from .group_id import group_id_from_pixels
from .types import BackgroundMeta


_DEFAULT_IMAGE_EXTS = {".png", ".jpg", ".jpeg", ".webp", ".bmp"}


def load_rgba_pixels(image_path: str) -> Tuple[int, int, List[Tuple[int, ...]]]:
    with Image.open(image_path) as im:
        rgba = im.convert("RGBA")
        width, height = rgba.size
        return width, height, list(rgba.getdata())


def compute_group_id(image_path: str) -> str:
    width, height, pixels = load_rgba_pixels(image_path)
    return group_id_from_pixels(pixels, width, height)


def build_background_index(
    background_dir: str,
    recursive: bool = True,
    exts: Optional[Iterable[str]] = None,
) -> Dict[str, BackgroundMeta]:
    root = Path(background_dir)
    if not root.exists() or not root.is_dir():
        raise FileNotFoundError(f"background_dir not found: {background_dir}")

    valid_exts = _DEFAULT_IMAGE_EXTS if exts is None else {e.lower() for e in exts}
    files = root.rglob("*") if recursive else root.glob("*")

    index: Dict[str, BackgroundMeta] = {}
    for file_path in files:
        if not file_path.is_file() or file_path.suffix.lower() not in valid_exts:
            continue
        width, height, pixels = load_rgba_pixels(str(file_path))
        group_id = group_id_from_pixels(pixels, width, height)
        if group_id not in index:
            index[group_id] = BackgroundMeta(
                group_id=group_id,
                image_path=str(file_path),
                width=width,
                height=height,
            )
    return index


def build_background_index_from_files(
    image_paths: Iterable[str],
    exts: Optional[Iterable[str]] = None,
) -> Dict[str, BackgroundMeta]:
    valid_exts = _DEFAULT_IMAGE_EXTS if exts is None else {e.lower() for e in exts}
    index: Dict[str, BackgroundMeta] = {}
    for image_path in image_paths:
        file_path = Path(image_path)
        if not file_path.is_file() or file_path.suffix.lower() not in valid_exts:
            continue
        width, height, pixels = load_rgba_pixels(str(file_path))
        group_id = group_id_from_pixels(pixels, width, height)
        if group_id not in index:
            index[group_id] = BackgroundMeta(
                group_id=group_id,
                image_path=str(file_path),
                width=width,
                height=height,
            )
    return index
