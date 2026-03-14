import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { BBox } from './types';

function clampBBox(bbox: BBox, width: number, height: number, padding: number): BBox {
  let [left, top, right, bottom] = bbox;
  left = Math.max(0, left - padding);
  top = Math.max(0, top - padding);
  right = Math.min(width - 1, right + padding);
  bottom = Math.min(height - 1, bottom + padding);
  if (right < left) right = left;
  if (bottom < top) bottom = top;
  return [left, top, right, bottom];
}

export async function extractPatch(
  imagePath: string,
  bbox: BBox,
  outputPath?: string,
  padding: number = 0
): Promise<{ source_image_path: string; bbox: BBox; patch_size: [number, number]; output_path: string | null }> {
  const image = sharp(imagePath).ensureAlpha();
  const metadata = await image.metadata();
  if (!metadata.width || !metadata.height) {
    throw new Error('invalid_image_dimensions');
  }
  const [left, top, right, bottom] = clampBBox(bbox, metadata.width, metadata.height, padding);
  const extractRegion = { left, top, width: right - left + 1, height: bottom - top + 1 };
  const patch = image.extract(extractRegion);

  let normalizedOutput: string | null = null;
  if (outputPath) {
    const target = path.resolve(outputPath);
    await fs.promises.mkdir(path.dirname(target), { recursive: true });
    await patch.png().toFile(target);
    normalizedOutput = target;
  }

  return {
    source_image_path: imagePath,
    bbox: [left, top, right, bottom],
    patch_size: [extractRegion.width, extractRegion.height],
    output_path: normalizedOutput,
  };
}
