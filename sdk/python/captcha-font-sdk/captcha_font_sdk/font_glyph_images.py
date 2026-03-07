from __future__ import annotations

from pathlib import Path
from typing import Iterable, List

from PIL import Image

from .types import FontGlyph, FontGlyphImageExportResult, FontGlyphImageItem


def export_font_glyph_images(
    group_id: str,
    background_path: str,
    image_size: tuple[int, int],
    glyphs: Iterable[FontGlyph],
    output_dir: str,
    file_prefix: str,
) -> FontGlyphImageExportResult:
    out_dir = Path(output_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    glyph_list = list(glyphs)
    exported: List[FontGlyphImageItem] = []
    for glyph in glyph_list:
        rgba_2d = glyph.rgba_2d
        if rgba_2d is None:
            raise ValueError("glyph.rgba_2d is required to export glyph images")
        height = len(rgba_2d)
        width = len(rgba_2d[0]) if height > 0 else 0
        image = Image.new("RGBA", (width, height), (0, 0, 0, 0))
        flat_pixels = [pixel for row in rgba_2d for pixel in row]
        image.putdata(flat_pixels)
        file_name = f"{file_prefix}_glyph_{glyph.rect_index:02d}.png"
        target = out_dir / file_name
        image.save(target)
        exported.append(
            FontGlyphImageItem(
                rect_index=glyph.rect_index,
                bbox=glyph.bbox,
                image_path=str(target),
                width=width,
                height=height,
                pixel_count=glyph.pixel_count,
            )
        )

    return FontGlyphImageExportResult(
        group_id=group_id,
        background_path=background_path,
        image_size=image_size,
        output_dir=str(out_dir),
        glyph_images=exported,
        stats={
            "glyph_count": len(exported),
            "exported_count": len(exported),
        },
    )
