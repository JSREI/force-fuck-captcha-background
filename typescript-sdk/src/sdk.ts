import fs from 'fs';
import {
  BackgroundDeepFeatureResult,
  BackgroundMeta,
  BackgroundRestoreResult,
  BackgroundTextureResult,
  CaptchaAutoResult,
  CaptchaType,
  CaptchaTypeLike,
  ForegroundSkewEstimateResult,
  GlyphRenderMode,
  GlyphRenderModeLike,
  RecognitionResult,
} from './types';
import { buildBackgroundIndex, buildBackgroundIndexFromFiles } from './background-index';
import { extractBackgroundDeepVector, extractBackgroundTextureMetrics } from './background-feature-engine';
import { estimateForegroundSkew } from './foreground-skew';
import { extractPatch } from './patch-extractor';
import { CaptchaFontLocator } from './locator';
import { CaptchaSliderLocator } from './slider-locator';
import { normalizeCaptchaType } from './types';
import { runLocalRestore } from './sdk-local-restore';
import { loadRgbaPixels } from './image-utils';
import { batchExtractFontGlyphFeatures } from './font-glyph-batch';
import { exportGlyphDatasetNpz } from './font-glyph-dataset';

export interface CaptchaVisionSDKOptions {
  diff_threshold?: number;
  font_min_component_pixels?: number;
  slider_min_gap_pixels?: number;
  connectivity?: number;
  text_min_width?: number;
  text_min_height?: number;
  text_min_fill_ratio?: number;
  text_max_fill_ratio?: number;
  text_merge_gap?: number;
  text_min_vertical_overlap_ratio?: number;
  text_expected_region_count?: number | null;
  text_force_merge_max_gap?: number;
}

export class CaptchaRecognizer {
  readonly font: CaptchaFontLocator;
  readonly slider: CaptchaSliderLocator;

  constructor(options: CaptchaVisionSDKOptions = {}) {
    this.font = new CaptchaFontLocator(
      options.diff_threshold ?? 18,
      options.font_min_component_pixels ?? 8,
      options.connectivity ?? 8,
      options.text_min_width ?? 3,
      options.text_min_height ?? 3,
      options.text_min_fill_ratio ?? 0.06,
      options.text_max_fill_ratio ?? 0.95,
      options.text_merge_gap ?? 2,
      options.text_min_vertical_overlap_ratio ?? 0.4,
      options.text_expected_region_count ?? 4,
      options.text_force_merge_max_gap ?? 28
    );
    this.slider = new CaptchaSliderLocator(
      options.diff_threshold ?? 18,
      options.slider_min_gap_pixels ?? 20,
      options.connectivity ?? 8
    );
  }

  get backgrounds(): Record<string, BackgroundMeta> {
    return this.font.backgroundsIndex;
  }

  private async resolveBackgroundForCaptcha(captchaPath: string): Promise<[string, string, [number, number]]> {
    const restored = await this.font.restore_background(captchaPath);
    return [restored.group_id, restored.background_path, restored.image_size];
  }

  private clamp01(value: number): number {
    return Math.max(0, Math.min(1, value));
  }

