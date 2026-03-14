export function flattenBitmap(bitmap2d: number[][]): number[] {
  return bitmap2d.flat();
}

export function resizeBitmapNearest(bitmap2d: number[][], targetWidth: number, targetHeight: number): number[][] {
  if (targetWidth <= 0 || targetHeight <= 0) {
    throw new Error('target_width and target_height must be positive');
  }
  if (!bitmap2d.length || !bitmap2d[0]?.length) {
    return Array.from({ length: targetHeight }, () => Array.from({ length: targetWidth }, () => 0));
  }
  const srcHeight = bitmap2d.length;
  const srcWidth = bitmap2d[0].length;
  const resized = Array.from({ length: targetHeight }, () => Array.from({ length: targetWidth }, () => 0));

  for (let y = 0; y < targetHeight; y += 1) {
    const srcY = Math.min(srcHeight - 1, Math.floor((y * srcHeight) / targetHeight));
    for (let x = 0; x < targetWidth; x += 1) {
      const srcX = Math.min(srcWidth - 1, Math.floor((x * srcWidth) / targetWidth));
      resized[y][x] = bitmap2d[srcY][srcX];
    }
  }

  return resized;
}

export function normalizeBitmapToCanvas(
  bitmap2d: number[][],
  targetWidth: number,
  targetHeight: number,
  keepAspectRatio: boolean = true
): number[][] {
  if (targetWidth <= 0 || targetHeight <= 0) {
    throw new Error('target_width and target_height must be positive');
  }
  if (!bitmap2d.length || !bitmap2d[0]?.length) {
    return Array.from({ length: targetHeight }, () => Array.from({ length: targetWidth }, () => 0));
  }

  const srcHeight = bitmap2d.length;
  const srcWidth = bitmap2d[0].length;
  if (!keepAspectRatio) {
    return resizeBitmapNearest(bitmap2d, targetWidth, targetHeight);
  }

  const scale = Math.min(targetWidth / srcWidth, targetHeight / srcHeight);
  const newWidth = Math.max(1, Math.round(srcWidth * scale));
  const newHeight = Math.max(1, Math.round(srcHeight * scale));
  const resized = resizeBitmapNearest(bitmap2d, newWidth, newHeight);

  const canvas = Array.from({ length: targetHeight }, () => Array.from({ length: targetWidth }, () => 0));
  const offsetX = Math.floor((targetWidth - newWidth) / 2);
  const offsetY = Math.floor((targetHeight - newHeight) / 2);

  for (let y = 0; y < newHeight; y += 1) {
    for (let x = 0; x < newWidth; x += 1) {
      canvas[offsetY + y][offsetX + x] = resized[y][x];
    }
  }

  return canvas;
}
