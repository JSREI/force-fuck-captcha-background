import { Pixel } from './types';

function normalizeAngle(angle: number): number {
  while (angle > 45) angle -= 90;
  while (angle < -45) angle += 90;
  return angle;
}

export function estimateForegroundSkew(pixels: Pixel[], minPixels: number = 20, maxAbsAngle: number = 45.0) {
  const sampled = pixels.slice();
  if (sampled.length < minPixels) {
    return { angle_degrees: 0, confidence: 0, pixel_count: sampled.length, eigen_ratio: 0 };
  }

  const xs = sampled.map((p) => p[0]);
  const ys = sampled.map((p) => p[1]);
  const meanX = xs.reduce((s, v) => s + v, 0) / xs.length;
  const meanY = ys.reduce((s, v) => s + v, 0) / ys.length;

  let covXX = 0;
  let covXY = 0;
  let covYY = 0;
  for (const [x, y] of sampled) {
    const dx = x - meanX;
    const dy = y - meanY;
    covXX += dx * dx;
    covXY += dx * dy;
    covYY += dy * dy;
  }
  covXX /= sampled.length;
  covXY /= sampled.length;
  covYY /= sampled.length;

  const trace = covXX + covYY;
  const delta = Math.max(0, (covXX - covYY) ** 2 + 4 * covXY * covXY);
  const rootDelta = Math.sqrt(delta);

  const lambda1 = 0.5 * (trace + rootDelta);
  const lambda2 = 0.5 * (trace - rootDelta);

  const angleRadians = 0.5 * Math.atan2(2 * covXY, covXX - covYY);
  let angleDegrees = normalizeAngle((angleRadians * 180) / Math.PI);
  angleDegrees = Math.max(-maxAbsAngle, Math.min(maxAbsAngle, angleDegrees));

  let confidence = 0;
  if (lambda1 > 1e-9) {
    confidence = Math.max(0, Math.min(1, (lambda1 - lambda2) / lambda1));
  }

  return {
    angle_degrees: Number(angleDegrees),
    confidence: Number(confidence),
    pixel_count: sampled.length,
    eigen_ratio: lambda1 > 1e-9 ? Number((lambda1 - lambda2) / lambda1) : 0,
  };
}
