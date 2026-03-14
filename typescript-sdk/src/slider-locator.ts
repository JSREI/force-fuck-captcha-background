import { BackgroundMeta, SliderGap, SliderLocateResult } from './types';
import { buildBackgroundIndex, computeGroupId } from './background-index';
import { groupIdFromPixels } from './group-id';
import { loadRgbaPixels } from './image-utils';
import { buildDiff } from './diff-engine';
import { extractMaskComponents } from './mask-component-extractor';

export class CaptchaSliderLocator {
  private diffThreshold: number;
  private minGapPixels: number;
  private connectivity: number;
  private backgrounds: Record<string, BackgroundMeta> = {};

  constructor(diffThreshold: number = 18, minGapPixels: number = 20, connectivity: number = 8) {
    if (![4, 8].includes(connectivity)) {
      throw new Error('connectivity must be 4 or 8');
    }
    this.diffThreshold = diffThreshold;
    this.minGapPixels = minGapPixels;
    this.connectivity = connectivity;
  }

  get backgroundsIndex(): Record<string, BackgroundMeta> {
    return this.backgrounds;
  }

  setBackgroundIndex(index: Record<string, BackgroundMeta>) {
    this.backgrounds = { ...index };
  }

  async build_background_index(backgroundDir: string, recursive: boolean = true, exts?: Iterable<string>) {
    const index = await buildBackgroundIndex(backgroundDir, recursive, exts);
    this.setBackgroundIndex(index);
    return index;
  }

  async compute_group_id(imagePath: string) {
    return computeGroupId(imagePath);
  }

  async locate_gap(captchaPath: string): Promise<SliderLocateResult> {
    if (!Object.keys(this.backgrounds).length) {
      throw new Error('background index is empty, call build_background_index first');
    }

    const { width, height, pixels: captchaPixels } = await loadRgbaPixels(captchaPath);
    const groupId = groupIdFromPixels(captchaPixels, width, height);
    if (!this.backgrounds[groupId]) {
      throw new Error(`group_id not found in background index: ${groupId}`);
    }

    const backgroundMeta = this.backgrounds[groupId];
    const { width: bgWidth, height: bgHeight, pixels: backgroundPixels } = await loadRgbaPixels(backgroundMeta.image_path);
    if (bgWidth !== width || bgHeight !== height) {
      throw new Error(`background size mismatch: captcha=${width}x${height}, background=${bgWidth}x${bgHeight}`);
    }

    const { mask } = buildDiff(captchaPixels, backgroundPixels, width, height, this.diffThreshold);
    const components = extractMaskComponents(mask, width, height, this.connectivity, this.minGapPixels);
    const best = components.length ? components[0] : null;
    let gap: SliderGap | null = null;
    if (best) {
      const [left, top, right, bottom] = best.bbox;
      gap = {
        bbox: best.bbox,
        center: [Math.floor((left + right) / 2), Math.floor((top + bottom) / 2)],
        pixel_count: best.pixel_count,
      };
    }

    return {
      group_id: groupId,
      background_path: backgroundMeta.image_path,
      image_size: [width, height],
      gap,
      stats: {
        diff_pixels: mask.filter(Boolean).length,
        region_count: components.length,
        min_gap_pixels: this.minGapPixels,
        diff_threshold: this.diffThreshold,
      },
    };
  }

  async locate_gap_dict(captchaPath: string) {
    return this.locate_gap(captchaPath);
  }
}
