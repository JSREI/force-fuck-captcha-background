from __future__ import annotations

import json
from dataclasses import asdict
from pathlib import Path
from typing import Any, Dict, List, Optional

from .types import BatchGlyphExtractItem, BatchGlyphExtractResult, GlyphDatasetExportResult


def _collect_rows(items: List[BatchGlyphExtractItem]) -> List[Dict[str, Any]]:
    rows: List[Dict[str, Any]] = []
    for item in items:
        if item.status != "ok" or item.result is None:
            continue
        for glyph in item.result.glyph_features:
            rows.append(
                {
                    "captcha_path": item.captcha_path,
                    "group_id": item.group_id or "",
                    "rect_index": glyph.rect_index,
                    "bbox": glyph.bbox,
                    "width": glyph.width,
                    "height": glyph.height,
                    "color": glyph.color,
                    "pixel_count": glyph.pixel_count,
                    "density": glyph.density,
                    "vector_1d": glyph.vector_1d,
                }
            )
    return rows


def _ensure_parent(path: Path) -> None:
    if path.parent and not path.parent.exists():
        path.parent.mkdir(parents=True, exist_ok=True)


def export_glyph_dataset_npz(
    batch_result: BatchGlyphExtractResult,
    output_npz_path: str,
    output_json_path: Optional[str] = None,
) -> GlyphDatasetExportResult:
    rows = _collect_rows(batch_result.items)
    if not rows:
        raise ValueError("no glyph rows to export")

    try:
        import numpy as np  # type: ignore
    except Exception as exc:  # noqa: BLE001
        raise RuntimeError("numpy is required for npz export; install with: pip install numpy") from exc

    npz_target = Path(output_npz_path)
    _ensure_parent(npz_target)

    vectors = np.asarray([row["vector_1d"] for row in rows], dtype=np.uint8)
    rect_indices = np.asarray([row["rect_index"] for row in rows], dtype=np.int32)
    bbox = np.asarray([list(row["bbox"]) for row in rows], dtype=np.int32)
    widths = np.asarray([row["width"] for row in rows], dtype=np.int32)
    heights = np.asarray([row["height"] for row in rows], dtype=np.int32)
    colors = np.asarray([list(row["color"]) for row in rows], dtype=np.uint8)
    pixel_counts = np.asarray([row["pixel_count"] for row in rows], dtype=np.int32)
    densities = np.asarray([row["density"] for row in rows], dtype=np.float32)
    captcha_paths = np.asarray([row["captcha_path"] for row in rows], dtype=np.str_)
    group_ids = np.asarray([row["group_id"] for row in rows], dtype=np.str_)

    np.savez_compressed(
        npz_target,
        X=vectors,
        rect_index=rect_indices,
        bbox=bbox,
        width=widths,
        height=heights,
        color=colors,
        pixel_count=pixel_counts,
        density=densities,
        captcha_path=captcha_paths,
        group_id=group_ids,
    )

    normalized_json_path: Optional[str] = None
    if output_json_path:
        json_target = Path(output_json_path)
        _ensure_parent(json_target)
        payload = {
            "input_dir": batch_result.input_dir,
            "total_files": batch_result.total_files,
            "processed_files": batch_result.processed_files,
            "success_count": batch_result.success_count,
            "error_count": batch_result.error_count,
            "target_size": batch_result.target_size,
            "glyph_sample_count": len(rows),
            "items": [asdict(item) for item in batch_result.items],
        }
        json_target.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
        normalized_json_path = str(json_target)

    return GlyphDatasetExportResult(
        input_dir=batch_result.input_dir,
        total_files=batch_result.total_files,
        processed_files=batch_result.processed_files,
        success_count=batch_result.success_count,
        error_count=batch_result.error_count,
        glyph_sample_count=len(rows),
        target_size=batch_result.target_size,
        output_npz_path=str(npz_target),
        output_json_path=normalized_json_path,
    )
