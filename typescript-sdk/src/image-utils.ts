import sharp from 'sharp';
import { RGBA } from './types';

export async function loadRgbaPixels(imagePath: string): Promise<{ width: number; height: number; pixels: RGBA[] }> {
  const image = sharp(imagePath).ensureAlpha();
  const { data, info } = await image.raw().toBuffer({ resolveWithObject: true });
  const width = info.width;
  const height = info.height;
  const channels = info.channels;
  if (!width || !height || !channels) {
    throw new Error('invalid_image_dimensions');
  }
  const pixels: RGBA[] = new Array(width * height);
  for (let i = 0; i < width * height; i += 1) {
    const base = i * channels;
    pixels[i] = [
      data[base],
      data[base + 1],
      data[base + 2],
      channels > 3 ? data[base + 3] : 255,
    ];
  }
  return { width, height, pixels };
}