  private decideCaptchaType(params: {
    textRegionCount: number;
    textPixelCount: number;
    fontComponentCount: number;
    fontComponentPixels: number;
    sliderRegionCount: number;
    sliderGapPixels: number;
    sliderGapWidth: number;
    sliderGapHeight: number;
  }): { detectedType: 'text' | 'slider' | 'unknown'; textScore: number; sliderScore: number; confidence: number; reason: string } {
    const {
      textRegionCount,
      textPixelCount,
      fontComponentCount,
      fontComponentPixels,
      sliderRegionCount,
      sliderGapPixels,
      sliderGapWidth,
      sliderGapHeight,
    } = params;

    let textScore = 0.0;
    let sliderScore = 0.0;

    if (fontComponentCount > 0) {
      textScore += Math.min(fontComponentCount, 10) * 0.9;
    }
    if (fontComponentCount >= 3) {
      textScore += 2.0;
    }
    textScore += Math.min(fontComponentPixels / 120.0, 6.0);

    if (textRegionCount > 0) {
      textScore += Math.min(textRegionCount, 8) * 1.2;
    }
    if (textRegionCount >= 2 && textRegionCount <= 8) {
      textScore += 2.0;
    }
    textScore += Math.min(textPixelCount / 70.0, 8.0);

    if (sliderGapPixels > 0) {
      if (sliderGapPixels >= 180) {
        sliderScore += 3.0 + Math.min(sliderGapPixels / 80.0, 10.0);
      } else {
        sliderScore += Math.min(sliderGapPixels / 120.0, 1.5);
      }
    }
    sliderScore += Math.min(sliderRegionCount, 6) * 0.6;
    if (sliderGapWidth > 0 && sliderGapHeight > 0) {
      const ratio = Math.min(sliderGapWidth, sliderGapHeight) / Math.max(sliderGapWidth, sliderGapHeight);
      sliderScore += ratio * 2.0;
      if (ratio < 0.6) {
        sliderScore -= 0.8;
      }
    }

    if (sliderGapPixels > 0 && textRegionCount <= 1 && fontComponentCount <= 1) {
      textScore -= 1.5;
    }
    if ((textRegionCount >= 3 || fontComponentCount >= 3) && sliderGapPixels > 0) {
      sliderScore -= 1.0;
    }
    if (sliderGapPixels > 0 && sliderGapPixels < 180) {
      sliderScore -= 1.0;
      if (textRegionCount >= 1) {
        textScore += 1.2;
      }
    }

    let detectedType: 'text' | 'slider' | 'unknown' = 'unknown';
    let reason = 'insufficient foreground evidence for text or slider';
    if (textScore > sliderScore && textScore > 1.0) {
      detectedType = 'text';
      reason = `text_score=${textScore.toFixed(2)} > slider_score=${sliderScore.toFixed(2)}; font_components=${fontComponentCount}, region_count=${textRegionCount}, text_pixels=${textPixelCount}`;
    } else if (sliderScore > textScore && sliderScore > 1.0) {
      detectedType = 'slider';
      reason = `slider_score=${sliderScore.toFixed(2)} > text_score=${textScore.toFixed(2)}; gap_pixels=${sliderGapPixels}, slider_regions=${sliderRegionCount}, gap_size=${sliderGapWidth}x${sliderGapHeight}, font_components=${fontComponentCount}`;
    }

    const denom = Math.max(1.0, Math.abs(textScore) + Math.abs(sliderScore));
    const confidence = this.clamp01(Math.abs(textScore - sliderScore) / denom);
    return { detectedType, textScore, sliderScore, confidence, reason };
  }

  async build_background_index(backgroundDir: string, recursive: boolean = true, exts?: Iterable<string>) {
    const index = await buildBackgroundIndex(backgroundDir, recursive, exts);
    this.font.setBackgroundIndex(index);
    this.slider.setBackgroundIndex(index);
    return index;
  }

  async recognize_font(captchaPath: string, includePixels: boolean = true) {
    return this.font.locate_fonts(captchaPath, includePixels);
  }

  async recognize_font_dict(captchaPath: string, includePixels: boolean = true) {
    return this.font.locate_fonts_dict(captchaPath, includePixels);
  }

  async recognize_text(captchaPath: string, includePixels: boolean = true) {
    return this.recognize_text_positions(captchaPath, includePixels);
  }

  async recognize_text_dict(captchaPath: string, includePixels: boolean = true) {
    return this.recognize_text_positions_dict(captchaPath, includePixels);
  }

  async recognize_text_positions(captchaPath: string, includePixels: boolean = true) {
    return this.font.locate_text_positions(captchaPath, includePixels);
  }

  async recognize_text_positions_dict(captchaPath: string, includePixels: boolean = true) {
    return this.font.locate_text_positions_dict(captchaPath, includePixels);
  }

  async extract_text_layer(captchaPath: string, outputPath?: string, cropToContent: boolean = false) {
    return this.font.extract_text_layer(captchaPath, outputPath, cropToContent);
  }

