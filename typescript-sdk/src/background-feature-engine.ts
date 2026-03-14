import { RGBA } from './types';

function toGray(pixel: RGBA): number {
  const [r, g, b] = pixel;
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

function clamp(value: number, lower: number, upper: number): number {
  return Math.max(lower, Math.min(upper, value));
}

function safeDiv(numerator: number, denominator: number): number {
  return denominator ? numerator / denominator : 0;
}

function buildHistogram(values: number[], bins: number): number[] {
  if (bins <= 0) {
    throw new Error('bins must be positive');
  }
  if (!values.length) {
    return Array.from({ length: bins }, () => 0);
  }
  const hist = new Array<number>(bins).fill(0);
  for (const value of values) {
    const index = Math.min(bins - 1, Math.floor((value * bins) / 256.0));
    hist[index] += 1;
  }
  const total = values.length;
  return hist.map((count) => count / total);
}

function histEntropy(histogram: number[]): number {
  let entropy = 0;
  for (const prob of histogram) {
    if (prob > 0) {
      entropy -= prob * Math.log2(prob);
    }
  }
  return entropy;
}

function splitRange(length: number, parts: number, index: number): [number, number] {
  const start = Math.floor((index * length) / parts);
  let end = Math.floor(((index + 1) * length) / parts);
  if (end <= start) {
    end = Math.min(length, start + 1);
  }
  return [start, end];
}

function cellGrayValues(gray: number[], width: number, x0: number, x1: number, y0: number, y1: number): number[] {
  const values: number[] = [];
  for (let y = y0; y < y1; y += 1) {
    const base = y * width;
    values.push(...gray.slice(base + x0, base + x1));
  }
  return values;
}

function edgeDensity(gray: number[], width: number, height: number, threshold: number, x0: number, x1: number, y0: number, y1: number): number {
  if (x1 - x0 <= 1 || y1 - y0 <= 1) {
    return 0;
  }
  let edgeHits = 0;
  let checks = 0;
  for (let y = y0; y < y1; y += 1) {
    for (let x = x0; x < x1; x += 1) {
      const current = gray[y * width + x];
      if (x + 1 < x1) {
        checks += 1;
        if (Math.abs(current - gray[y * width + (x + 1)]) >= threshold) {
          edgeHits += 1;
        }
      }
      if (y + 1 < y1) {
        checks += 1;
        if (Math.abs(current - gray[(y + 1) * width + x]) >= threshold) {
          edgeHits += 1;
        }
      }
    }
  }
  return safeDiv(edgeHits, checks);
}

function meanStd(values: number[]): [number, number] {
  if (!values.length) {
    return [0, 0];
  }
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  const variance = values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length;
  return [mean, Math.sqrt(Math.max(0, variance))];
}

function normalizeLevels(levels?: Iterable<number> | null): number[] {
  if (!levels) {
    return [1, 2, 4];
  }
  const cleaned = Array.from(new Set(Array.from(levels).map((value) => Math.max(1, Math.floor(value))))).sort((a, b) => a - b);
  if (!cleaned.length) {
    throw new Error('levels must include at least one positive integer');
  }
  return cleaned;
}

export function extractBackgroundTextureMetrics(
  rgbaPixels: RGBA[],
  width: number,
  height: number,
  gridRows: number = 4,
  gridCols: number = 4,
  histogramBins: number = 16,
  edgeThreshold: number = 18.0
) {
  if (width <= 0 || height <= 0) {
    throw new Error('width and height must be positive');
  }
  if (gridRows <= 0 || gridCols <= 0) {
    throw new Error('grid_rows and grid_cols must be positive');
  }
  if (rgbaPixels.length !== width * height) {
    throw new Error('rgba_pixels length does not match width * height');
  }

  const gray = rgbaPixels.map(toGray);
  const [meanIntensity, stdIntensity] = meanStd(gray);
  const histogram = buildHistogram(gray, histogramBins);
  const entropy = histEntropy(histogram);
  const edgeDensityValue = edgeDensity(gray, width, height, edgeThreshold, 0, width, 0, height);

  const gridEnergy: number[] = [];
  for (let row = 0; row < gridRows; row += 1) {
    const [y0, y1] = splitRange(height, gridRows, row);
    for (let col = 0; col < gridCols; col += 1) {
      const [x0, x1] = splitRange(width, gridCols, col);
      const cellValues = cellGrayValues(gray, width, x0, x1, y0, y1);
      const [, cellStd] = meanStd(cellValues);
      const energy = clamp(cellStd / 128.0, 0, 1);
      gridEnergy.push(energy);
    }
  }

  return {
    mean_intensity: meanIntensity,
    std_intensity: stdIntensity,
    entropy,
    edge_density: edgeDensityValue,
    histogram: histogram.map((v) => Number(v)),
    grid_energy: gridEnergy.map((v) => Number(v)),
    stats: {
      width: Number(width),
      height: Number(height),
      grid_rows: Number(gridRows),
      grid_cols: Number(gridCols),
      histogram_bins: Number(histogramBins),
      edge_threshold: Number(edgeThreshold),
    },
  };
}

export function extractBackgroundDeepVector(
  rgbaPixels: RGBA[],
  width: number,
  height: number,
  levels?: Iterable<number> | null,
  edgeThreshold: number = 18.0
) {
  if (width <= 0 || height <= 0) {
    throw new Error('width and height must be positive');
  }
  if (rgbaPixels.length !== width * height) {
    throw new Error('rgba_pixels length does not match width * height');
  }

  const normalizedLevels = normalizeLevels(levels);
  const gray = rgbaPixels.map(toGray);

  const vector1d: number[] = [];
  let patchCount = 0;
  for (const level of normalizedLevels) {
    for (let row = 0; row < level; row += 1) {
      const [y0, y1] = splitRange(height, level, row);
      for (let col = 0; col < level; col += 1) {
        const [x0, x1] = splitRange(width, level, col);
        const patchValues = cellGrayValues(gray, width, x0, x1, y0, y1);
        const [mean, std] = meanStd(patchValues);
        const edges = edgeDensity(gray, width, height, edgeThreshold, x0, x1, y0, y1);
        vector1d.push(
          clamp(mean / 255.0, 0, 1),
          clamp(std / 128.0, 0, 1),
          clamp(edges, 0, 1)
        );
        patchCount += 1;
      }
    }
  }

  return {
    levels: normalizedLevels,
    patch_count: patchCount,
    vector_1d: vector1d.map((v) => Number(v)),
    stats: {
      width: Number(width),
      height: Number(height),
      level_count: Number(normalizedLevels.length),
      edge_threshold: Number(edgeThreshold),
      vector_length: Number(vector1d.length),
    },
  };
}
