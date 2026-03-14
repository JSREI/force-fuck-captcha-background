import { FontComponent, Pixel, RGB } from './types';

export function neighbors(x: number, y: number, width: number, height: number, connectivity: number): Pixel[] {
  const dirs = connectivity === 4
    ? [[1, 0], [-1, 0], [0, 1], [0, -1]]
    : [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
  const result: Pixel[] = [];
  for (const [dx, dy] of dirs) {
    const nx = x + dx;
    const ny = y + dy;
    if (nx >= 0 && ny >= 0 && nx < width && ny < height) {
      result.push([nx, ny]);
    }
  }
  return result;
}

export function extractComponents(
  mask: boolean[],
  colors: Array<RGB | null>,
  width: number,
  height: number,
  connectivity: number,
  minComponentPixels: number,
  includePixels: boolean,
  colorSensitive: boolean = true
): FontComponent[] {
  const visited = new Array<boolean>(width * height).fill(false);
  const components: FontComponent[] = [];

  for (let idx = 0; idx < mask.length; idx += 1) {
    if (!mask[idx] || visited[idx]) {
      continue;
    }
    const baseColor = colors[idx];
    if (!baseColor) {
      continue;
    }

    const queue: number[] = [idx];
    visited[idx] = true;
    const pixels: Pixel[] = [];
    let minX = idx % width;
    let maxX = minX;
    let minY = Math.floor(idx / width);
    let maxY = minY;

    while (queue.length > 0) {
      const current = queue.shift() as number;
      const x = current % width;
      const y = Math.floor(current / width);
      pixels.push([x, y]);
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;

      for (const [nx, ny] of neighbors(x, y, width, height, connectivity)) {
        const ni = ny * width + nx;
        if (visited[ni] || !mask[ni]) {
          continue;
        }
        if (colorSensitive && colors[ni] && (colors[ni]![0] !== baseColor[0] || colors[ni]![1] !== baseColor[1] || colors[ni]![2] !== baseColor[2])) {
          continue;
        }
        visited[ni] = true;
        queue.push(ni);
      }
    }

    if (pixels.length < minComponentPixels) {
      continue;
    }

    components.push({
      color: baseColor,
      bbox: [minX, minY, maxX, maxY],
      pixel_count: pixels.length,
      pixels: includePixels ? pixels : [],
    });
  }

  components.sort((a, b) => b.pixel_count - a.pixel_count);
  return components;
}