  async extract_text_layer_dict(captchaPath: string, outputPath?: string, cropToContent: boolean = false) {
    return this.font.extract_text_layer_dict(captchaPath, outputPath, cropToContent);
  }

  async restore_background_by_captcha(captchaPath: string, outputPath?: string): Promise<BackgroundRestoreResult> {
    return this.font.restore_background_by_captcha(captchaPath, outputPath);
  }

  async restore_background_by_captcha_dict(captchaPath: string, outputPath?: string) {
    return this.font.restore_background_by_captcha_dict(captchaPath, outputPath);
  }

  async extract_font_glyphs(captchaPath: string, includePixels: boolean = true, includeRgba2d: boolean = false) {
    return this.font.extract_font_glyphs(captchaPath, includePixels, includeRgba2d);
  }

  async extract_font_glyphs_dict(captchaPath: string, includePixels: boolean = true, includeRgba2d: boolean = false) {
    return this.font.extract_font_glyphs_dict(captchaPath, includePixels, includeRgba2d);
  }

  async extract_font_glyph_features(captchaPath: string, targetWidth: number = 32, targetHeight: number = 32, keepAspectRatio: boolean = true) {
    return this.font.extract_font_glyph_features(captchaPath, targetWidth, targetHeight, keepAspectRatio);
  }

  async extract_font_glyph_features_dict(captchaPath: string, targetWidth: number = 32, targetHeight: number = 32, keepAspectRatio: boolean = true) {
    return this.font.extract_font_glyph_features_dict(captchaPath, targetWidth, targetHeight, keepAspectRatio);
  }

  async extract_font_glyph_slots(captchaPath: string, slotCount: number = 5, targetWidth: number = 32, targetHeight: number = 32, keepAspectRatio: boolean = true) {
    return this.font.extract_font_glyph_slots(captchaPath, slotCount, targetWidth, targetHeight, keepAspectRatio);
  }

  async extract_font_glyph_slots_dict(captchaPath: string, slotCount: number = 5, targetWidth: number = 32, targetHeight: number = 32, keepAspectRatio: boolean = true) {
    return this.font.extract_font_glyph_slots_dict(captchaPath, slotCount, targetWidth, targetHeight, keepAspectRatio);
  }

  async export_font_glyph_images(
    captchaPath: string,
    outputDir: string,
    filePrefix?: string,
    renderMode: GlyphRenderModeLike = GlyphRenderMode.ORIGINAL,
    useTextRegions: boolean = false
  ) {
    return this.font.export_font_glyph_images(captchaPath, outputDir, filePrefix, renderMode, useTextRegions);
  }

  async export_font_glyph_images_dict(
    captchaPath: string,
    outputDir: string,
    filePrefix?: string,
    renderMode: GlyphRenderModeLike = GlyphRenderMode.ORIGINAL,
    useTextRegions: boolean = false
  ) {
    return this.font.export_font_glyph_images_dict(captchaPath, outputDir, filePrefix, renderMode, useTextRegions);
  }

  async export_text_glyph_images(captchaPath: string, outputDir: string, filePrefix?: string, renderMode: GlyphRenderModeLike = GlyphRenderMode.ORIGINAL) {
    return this.font.export_text_glyph_images(captchaPath, outputDir, filePrefix, renderMode);
  }

  async export_text_glyph_images_dict(captchaPath: string, outputDir: string, filePrefix?: string, renderMode: GlyphRenderModeLike = GlyphRenderMode.ORIGINAL) {
    return this.font.export_text_glyph_images_dict(captchaPath, outputDir, filePrefix, renderMode);
  }

  async batch_extract_font_glyph_features(
    inputDir: string,
    targetWidth: number = 32,
    targetHeight: number = 32,
    recursive: boolean = true,
    exts?: Iterable<string>,
    limit?: number,
    includePayload: boolean = false,
    continueOnError: boolean = true
  ) {
    return batchExtractFontGlyphFeatures(
      inputDir,
      (captchaPath) => this.font.extract_font_glyph_features(captchaPath, targetWidth, targetHeight, true),
      targetWidth,
      targetHeight,
      recursive,
      exts,
      limit,
      includePayload,
      continueOnError
    );
  }

