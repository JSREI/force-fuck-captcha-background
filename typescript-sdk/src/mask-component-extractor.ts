import { BBox } from './types';
import { neighbors } from './component-extractor';

export interface MaskComponent {
  bbox: BBox;
  pixel_count: number;
}

export function extractMaskComponents(
  mask: boolean[],
  width: number,
  height: number,
  connectivity: number,
  minComponentPixels: number
): MaskComponent[] {
  const visited = new Array<boolean>(width * height).fill(false);
  const components: MaskComponent[] = [];

  for (let idx = 0; idx < mask.length; idx += 1) {
    if (!mask[idx] || visited[idx]) {
      continue;
    }

    const queue: number[] = [idx];
    visited[idx] = true;
    let pixelCount = 0;
    let minX = idx % width;
    let maxX = minX;
    let minY = Math.floor(idx / width);
    let maxY = minY;

    while (queue.length > 0) {
      const current = queue.shift() as number;
      const x = current % width;
      const y = Math.floor(current / width);
      pixelCount += 1;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;

      for (const [nx, ny] of neighbors(x, y, width, height, connectivity)) {
        const ni = ny * width + nx;
        if (visited[ni] || !mask[ni]) {
          continue;
        }
        visited[ni] = true;
        queue.push(ni);
      }
    }

    if (pixelCount < minComponentPixels) {
      continue;
    }

    components.push({ bbox: [minX, minY, maxX, maxY], pixel_count: pixelCount });
  }

  components.sort((a, b) => b.pixel_count - a.pixel_count);
  return components;
}
