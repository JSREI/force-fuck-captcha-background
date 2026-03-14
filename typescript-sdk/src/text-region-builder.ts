import { BBox, FontComponent, TextRegion } from './types';

export interface TextRegionFilterConfig {
  min_width?: number;
  min_height?: number;
  min_fill_ratio?: number;
  max_fill_ratio?: number;
  merge_gap?: number;
  min_vertical_overlap_ratio?: number;
  expected_region_count?: number | null;
  force_merge_max_gap?: number;
}

const defaultConfig: Required<TextRegionFilterConfig> = {
  min_width: 3,
  min_height: 3,
  min_fill_ratio: 0.06,
  max_fill_ratio: 0.95,
  merge_gap: 2,
  min_vertical_overlap_ratio: 0.4,
  expected_region_count: 4,
  force_merge_max_gap: 28,
};

function bboxSize(bbox: BBox): [number, number] {
  const [left, top, right, bottom] = bbox;
  return [right - left + 1, bottom - top + 1];
}

function fillRatio(pixelCount: number, bbox: BBox): number {
  const [width, height] = bboxSize(bbox);
  const area = Math.max(1, width * height);
  return pixelCount / area;
}

function componentScore(pixelCount: number, bbox: BBox): number {
  const [width, height] = bboxSize(bbox);
  const area = Math.max(1, width * height);
  const fill = pixelCount / area;
  const fillTerm = Math.max(0, 1 - Math.abs(fill - 0.35) / 0.35);
  const areaTerm = Math.min(1, pixelCount / 320);
  return 0.6 * fillTerm + 0.4 * areaTerm;
}

function bboxUnion(a: BBox, b: BBox): BBox {
  return [Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.max(a[2], b[2]), Math.max(a[3], b[3])];
}

function verticalOverlapRatio(a: BBox, b: BBox): number {
  const overlap = Math.max(0, Math.min(a[3], b[3]) - Math.max(a[1], b[1]) + 1);
  const aH = a[3] - a[1] + 1;
  const bH = b[3] - b[1] + 1;
  const base = Math.max(1, Math.min(aH, bH));
  return overlap / base;
}

function horizontalGap(a: BBox, b: BBox): number {
  if (b[0] <= a[2]) return 0;
  return b[0] - a[2] - 1;
}

function symmetricHorizontalGap(a: BBox, b: BBox): number {
  if (a[0] <= b[2] && b[0] <= a[2]) return 0;
  if (a[2] < b[0]) return b[0] - a[2] - 1;
  return a[0] - b[2] - 1;
}

function bboxCenterX(bbox: BBox): number {
  return (bbox[0] + bbox[2]) / 2;
}

function bboxContains(outer: BBox, inner: BBox): boolean {
  return outer[0] <= inner[0] && outer[1] <= inner[1] && outer[2] >= inner[2] && outer[3] >= inner[3];
}

function shouldMerge(a: TextRegion, b: TextRegion, cfg: Required<TextRegionFilterConfig>): boolean {
  if (bboxContains(a.bbox, b.bbox) || bboxContains(b.bbox, a.bbox)) {
    return true;
  }

  const gap = horizontalGap(a.bbox, b.bbox);
  const overlapRatio = verticalOverlapRatio(a.bbox, b.bbox);
  if (gap <= cfg.merge_gap && overlapRatio >= cfg.min_vertical_overlap_ratio) {
    return true;
  }

  if (gap <= 1 && overlapRatio >= 0.2) {
    return true;
  }

  return false;
}

function mergeRegions(a: TextRegion, b: TextRegion, includePixels: boolean): TextRegion {
  const totalPixels = a.pixel_count + b.pixel_count;
  const mergedColors = Array.from(new Set([...a.colors.map(String), ...b.colors.map(String)])).map((value) => {
    const [r, g, b] = value.split(',').map(Number);
    return [r, g, b] as [number, number, number];
  });
  const mergedPixels = includePixels ? [...a.pixels, ...b.pixels] : [];
  const mergedBBox = bboxUnion(a.bbox, b.bbox);
  const mergedScore =
    (a.score * a.pixel_count + b.score * b.pixel_count) / Math.max(1, totalPixels);
  return {
    bbox: mergedBBox,
    pixel_count: totalPixels,
    component_count: a.component_count + b.component_count,
    colors: mergedColors,
    score: mergedScore,
    pixels: mergedPixels,
  };
}