  async batch_extract_font_glyph_features_dict(
    inputDir: string,
    targetWidth: number = 32,
    targetHeight: number = 32,
    recursive: boolean = true,
    exts?: Iterable<string>,
    limit?: number,
    includePayload: boolean = false,
    continueOnError: boolean = true,
    outputJsonPath?: string
  ) {
    const result = await this.batch_extract_font_glyph_features(
      inputDir,
      targetWidth,
      targetHeight,
      recursive,
      exts,
      limit,
      includePayload,
      continueOnError
    );
    if (outputJsonPath) {
      const payload = {
        ...result,
        items: result.items,
      };
      await fs.promises.writeFile(outputJsonPath, JSON.stringify(payload, null, 2), 'utf8');
    }
    return result;
  }

  async export_font_glyph_dataset_npz(
    inputDir: string,
    outputNpzPath: string,
    targetWidth: number = 32,
    targetHeight: number = 32,
    recursive: boolean = true,
    exts?: Iterable<string>,
    limit?: number,
    continueOnError: boolean = true,
    outputJsonPath?: string
  ) {
    const batchResult = await this.batch_extract_font_glyph_features(
      inputDir,
      targetWidth,
      targetHeight,
      recursive,
      exts,
      limit,
      true,
      continueOnError
    );
    return exportGlyphDatasetNpz(batchResult, outputNpzPath, outputJsonPath);
  }

  async export_font_glyph_dataset_npz_dict(
    inputDir: string,
    outputNpzPath: string,
    targetWidth: number = 32,
    targetHeight: number = 32,
    recursive: boolean = true,
    exts?: Iterable<string>,
    limit?: number,
    continueOnError: boolean = true,
    outputJsonPath?: string
  ) {
    return this.export_font_glyph_dataset_npz(
      inputDir,
      outputNpzPath,
      targetWidth,
      targetHeight,
      recursive,
      exts,
      limit,
      continueOnError,
      outputJsonPath
    );
  }

  async recognize_auto(
    captchaPath: string,
    backgroundDir?: string,
    includePixels: boolean = true,
    textLayerOutputPath?: string,
    textGlyphOutputDir?: string,
    sliderGapOutputPath?: string,
    sliderBackgroundPatchOutputPath?: string,
    sliderPatchPadding: number = 2
  ): Promise<CaptchaAutoResult> {
    if (backgroundDir) {
      await this.build_background_index(backgroundDir);
    }

    const textResult = await this.recognize_text_positions(captchaPath, includePixels);
    const fontResult = await this.recognize_font(captchaPath, includePixels);
    const sliderResult = await this.recognize_slider(captchaPath);

    const textRegionCount = Number(textResult.stats.region_count || 0);
    const textPixelCount = Number(textResult.stats.text_pixel_count || 0);
    const fontComponentCount = Number(fontResult.stats.component_count || 0);
    const fontComponentPixels = fontResult.components.reduce((sum, c) => sum + c.pixel_count, 0);
    const sliderRegionCount = Number(sliderResult.stats.region_count || 0);
    const sliderGapPixels = sliderResult.gap ? sliderResult.gap.pixel_count : 0;
    let sliderGapWidth = 0;
    let sliderGapHeight = 0;
    if (sliderResult.gap) {
      const [left, top, right, bottom] = sliderResult.gap.bbox;
      sliderGapWidth = right - left + 1;
      sliderGapHeight = bottom - top + 1;
    }

    const decision = this.decideCaptchaType({
      textRegionCount,
      textPixelCount,
      fontComponentCount,
      fontComponentPixels,
      sliderRegionCount,
      sliderGapPixels,
      sliderGapWidth,
      sliderGapHeight,
    });

    const textPayload: Record<string, any> = {
      locate: textResult,
      components: fontResult,
      text_layer: textLayerOutputPath
        ? await this.extract_text_layer_dict(captchaPath, textLayerOutputPath, false)
        : null,
      glyph_images: textGlyphOutputDir
        ? await this.export_text_glyph_images_dict(captchaPath, textGlyphOutputDir, undefined, GlyphRenderMode.ORIGINAL)
        : null,
    };

    let gapPatch: any = null;
    let backgroundPatch: any = null;
    if (sliderResult.gap) {
      if (sliderGapOutputPath) {
        gapPatch = await extractPatch(captchaPath, sliderResult.gap.bbox, sliderGapOutputPath, sliderPatchPadding);
      }
      if (sliderBackgroundPatchOutputPath) {
        backgroundPatch = await extractPatch(sliderResult.background_path, sliderResult.gap.bbox, sliderBackgroundPatchOutputPath, sliderPatchPadding);
      }
    }

    const sliderPayload: Record<string, any> = {
      locate: sliderResult,
      gap_patch: gapPatch,
      background_patch: backgroundPatch,
    };

    return {
      detected_type: decision.detectedType,
      confidence: decision.confidence,
      reason: decision.reason,
      group_id: textResult.group_id,
      background_path: textResult.background_path,
      image_size: textResult.image_size,
      text_score: decision.textScore,
      slider_score: decision.sliderScore,
      text_payload: textPayload,
      slider_payload: sliderPayload,
      stats: {
        text_region_count: textRegionCount,
        text_pixel_count: textPixelCount,
        font_component_count: fontComponentCount,
        font_component_pixels: fontComponentPixels,
        slider_region_count: sliderRegionCount,
        slider_gap_pixels: sliderGapPixels,
        slider_gap_width: sliderGapWidth,
        slider_gap_height: sliderGapHeight,
      },
    };
  }

