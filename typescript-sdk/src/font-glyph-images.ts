import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import {
  FontGlyph,
  FontGlyphImageExportResult,
  FontGlyphImageItem,
  GlyphRenderMode,
  GlyphRenderModeLike,
  normalizeGlyphRenderMode,
} from './types';

function renderRgbaPixel(pixel: [number, number, number, number], renderMode: GlyphRenderMode): [number, number, number, number] {
  const [r, g, b, a] = pixel;
  if (renderMode === GlyphRenderMode.ORIGINAL) {
    return [r, g, b, a];
  }
  const isFg = a > 0;
  if (renderMode === GlyphRenderMode.BLACK_ON_TRANSPARENT) {
    return isFg ? [0, 0, 0, 255] : [0, 0, 0, 0];
  }
  if (renderMode === GlyphRenderMode.BLACK_ON_WHITE) {
    return isFg ? [0, 0, 0, 255] : [255, 255, 255, 255];
  }
  if (renderMode === GlyphRenderMode.WHITE_ON_BLACK) {
    return isFg ? [255, 255, 255, 255] : [0, 0, 0, 255];
  }
  throw new Error(`unsupported render_mode: ${renderMode}`);
}

export async function exportFontGlyphImages(
  groupId: string,
  backgroundPath: string,
  imageSize: [number, number],
  glyphs: FontGlyph[],
  outputDir: string,
  filePrefix: string,
  renderMode: GlyphRenderModeLike = GlyphRenderMode.ORIGINAL
): Promise<FontGlyphImageExportResult> {
  const outDir = path.resolve(outputDir);
  await fs.promises.mkdir(outDir, { recursive: true });
  const normalizedMode = normalizeGlyphRenderMode(renderMode);

  const exported: FontGlyphImageItem[] = [];
  for (const glyph of glyphs) {
    const rgba2d = glyph.rgba_2d;
    if (!rgba2d) {
      throw new Error('glyph.rgba_2d is required to export glyph images');
    }
    const height = rgba2d.length;
    const width = height > 0 ? rgba2d[0].length : 0;
    const buffer = Buffer.alloc(width * height * 4, 0);
    let offset = 0;
    for (const row of rgba2d) {
      for (const pixel of row) {
        const [r, g, b, a] = renderRgbaPixel(pixel, normalizedMode);
        buffer[offset] = r;
        buffer[offset + 1] = g;
        buffer[offset + 2] = b;
        buffer[offset + 3] = a;
        offset += 4;
      }
    }

    const fileName = `${filePrefix}_glyph_${String(glyph.rect_index).padStart(2, '0')}.png`;
    const target = path.join(outDir, fileName);
    await sharp(buffer, { raw: { width, height, channels: 4 } }).png().toFile(target);

    exported.push({
      rect_index: glyph.rect_index,
      bbox: glyph.bbox,
      image_path: target,
      width,
      height,
      pixel_count: glyph.pixel_count,
    });
  }

  return {
    group_id: groupId,
    background_path: backgroundPath,
    image_size: imageSize,
    output_dir: outDir,
    glyph_images: exported,
    stats: {
      glyph_count: exported.length,
      exported_count: exported.length,
    },
  };
}
