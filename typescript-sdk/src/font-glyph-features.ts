import { FontGlyph, FontGlyphFeature } from './types';
import { flattenBitmap, normalizeBitmapToCanvas } from './bitmap-ops';

function bitmapDensity(bitmap2d: number[][]): number {
  if (!bitmap2d.length || !bitmap2d[0]?.length) {
    return 0;
  }
  const total = bitmap2d.length * bitmap2d[0].length;
  let active = 0;
  for (const row of bitmap2d) {
    for (const value of row) {
      active += value;
    }
  }
  return total > 0 ? active / total : 0;
}

export function buildFontGlyphFeatures(
  glyphs: FontGlyph[],
  targetWidth: number = 32,
  targetHeight: number = 32,
  keepAspectRatio: boolean = true
): FontGlyphFeature[] {
  const features: FontGlyphFeature[] = [];
  for (const glyph of glyphs) {
    const resized = normalizeBitmapToCanvas(glyph.bitmap_2d, targetWidth, targetHeight, keepAspectRatio);
    features.push({
      rect_index: glyph.rect_index,
      bbox: glyph.bbox,
      width: glyph.width,
      height: glyph.height,
      color: glyph.color,
      pixel_count: glyph.pixel_count,
      density: Number(bitmapDensity(glyph.bitmap_2d).toFixed(6)),
      bitmap_2d: glyph.bitmap_2d,
      resized_bitmap_2d: resized,
      vector_1d: flattenBitmap(resized),
    });
  }
  return features;
}
