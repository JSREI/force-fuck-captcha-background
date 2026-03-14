import fs from 'fs';
import path from 'path';
import {
  BackgroundMeta,
  BackgroundRestoreResult,
  FontGlyphExtractResult,
  FontGlyphFeatureExtractResult,
  FontGlyphImageExportResult,
  FontGlyphSlotExtractResult,
  GlyphRenderMode,
  GlyphRenderModeLike,
  LocateResult,
  TextLayerResult,
  TextLocateResult,
} from './types';
import { buildBackgroundIndex, computeGroupId, loadRgbaPixelsFromPath } from './background-index';
import { groupIdFromPixels } from './group-id';
import { buildDiff } from './diff-engine';
import { extractComponents } from './component-extractor';
import { buildFontGlyphFeatures } from './font-glyph-features';
import { buildFontGlyphs, buildFontGlyphsFromTextRegions, CaptchaRgbaImage } from './font-glyph-extractor';
import { alignFontGlyphFeaturesToSlots } from './font-glyph-slots';
import { exportFontGlyphImages } from './font-glyph-images';
import { buildTextRegions, TextRegionFilterConfig, unionBBox } from './text-region-builder';
import { renderTextLayer } from './text-layer-renderer';

export class CaptchaFontLocator {
  private diffThreshold: number;
  private minComponentPixels: number;
  private connectivity: number;
  private textRegionFilter: Required<TextRegionFilterConfig>;
  private backgrounds: Record<string, BackgroundMeta> = {};

  constructor(
    diffThreshold: number = 18,
    minComponentPixels: number = 8,
    connectivity: number = 8,
    textMinWidth: number = 3,
    textMinHeight: number = 3,
    textMinFillRatio: number = 0.06,
    textMaxFillRatio: number = 0.95,
    textMergeGap: number = 2,
    textMinVerticalOverlapRatio: number = 0.4,
    textExpectedRegionCount: number | null = 4,
    textForceMergeMaxGap: number = 28
  ) {
    if (![4, 8].includes(connectivity)) {
      throw new Error('connectivity must be 4 or 8');
    }
    this.diffThreshold = diffThreshold;
    this.minComponentPixels = minComponentPixels;
    this.connectivity = connectivity;
    this.textRegionFilter = {
      min_width: textMinWidth,
      min_height: textMinHeight,
      min_fill_ratio: textMinFillRatio,
      max_fill_ratio: textMaxFillRatio,
      merge_gap: textMergeGap,
      min_vertical_overlap_ratio: textMinVerticalOverlapRatio,
      expected_region_count: textExpectedRegionCount,
      force_merge_max_gap: textForceMergeMaxGap,
    };
  }

