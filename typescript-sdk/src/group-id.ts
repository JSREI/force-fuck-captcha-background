import { RGBA } from './types';

export type RGB = [number, number, number];

function rgbAt(pixels: RGBA[], width: number, x: number, y: number): RGB {
  const p = pixels[y * width + x];
  return [p[0], p[1], p[2]];
}

export function groupIdFromPixels(pixels: RGBA[], width: number, height: number): string {
  const corners: RGB[] = [
    rgbAt(pixels, width, 0, 0),
    rgbAt(pixels, width, width - 1, 0),
    rgbAt(pixels, width, 0, height - 1),
    rgbAt(pixels, width, width - 1, height - 1)
  ];
  return `${width}x${height}|` + corners.map(([r, g, b]) => `${r},${g},${b}`).join('|');
}