function mergeCost(a: TextRegion, b: TextRegion, cfg: Required<TextRegionFilterConfig>): number {
  const gap = symmetricHorizontalGap(a.bbox, b.bbox);
  const overlap = verticalOverlapRatio(a.bbox, b.bbox);
  const aH = a.bbox[3] - a.bbox[1] + 1;
  const bH = b.bbox[3] - b.bbox[1] + 1;
  const meanH = Math.max(1, (aH + bH) / 2);
  const centerDx = Math.abs(bboxCenterX(a.bbox) - bboxCenterX(b.bbox));

  let cost = gap * 4 + centerDx / meanH - overlap * 8;
  if (gap > cfg.force_merge_max_gap) {
    cost += 1000 + gap * 10;
  }
  return cost;
}

function forceReduceRegions(
  regions: TextRegion[],
  includePixels: boolean,
  cfg: Required<TextRegionFilterConfig>
): TextRegion[] {
  const expected = cfg.expected_region_count;
  if (!expected || expected <= 0 || regions.length <= expected) {
    return regions;
  }

  let merged = [...regions];
  while (merged.length > expected) {
    merged.sort((a, b) => (a.bbox[0] - b.bbox[0]) || (a.bbox[1] - b.bbox[1]));
    let bestIndex: number | null = null;
    let bestCost: number | null = null;

    for (let idx = 0; idx < merged.length - 1; idx += 1) {
      const cost = mergeCost(merged[idx], merged[idx + 1], cfg);
      if (bestCost === null || cost < bestCost) {
        bestCost = cost;
        bestIndex = idx;
      }
    }

    if (bestIndex === null) {
      break;
    }

    const combined = mergeRegions(merged[bestIndex], merged[bestIndex + 1], includePixels);
    merged = [...merged.slice(0, bestIndex), combined, ...merged.slice(bestIndex + 2)];
  }

  merged.sort((a, b) => (a.bbox[0] - b.bbox[0]) || (a.bbox[1] - b.bbox[1]));
  return merged;
}

export function buildTextRegions(
  components: FontComponent[],
  includePixels: boolean,
  config: TextRegionFilterConfig = {}
): TextRegion[] {
  const cfg: Required<TextRegionFilterConfig> = { ...defaultConfig, ...config };
  const regions: TextRegion[] = [];

  for (const component of components) {
    const bbox = component.bbox;
    const [width, height] = bboxSize(bbox);
    if (width < cfg.min_width || height < cfg.min_height) {
      continue;
    }

    const fill = fillRatio(component.pixel_count, bbox);
    if (fill < cfg.min_fill_ratio || fill > cfg.max_fill_ratio) {
      continue;
    }

    regions.push({
      bbox,
      pixel_count: component.pixel_count,
      component_count: 1,
      colors: [component.color],
      score: componentScore(component.pixel_count, bbox),
      pixels: includePixels ? component.pixels : [],
    });
  }

  regions.sort((a, b) => (a.bbox[0] - b.bbox[0]) || (a.bbox[1] - b.bbox[1]));
  const merged: TextRegion[] = [];
  for (const region of regions) {
    if (!merged.length) {
      merged.push(region);
      continue;
    }
    if (shouldMerge(merged[merged.length - 1], region, cfg)) {
      merged[merged.length - 1] = mergeRegions(merged[merged.length - 1], region, includePixels);
    } else {
      merged.push(region);
    }
  }

  return forceReduceRegions(merged, includePixels, cfg);
}

export function unionBBox(regions: TextRegion[]): BBox | null {
  if (!regions.length) {
    return null;
  }
  let left = Infinity;
  let top = Infinity;
  let right = -Infinity;
  let bottom = -Infinity;
  for (const region of regions) {
    const [l, t, r, b] = region.bbox;
    left = Math.min(left, l);
    top = Math.min(top, t);
    right = Math.max(right, r);
    bottom = Math.max(bottom, b);
  }
  return [left, top, right, bottom];
}