  get backgroundsIndex() {
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

  private async matchBackgroundMeta(captchaPath: string) {
    if (!Object.keys(this.backgrounds).length) {
      throw new Error('background index is empty, call build_background_index first');
    }
    const { width, height, pixels } = await loadRgbaPixelsFromPath(captchaPath);
    const groupId = groupIdFromPixels(pixels, width, height);
    if (!this.backgrounds[groupId]) {
      throw new Error(`group_id not found in background index: ${groupId}`);
    }
    const backgroundMeta = this.backgrounds[groupId];
    if (backgroundMeta.width !== width || backgroundMeta.height !== height) {
      throw new Error(`background size mismatch: captcha=${width}x${height}, background=${backgroundMeta.width}x${backgroundMeta.height}`);
    }
    return { groupId, imageSize: [width, height] as [number, number], captchaPixels: pixels, backgroundMeta };
  }

  private async buildDiffAndComponents(
    captchaPath: string,
    includePixels: boolean,
    colorSensitive: boolean
  ) {
    const { groupId, imageSize, captchaPixels, backgroundMeta } = await this.matchBackgroundMeta(captchaPath);
    const { width: bgWidth, height: bgHeight, pixels: backgroundPixels } = await loadRgbaPixelsFromPath(backgroundMeta.image_path);
    if (bgWidth !== imageSize[0] || bgHeight !== imageSize[1]) {
      throw new Error(`background size mismatch: captcha=${imageSize[0]}x${imageSize[1]}, background=${bgWidth}x${bgHeight}`);
    }
    const { mask, colors } = buildDiff(captchaPixels, backgroundPixels, imageSize[0], imageSize[1], this.diffThreshold);
    const components = extractComponents(
      mask,
      colors,
      imageSize[0],
      imageSize[1],
      this.connectivity,
      this.minComponentPixels,
      includePixels,
      colorSensitive
    );
    return { groupId, imageSize, backgroundMeta, diffMask: mask, components };
  }

  async locate_fonts(captchaPath: string, includePixels: boolean = true): Promise<LocateResult> {
    const { groupId, imageSize, backgroundMeta, diffMask, components } = await this.buildDiffAndComponents(
      captchaPath,
      includePixels,
      true
    );
    return {
      group_id: groupId,
      background_path: backgroundMeta.image_path,
      image_size: imageSize,
      components,
      stats: {
        diff_pixels: diffMask.filter(Boolean).length,
        component_count: components.length,
        min_component_pixels: this.minComponentPixels,
        diff_threshold: this.diffThreshold,
      },
    };
  }

  async locate_fonts_dict(captchaPath: string, includePixels: boolean = true) {
    return this.locate_fonts(captchaPath, includePixels);
  }

  async restore_background(captchaPath: string, outputPath?: string): Promise<BackgroundRestoreResult> {
    const { groupId, imageSize, backgroundMeta } = await this.matchBackgroundMeta(captchaPath);
    let normalizedOutput: string | null = null;
    if (outputPath) {
      const target = path.resolve(outputPath);
      await fs.promises.mkdir(path.dirname(target), { recursive: true });
      await fs.promises.copyFile(backgroundMeta.image_path, target);
      normalizedOutput = target;
    }
    return {
      group_id: groupId,
      background_path: backgroundMeta.image_path,
      image_size: imageSize,
      output_path: normalizedOutput,
    };
  }

  async restore_background_dict(captchaPath: string, outputPath?: string) {
    return this.restore_background(captchaPath, outputPath);
  }

  async restore_background_by_captcha(captchaPath: string, outputPath?: string) {
    return this.restore_background(captchaPath, outputPath);
  }

  async restore_background_by_captcha_dict(captchaPath: string, outputPath?: string) {
    return this.restore_background(captchaPath, outputPath);
  }

  async locate_text_regions(captchaPath: string, includePixels: boolean = true): Promise<TextLocateResult> {
    const { groupId, imageSize, backgroundMeta, diffMask, components } = await this.buildDiffAndComponents(
      captchaPath,
      includePixels,
      false
    );
    const regions = buildTextRegions(components, includePixels, this.textRegionFilter);
    return {
      group_id: groupId,
      background_path: backgroundMeta.image_path,
      image_size: imageSize,
      regions,
      stats: {
        component_count: components.length,
        region_count: regions.length,
        text_pixel_count: regions.reduce((sum, r) => sum + r.pixel_count, 0),
        diff_pixels: diffMask.filter(Boolean).length,
        diff_threshold: this.diffThreshold,
      },
    };
  }

  async locate_text_regions_dict(captchaPath: string, includePixels: boolean = true) {
    return this.locate_text_regions(captchaPath, includePixels);
  }

  async locate_text_positions(captchaPath: string, includePixels: boolean = true) {
    return this.locate_text_regions(captchaPath, includePixels);
  }

  async locate_text_positions_dict(captchaPath: string, includePixels: boolean = true) {
    return this.locate_text_regions(captchaPath, includePixels);
  }

  async extract_text_layer(captchaPath: string, outputPath?: string, cropToContent: boolean = false): Promise<TextLayerResult> {
    const textResult = await this.locate_text_regions(captchaPath, true);
    const bbox = unionBBox(textResult.regions);
    const rendered = await renderTextLayer(captchaPath, textResult.regions, bbox, outputPath, cropToContent);
    return {
      group_id: textResult.group_id,
      background_path: textResult.background_path,
      image_size: textResult.image_size,
      text_bbox: rendered.text_bbox,
      text_pixel_count: rendered.text_pixel_count,
      output_path: rendered.output_path,
      stats: {
        region_count: textResult.stats.region_count,
        component_count: textResult.stats.component_count,
        diff_pixels: textResult.stats.diff_pixels,
        diff_threshold: textResult.stats.diff_threshold,
      },
    };
  }

  async extract_text_layer_dict(captchaPath: string, outputPath?: string, cropToContent: boolean = false) {
    return this.extract_text_layer(captchaPath, outputPath, cropToContent);
  }

  async extract_font_glyphs(captchaPath: string, includePixels: boolean = true, includeRgba2d: boolean = false): Promise<FontGlyphExtractResult> {
    const locateResult = await this.locate_fonts(captchaPath, true);
    let captchaImage: CaptchaRgbaImage | null = null;
    if (includeRgba2d) {
      const { width, height, pixels } = await loadRgbaPixelsFromPath(captchaPath);
      captchaImage = { width, height, pixels };
    }

    const glyphs = buildFontGlyphs(locateResult.components, captchaImage, includePixels, includeRgba2d);

    return {
      group_id: locateResult.group_id,
      background_path: locateResult.background_path,
      image_size: locateResult.image_size,
      glyphs,
      stats: {
        glyph_count: glyphs.length,
        component_count: locateResult.stats.component_count,
        diff_pixels: locateResult.stats.diff_pixels,
        diff_threshold: this.diffThreshold,
      },
    };
  }

  async extract_font_glyphs_dict(captchaPath: string, includePixels: boolean = true, includeRgba2d: boolean = false) {
    return this.extract_font_glyphs(captchaPath, includePixels, includeRgba2d);
  }

  async extract_font_glyph_features(captchaPath: string, targetWidth: number = 32, targetHeight: number = 32, keepAspectRatio: boolean = true): Promise<FontGlyphFeatureExtractResult> {
    const glyphResult = await this.extract_font_glyphs(captchaPath, false, false);
    const glyphFeatures = buildFontGlyphFeatures(glyphResult.glyphs, targetWidth, targetHeight, keepAspectRatio);
    return {
      group_id: glyphResult.group_id,
      background_path: glyphResult.background_path,
      image_size: glyphResult.image_size,
      target_size: [targetWidth, targetHeight],
      glyph_features: glyphFeatures,
      stats: {
        glyph_count: glyphFeatures.length,
        component_count: glyphResult.stats.component_count,
        diff_pixels: glyphResult.stats.diff_pixels,
        diff_threshold: this.diffThreshold,
      },
    };
  }

  async extract_font_glyph_features_dict(captchaPath: string, targetWidth: number = 32, targetHeight: number = 32, keepAspectRatio: boolean = true) {
    return this.extract_font_glyph_features(captchaPath, targetWidth, targetHeight, keepAspectRatio);
  }

  async extract_font_glyph_slots(captchaPath: string, slotCount: number = 5, targetWidth: number = 32, targetHeight: number = 32, keepAspectRatio: boolean = true): Promise<FontGlyphSlotExtractResult> {
    const featureResult = await this.extract_font_glyph_features(captchaPath, targetWidth, targetHeight, keepAspectRatio);
    const vectorLength = targetWidth * targetHeight;
    const slots = alignFontGlyphFeaturesToSlots(featureResult.glyph_features, slotCount, vectorLength);
    return {
      group_id: featureResult.group_id,
      background_path: featureResult.background_path,
      image_size: featureResult.image_size,
      target_size: featureResult.target_size,
      slot_count: slotCount,
      slots,
      stats: {
        slot_count: slotCount,
        filled_slots: slots.filter((slot) => slot.present).length,
        glyph_count: featureResult.stats.glyph_count,
        component_count: featureResult.stats.component_count,
      },
    };
  }

  async extract_font_glyph_slots_dict(captchaPath: string, slotCount: number = 5, targetWidth: number = 32, targetHeight: number = 32, keepAspectRatio: boolean = true) {
    return this.extract_font_glyph_slots(captchaPath, slotCount, targetWidth, targetHeight, keepAspectRatio);
  }

  async export_font_glyph_images(
    captchaPath: string,
    outputDir: string,
    filePrefix?: string,
    renderMode: GlyphRenderModeLike = GlyphRenderMode.ORIGINAL,
    useTextRegions: boolean = false
  ): Promise<FontGlyphImageExportResult> {
    let glyphs;
    let groupId;
    let backgroundPath;
    let imageSize: [number, number];

    if (useTextRegions) {
      const textResult = await this.locate_text_regions(captchaPath, true);
      const { width, height, pixels } = await loadRgbaPixelsFromPath(captchaPath);
      const captchaImage: CaptchaRgbaImage = { width, height, pixels };
      glyphs = buildFontGlyphsFromTextRegions(textResult.regions, captchaImage, false, true);
      groupId = textResult.group_id;
      backgroundPath = textResult.background_path;
      imageSize = textResult.image_size;
    } else {
      const glyphResult = await this.extract_font_glyphs(captchaPath, false, true);
      glyphs = glyphResult.glyphs;
      groupId = glyphResult.group_id;
      backgroundPath = glyphResult.background_path;
      imageSize = glyphResult.image_size;
    }

    const prefix = filePrefix || path.parse(captchaPath).name;
    return exportFontGlyphImages(groupId, backgroundPath, imageSize, glyphs, outputDir, prefix, renderMode);
  }

  async export_font_glyph_images_dict(
    captchaPath: string,
    outputDir: string,
    filePrefix?: string,
    renderMode: GlyphRenderModeLike = GlyphRenderMode.ORIGINAL,
    useTextRegions: boolean = false
  ) {
    return this.export_font_glyph_images(captchaPath, outputDir, filePrefix, renderMode, useTextRegions);
  }

  async export_text_glyph_images(
    captchaPath: string,
    outputDir: string,
    filePrefix?: string,
    renderMode: GlyphRenderModeLike = GlyphRenderMode.ORIGINAL
  ) {
    return this.export_font_glyph_images(captchaPath, outputDir, filePrefix, renderMode, true);
  }

  async export_text_glyph_images_dict(
    captchaPath: string,
    outputDir: string,
    filePrefix?: string,
    renderMode: GlyphRenderModeLike = GlyphRenderMode.ORIGINAL
  ) {
    return this.export_text_glyph_images(captchaPath, outputDir, filePrefix, renderMode);
  }
}
