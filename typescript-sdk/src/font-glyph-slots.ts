import { FontGlyphFeature, FontGlyphSlot } from './types';

export function alignFontGlyphFeaturesToSlots(
  glyphFeatures: FontGlyphFeature[],
  slotCount: number,
  vectorLength: number
): FontGlyphSlot[] {
  if (slotCount <= 0) {
    throw new Error('slot_count must be > 0');
  }
  if (vectorLength <= 0) {
    throw new Error('vector_length must be > 0');
  }

  const sorted = [...glyphFeatures].sort((a, b) => a.rect_index - b.rect_index);
  const slots: FontGlyphSlot[] = [];
  for (let slotIndex = 0; slotIndex < slotCount; slotIndex += 1) {
    if (slotIndex < sorted.length) {
      const glyph = sorted[slotIndex];
      slots.push({
        slot_index: slotIndex,
        present: true,
        rect_index: glyph.rect_index,
        bbox: glyph.bbox,
        vector_1d: glyph.vector_1d,
        density: glyph.density,
      });
    } else {
      slots.push({
        slot_index: slotIndex,
        present: false,
        rect_index: null,
        bbox: null,
        vector_1d: new Array(vectorLength).fill(0),
        density: 0,
      });
    }
  }
  return slots;
}
