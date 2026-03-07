from __future__ import annotations

from pathlib import Path
from typing import Callable, Iterable, List, Optional

from .types import BatchGlyphExtractItem, BatchGlyphExtractResult, FontGlyphFeatureExtractResult


_DEFAULT_IMAGE_EXTS = {".png", ".jpg", ".jpeg", ".webp", ".bmp", ".gif"}


def scan_captcha_files(
    input_dir: str,
    recursive: bool = True,
    exts: Optional[Iterable[str]] = None,
    limit: Optional[int] = None,
) -> List[str]:
    root = Path(input_dir).expanduser().resolve()
    if not root.exists() or not root.is_dir():
        raise FileNotFoundError(f"input_dir not found: {input_dir}")

    valid_exts = _DEFAULT_IMAGE_EXTS if exts is None else {ext.lower() for ext in exts}
    paths = root.rglob("*") if recursive else root.glob("*")
    files = [path for path in paths if path.is_file() and path.suffix.lower() in valid_exts]
    files.sort()
    if limit is not None:
        if limit < 0:
            raise ValueError("limit must be >= 0")
        files = files[:limit]
    return [str(path) for path in files]


def batch_extract_font_glyph_features(
    input_dir: str,
    extractor: Callable[[str], FontGlyphFeatureExtractResult],
    target_width: int,
    target_height: int,
    recursive: bool = True,
    exts: Optional[Iterable[str]] = None,
    limit: Optional[int] = None,
    include_payload: bool = False,
    continue_on_error: bool = True,
) -> BatchGlyphExtractResult:
    files = scan_captcha_files(input_dir, recursive=recursive, exts=exts, limit=limit)

    items: List[BatchGlyphExtractItem] = []
    success_count = 0
    error_count = 0

    for file_path in files:
        try:
            result = extractor(file_path)
            item = BatchGlyphExtractItem(
                captcha_path=file_path,
                status="ok",
                group_id=result.group_id,
                glyph_count=len(result.glyph_features),
                error=None,
                result=result if include_payload else None,
            )
            success_count += 1
            items.append(item)
        except Exception as exc:  # noqa: BLE001
            item = BatchGlyphExtractItem(
                captcha_path=file_path,
                status="error",
                group_id=None,
                glyph_count=0,
                error=str(exc),
                result=None,
            )
            error_count += 1
            items.append(item)
            if not continue_on_error:
                break

    return BatchGlyphExtractResult(
        input_dir=str(Path(input_dir).expanduser().resolve()),
        total_files=len(files),
        processed_files=len(items),
        success_count=success_count,
        error_count=error_count,
        target_size=(target_width, target_height),
        items=items,
    )
