import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { BBox, TextRegion } from './types';

export interface TextLayerRenderOutput {
  text_bbox: BBox | null;
  text_pixel_count: number;
  output_path: string | null;
}

function toSharpBox(bbox: BBox) {
  const [left, top, right, bottom] = bbox;
  return { left, top, width: right - left + 1, height: bottom - top + 1 };
}

function safePixelIndex(width: number, height: number, x: number, y: number): number | null {
  if (x < 0 || y < 0 || x >= width || y >= height) return null;
  return y * width + x;
}

export async function renderTextLayer(
  captchaPath: string,
  regions: TextRegion[],
  textBBox: BBox | null,
  outputPath?: string,
  cropToContent: boolean = false
): Promise<TextLayerRenderOutput> {
  const { data, info } = await sharp(captchaPath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const width = info.width;
  const height = info.height;
  const channels = info.channels;
  if (!width || !height || !channels) {
    throw new Error('invalid_image_dimensions');
  }

  const out = Buffer.alloc(width * height * 4, 0);
  const picked = new Set<number>();

  for (const region of regions) {
    for (const [x, y] of region.pixels) {
      const idx = safePixelIndex(width, height, x, y);
      if (idx === null || picked.has(idx)) {
        continue;
      }
      picked.add(idx);
      const base = idx * channels;
      const outBase = idx * 4;
      out[outBase] = data[base];
      out[outBase + 1] = data[base + 1];
      out[outBase + 2] = data[base + 2];
      out[outBase + 3] = channels > 3 ? data[base + 3] : 255;
    }
  }

  let output = sharp(out, { raw: { width, height, channels: 4 } });
  if (cropToContent && textBBox) {
    output = output.extract(toSharpBox(textBBox));
  }

  let normalizedOutput: string | null = null;
  if (outputPath) {
    const target = path.resolve(outputPath);
    await fs.promises.mkdir(path.dirname(target), { recursive: true });
    await output.png().toFile(target);
    normalizedOutput = target;
  }

  return {
    text_bbox: textBBox,
    text_pixel_count: picked.size,
    output_path: normalizedOutput,
  };
}
