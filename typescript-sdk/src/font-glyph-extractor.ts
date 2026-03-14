import { FontComponent, FontGlyph, RGBA, TextRegion } from './types';

export interface CaptchaRgbaImage {
  width: number;
  height: number;
  pixels: RGBA[];
}

function glyphSize(component: FontComponent): [number, number] {
  const [left, top, right, bottom] = component.bbox;
  return [right - left + 1, bottom - top + 1];
}

export function sortComponentsByRectIndex(components: FontComponent[]): FontComponent[] {
  return [...components].sort((a, b) => (a.bbox[0] - b.bbox[0]) || (a.bbox[1] - b.bbox[1]) || (a.bbox[2] - b.bbox[2]) || (a.bbox[3] - b.bbox[3]));
}

function buildBitmap2d(component: FontComponent): number[][] {
  const [left, top] = component.bbox;
  const [width, height] = glyphSize(component);
  const bitmap = Array.from({ length: height }, () => Array.from({ length: width }, () => 0));
  for (const [x, y] of component.pixels) {
    const rx = x - left;
    const ry = y - top;
    if (rx >= 0 && ry >= 0 && rx < width && ry < height) {
      bitmap[ry][rx] = 1;
    }
  }
  return bitmap;
}

function buildRgba2d(component: FontComponent, captchaImage: CaptchaRgbaImage): RGBA[][] {
  const [left, top] = component.bbox;
  const [width, height] = glyphSize(component);
  const rgba2d: RGBA[][] = Array.from({ length: height }, () => Array.from({ length: width }, () => [0, 0, 0, 0] as RGBA));
  for (const [x, y] of component.pixels) {
    const rx = x - left;
    const ry = y - top;
    if (rx < 0 || ry < 0 || rx >= width || ry >= height) {
      continue;
    }
    if (x < 0 || y < 0 || x >= captchaImage.width || y >= captchaImage.height) {
      continue;
    }
    const pixel = captchaImage.pixels[y * captchaImage.width + x];
    rgba2d[ry][rx] = [pixel[0], pixel[1], pixel[2], pixel[3] ?? 255];
  }
  return rgba2d;
}

function buildBitmap2dFromBBoxPixels(bbox: [number, number, number, number], pixels: [number, number][]): number[][] {
  const [left, top, right, bottom] = bbox;
  const width = right - left + 1;
  const height = bottom - top + 1;
  const bitmap = Array.from({ length: height }, () => Array.from({ length: width }, () => 0));
  for (const [x, y] of pixels) {
    const rx = x - left;
    const ry = y - top;
    if (rx >= 0 && ry >= 0 && rx < width && ry < height) {
      bitmap[ry][rx] = 1;
    }
  }
  return bitmap;
}

function buildRgba2dFromBBoxPixels(
  bbox: [number, number, number, number],
  pixels: [number, number][],
  captchaImage: CaptchaRgbaImage
): RGBA[][] {
  const [left, top, right, bottom] = bbox;
  const width = right - left + 1;
  const height = bottom - top + 1;
  const rgba2d: RGBA[][] = Array.from({ length: height }, () => Array.from({ length: width }, () => [0, 0, 0, 0] as RGBA));
  for (const [x, y] of pixels) {
    const rx = x - left;
    const ry = y - top;
    if (rx < 0 || ry < 0 || rx >= width || ry >= height) {
      continue;
    }
    if (x < 0 || y < 0 || x >= captchaImage.width || y >= captchaImage.height) {
      continue;
    }
    const pixel = captchaImage.pixels[y * captchaImage.width + x];
    rgba2d[ry][rx] = [pixel[0], pixel[1], pixel[2], pixel[3] ?? 255];
  }
  return rgba2d;
}

export function buildFontGlyphs(
  components: FontComponent[],
  captchaImage: CaptchaRgbaImage | null,
  includePixels: boolean,
  includeRgba2d: boolean
): FontGlyph[] {
  const sorted = sortComponentsByRectIndex(components);
  const glyphs: FontGlyph[] = [];

  sorted.forEach((component, rectIndex) => {
    const [width, height] = glyphSize(component);
    const bitmap2d = buildBitmap2d(component);
    const rgba2d = includeRgba2d ? (() => {
      if (!captchaImage) {
        throw new Error('captcha_image is required when include_rgba_2d=true');
      }
      return buildRgba2d(component, captchaImage);
    })() : null;

    glyphs.push({
      rect_index: rectIndex,
      bbox: component.bbox,
      width,
      height,
      color: component.color,
      pixel_count: component.pixel_count,
      pixels: includePixels ? component.pixels : [],
      bitmap_2d: bitmap2d,
      rgba_2d: rgba2d,
    });
  });

  return glyphs;
}

export function buildFontGlyphsFromTextRegions(
  regions: TextRegion[],
  captchaImage: CaptchaRgbaImage | null,
  includePixels: boolean,
  includeRgba2d: boolean
): FontGlyph[] {
  const sorted = [...regions].sort((a, b) => (a.bbox[0] - b.bbox[0]) || (a.bbox[1] - b.bbox[1]) || (a.bbox[2] - b.bbox[2]) || (a.bbox[3] - b.bbox[3]));
  const glyphs: FontGlyph[] = [];

  sorted.forEach((region, rectIndex) => {
    const [left, top, right, bottom] = region.bbox;
    const width = right - left + 1;
    const height = bottom - top + 1;
    const bitmap2d = buildBitmap2dFromBBoxPixels(region.bbox, region.pixels);
    const rgba2d = includeRgba2d ? (() => {
      if (!captchaImage) {
        throw new Error('captcha_image is required when include_rgba_2d=true');
      }
      return buildRgba2dFromBBoxPixels(region.bbox, region.pixels, captchaImage);
    })() : null;

    const color = region.colors.length ? region.colors[0] : [0, 0, 0];
    glyphs.push({
      rect_index: rectIndex,
      bbox: region.bbox,
      width,
      height,
      color: [color[0], color[1], color[2]],
      pixel_count: region.pixel_count,
      pixels: includePixels ? region.pixels : [],
      bitmap_2d: bitmap2d,
      rgba_2d: rgba2d,
    });
  });

  return glyphs;
}