  async recognize_auto_dict(
    captchaPath: string,
    backgroundDir?: string,
    includePixels: boolean = true,
    textLayerOutputPath?: string,
    textGlyphOutputDir?: string,
    sliderGapOutputPath?: string,
    sliderBackgroundPatchOutputPath?: string,
    sliderPatchPadding: number = 2
  ) {
    return this.recognize_auto(
      captchaPath,
      backgroundDir,
      includePixels,
      textLayerOutputPath,
      textGlyphOutputDir,
      sliderGapOutputPath,
      sliderBackgroundPatchOutputPath,
      sliderPatchPadding
    );
  }

  async analyze_background_texture(captchaPath: string, gridRows: number = 4, gridCols: number = 4, histogramBins: number = 16, edgeThreshold: number = 18.0): Promise<BackgroundTextureResult> {
    const [groupId, backgroundPath, imageSize] = await this.resolveBackgroundForCaptcha(captchaPath);
    const { width, height, pixels } = await loadRgbaPixels(backgroundPath);
    const metrics = extractBackgroundTextureMetrics(pixels, width, height, gridRows, gridCols, histogramBins, edgeThreshold);
    return {
      group_id: groupId,
      background_path: backgroundPath,
      image_size: imageSize,
      mean_intensity: metrics.mean_intensity,
      std_intensity: metrics.std_intensity,
      entropy: metrics.entropy,
      edge_density: metrics.edge_density,
      histogram: metrics.histogram,
      grid_energy: metrics.grid_energy,
      stats: metrics.stats,
    };
  }

  async analyze_background_texture_dict(captchaPath: string, gridRows: number = 4, gridCols: number = 4, histogramBins: number = 16, edgeThreshold: number = 18.0) {
    return this.analyze_background_texture(captchaPath, gridRows, gridCols, histogramBins, edgeThreshold);
  }

  async extract_background_deep_features(captchaPath: string, levels?: Iterable<number>, edgeThreshold: number = 18.0): Promise<BackgroundDeepFeatureResult> {
    const [groupId, backgroundPath, imageSize] = await this.resolveBackgroundForCaptcha(captchaPath);
    const { width, height, pixels } = await loadRgbaPixels(backgroundPath);
    const deep = extractBackgroundDeepVector(pixels, width, height, levels, edgeThreshold);
    return {
      group_id: groupId,
      background_path: backgroundPath,
      image_size: imageSize,
      levels: deep.levels,
      patch_count: deep.patch_count,
      vector_1d: deep.vector_1d,
      stats: deep.stats,
    };
  }

