import { RGBA, RGB } from './types';

export function buildDiff(
  captchaPixels: RGBA[],
  backgroundPixels: RGBA[],
  width: number,
  height: number,
  diffThreshold: number
): { mask: boolean[]; colors: Array<RGB | null> } {
  const total = width * height;
  const mask = new Array<boolean>(total).fill(false);
  const colors: Array<RGB | null> = new Array(total).fill(null);

  for (let i = 0; i < total; i += 1) {
    const [cr, cg, cb] = captchaPixels[i];
    const [br, bg, bb] = backgroundPixels[i];
    if (Math.abs(cr - br) + Math.abs(cg - bg) + Math.abs(cb - bb) >= diffThreshold) {
      mask[i] = true;
      colors[i] = [cr, cg, cb];
    }
  }

  return { mask, colors };
}