  async extract_background_deep_features_dict(captchaPath: string, levels?: Iterable<number>, edgeThreshold: number = 18.0) {
    return this.extract_background_deep_features(captchaPath, levels, edgeThreshold);
  }

  async estimate_foreground_skew(captchaPath: string, minPixels: number = 20, maxAbsAngle: number = 45.0): Promise<ForegroundSkewEstimateResult> {
    const textResult = await this.recognize_text_positions(captchaPath, true);
    const foregroundPixels = textResult.regions.flatMap((region) => region.pixels);
    const skew = estimateForegroundSkew(foregroundPixels, minPixels, maxAbsAngle);
    return {
      group_id: textResult.group_id,
      background_path: textResult.background_path,
      image_size: textResult.image_size,
      angle_degrees: skew.angle_degrees,
      confidence: skew.confidence,
      pixel_count: skew.pixel_count,
      eigen_ratio: skew.eigen_ratio,
    };
  }

  async estimate_foreground_skew_dict(captchaPath: string, minPixels: number = 20, maxAbsAngle: number = 45.0) {
    return this.estimate_foreground_skew(captchaPath, minPixels, maxAbsAngle);
  }

  async recognize_slider(captchaPath: string) {
    return this.slider.locate_gap(captchaPath);
  }

  async recognize_slider_dict(captchaPath: string) {
    return this.slider.locate_gap_dict(captchaPath);
  }

  async run_local_restore(
    inputDir: string,
    outputDir: string,
    clearOutputBeforeRun: boolean = false,
    recursive: boolean = true,
    maxErrorItems: number = 200,
    progressCallback?: (status: any) => void,
    stopChecker?: () => boolean
  ) {
    const summary = await runLocalRestore(inputDir, outputDir, {
      clearOutputBeforeRun,
      recursive,
      maxErrorItems,
      onProgress: progressCallback,
      stopChecker,
    });
    if (summary.outputFiles > 0) {
      const index = await buildBackgroundIndexFromFiles(summary.buckets.map((bucket) => bucket.outputPath));
      this.font.setBackgroundIndex(index);
      this.slider.setBackgroundIndex(index);
    }
    return summary;
  }

  async run_local_restore_dict(
    inputDir: string,
    outputDir: string,
    clearOutputBeforeRun: boolean = false,
    recursive: boolean = true,
    maxErrorItems: number = 200,
    progressCallback?: (status: any) => void,
    stopChecker?: () => boolean
  ) {
    return this.run_local_restore(
      inputDir,
      outputDir,
      clearOutputBeforeRun,
      recursive,
      maxErrorItems,
      progressCallback,
      stopChecker
    );
  }

  async recognize(captchaPath: string, captchaType: CaptchaTypeLike = CaptchaType.TEXT, includePixels: boolean = true): Promise<RecognitionResult> {
    const normalized = normalizeCaptchaType(captchaType);
    if (normalized === CaptchaType.TEXT) {
      return this.recognize_text_positions(captchaPath, includePixels);
    }
    if (normalized === CaptchaType.FONT) {
      return this.recognize_font(captchaPath, includePixels);
    }
    if (normalized === CaptchaType.SLIDER) {
      return this.recognize_slider(captchaPath);
    }
    throw new Error(`unsupported captcha_type: ${captchaType}`);
  }

  async recognize_dict(captchaPath: string, captchaType: CaptchaTypeLike = CaptchaType.TEXT, includePixels: boolean = true) {
    return this.recognize(captchaPath, captchaType, includePixels);
  }
}

export const CaptchaVisionSDK = CaptchaRecognizer;
export const CaptchaTextLocator = CaptchaFontLocator;
export const CaptchaGapLocator = CaptchaSliderLocator;
