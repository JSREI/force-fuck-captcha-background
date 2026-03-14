import {
  LocalRestoreConfig,
  LocalRestoreRunOptions,
  LocalRestoreStatus,
  LocalRestoreSummary,
} from './types';
import { MAX_ERROR_ITEMS, DEFAULT_PROGRESS_INTERVAL_MS } from './local-restore/constants';
import { BucketState } from './local-restore/types';
import { validateAndPreparePaths } from './local-restore/path-validation';
import { executeLocalRestoreRun } from './local-restore/task-runner';
import { buildRunSummary, calculateSpeedPerSecond, createInitialLocalRestoreStatus } from './local-restore/status-utils';
import { PythonBridge, PythonBridgeOptions } from './python-bridge';

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

export async function runLocalRestore(
  inputDir: string,
  outputDir: string,
  options: LocalRestoreRunOptions = {}
): Promise<LocalRestoreSummary> {
  const status = createInitialLocalRestoreStatus();
  const buckets = new Map<string, BucketState>();
  const errors: { file: string; reason: string }[] = [];

  const progressInterval = options.progressIntervalMs ?? DEFAULT_PROGRESS_INTERVAL_MS;
  let lastProgressAt = 0;

  const emitProgress = (force: boolean) => {
    if (!options.onProgress) {
      return;
    }
    const now = Date.now();
    if (!force && now - lastProgressAt < progressInterval) {
      return;
    }
    lastProgressAt = now;
    options.onProgress({ ...status });
  };

  const shouldStop = () => {
    const stopped = Boolean(options.stopChecker && options.stopChecker());
    if (stopped) {
      status.stopRequested = true;
    }
    return stopped;
  };

  const pushError = (filePath: string, reason: string) => {
    if (errors.length >= MAX_ERROR_ITEMS) {
      return;
    }
    errors.push({ file: filePath, reason });
  };

  const config: LocalRestoreConfig = {
    inputDir,
    outputDir,
    clearOutputBeforeRun: options.clearOutputBeforeRun,
  };

  const validated = await validateAndPreparePaths(config);
  if (!validated.accepted || !validated.normalizedInput || !validated.normalizedOutput) {
    throw new Error(validated.reason || 'path_validation_failed');
  }

  const normalizedConfig = {
    ...config,
    inputDir: validated.normalizedInput,
    outputDir: validated.normalizedOutput,
  };

  status.status = 'running';
  status.inputDir = normalizedConfig.inputDir;
  status.outputDir = normalizedConfig.outputDir;
  status.startTime = Date.now();

  try {
    const summary = await executeLocalRestoreRun({
      config: normalizedConfig,
      status,
      buckets,
      errors,
      shouldStop,
      pushError,
      emitProgress,
    });
    emitProgress(true);
    return summary;
  } catch (error: any) {
    const now = Date.now();
    status.status = 'failed';
    status.endTime = now;
    status.currentFile = null;
    status.errorMessage = error?.message || String(error);
    status.speedPerSecond = calculateSpeedPerSecond(status);
    emitProgress(true);
    return buildRunSummary({
      status,
      finishedStatus: 'failed',
      bucketSummaries: [],
      errors,
      now,
    });
  }
}

class PythonBackedSDK {
  protected bridge: PythonBridge;
  protected initOptions: CaptchaVisionSDKOptions;
  protected backgroundDir?: string;
  protected className: string;

  constructor(className: string, options: CaptchaVisionSDKOptions = {}, bridgeOptions: PythonBridgeOptions = {}) {
    this.className = className;
    this.initOptions = options;
    this.bridge = new PythonBridge(bridgeOptions);
  }

  protected callPython(method: string, args: any[] = [], kwargs?: Record<string, any>) {
    return this.bridge.call({
      class: this.className,
      method,
      args,
      kwargs,
      init: this.initOptions,
      background_dir: this.backgroundDir || null,
    });
  }
}

export class CaptchaVisionSDK extends PythonBackedSDK {
  constructor(options: CaptchaVisionSDKOptions = {}, bridgeOptions: PythonBridgeOptions = {}) {
    super('CaptchaVisionSDK', options, bridgeOptions);
  }

  async build_background_index(...args: any[]) {
    if (args[0]) {
      this.backgroundDir = String(args[0]);
    }
    return this.callPython('build_background_index', args);
  }

  async recognize_font(...args: any[]) {
    return this.callPython('recognize_font', args);
  }

  async recognize_font_dict(...args: any[]) {
    return this.callPython('recognize_font_dict', args);
  }

  async recognize_text(...args: any[]) {
    return this.callPython('recognize_text', args);
  }

  async recognize_text_dict(...args: any[]) {
    return this.callPython('recognize_text_dict', args);
  }

  async recognize_text_positions(...args: any[]) {
    return this.callPython('recognize_text_positions', args);
  }

  async recognize_text_positions_dict(...args: any[]) {
    return this.callPython('recognize_text_positions_dict', args);
  }

  async extract_text_layer(...args: any[]) {
    return this.callPython('extract_text_layer', args);
  }

  async extract_text_layer_dict(...args: any[]) {
    return this.callPython('extract_text_layer_dict', args);
  }

  async restore_background_by_captcha(...args: any[]) {
    return this.callPython('restore_background_by_captcha', args);
  }

  async restore_background_by_captcha_dict(...args: any[]) {
    return this.callPython('restore_background_by_captcha_dict', args);
  }

  async extract_font_glyphs(...args: any[]) {
    return this.callPython('extract_font_glyphs', args);
  }

  async extract_font_glyphs_dict(...args: any[]) {
    return this.callPython('extract_font_glyphs_dict', args);
  }

  async extract_font_glyph_features(...args: any[]) {
    return this.callPython('extract_font_glyph_features', args);
  }

  async extract_font_glyph_features_dict(...args: any[]) {
    return this.callPython('extract_font_glyph_features_dict', args);
  }

  async extract_font_glyph_slots(...args: any[]) {
    return this.callPython('extract_font_glyph_slots', args);
  }

  async extract_font_glyph_slots_dict(...args: any[]) {
    return this.callPython('extract_font_glyph_slots_dict', args);
  }

  async export_font_glyph_images(...args: any[]) {
    return this.callPython('export_font_glyph_images', args);
  }

  async export_font_glyph_images_dict(...args: any[]) {
    return this.callPython('export_font_glyph_images_dict', args);
  }

  async export_text_glyph_images(...args: any[]) {
    return this.callPython('export_text_glyph_images', args);
  }

  async export_text_glyph_images_dict(...args: any[]) {
    return this.callPython('export_text_glyph_images_dict', args);
  }

  async batch_extract_font_glyph_features(...args: any[]) {
    return this.callPython('batch_extract_font_glyph_features', args);
  }

  async batch_extract_font_glyph_features_dict(...args: any[]) {
    return this.callPython('batch_extract_font_glyph_features_dict', args);
  }

  async export_font_glyph_dataset_npz(...args: any[]) {
    return this.callPython('export_font_glyph_dataset_npz', args);
  }

  async export_font_glyph_dataset_npz_dict(...args: any[]) {
    return this.callPython('export_font_glyph_dataset_npz_dict', args);
  }

  async recognize_auto(...args: any[]) {
    return this.callPython('recognize_auto', args);
  }

  async recognize_auto_dict(...args: any[]) {
    return this.callPython('recognize_auto_dict', args);
  }

  async analyze_background_texture(...args: any[]) {
    return this.callPython('analyze_background_texture', args);
  }

  async analyze_background_texture_dict(...args: any[]) {
    return this.callPython('analyze_background_texture_dict', args);
  }

  async extract_background_deep_features(...args: any[]) {
    return this.callPython('extract_background_deep_features', args);
  }

  async extract_background_deep_features_dict(...args: any[]) {
    return this.callPython('extract_background_deep_features_dict', args);
  }

  async estimate_foreground_skew(...args: any[]) {
    return this.callPython('estimate_foreground_skew', args);
  }

  async estimate_foreground_skew_dict(...args: any[]) {
    return this.callPython('estimate_foreground_skew_dict', args);
  }

  async recognize_slider(...args: any[]) {
    return this.callPython('recognize_slider', args);
  }

  async recognize_slider_dict(...args: any[]) {
    return this.callPython('recognize_slider_dict', args);
  }

  async run_local_restore(...args: any[]) {
    return this.callPython('run_local_restore', args);
  }

  async run_local_restore_dict(...args: any[]) {
    return this.callPython('run_local_restore_dict', args);
  }

  async recognize(...args: any[]) {
    return this.callPython('recognize', args);
  }

  async recognize_dict(...args: any[]) {
    return this.callPython('recognize_dict', args);
  }
}

export class CaptchaTextLocator extends PythonBackedSDK {
  constructor(options: CaptchaVisionSDKOptions = {}, bridgeOptions: PythonBridgeOptions = {}) {
    super('CaptchaTextLocator', options, bridgeOptions);
  }

  async build_background_index(...args: any[]) {
    if (args[0]) {
      this.backgroundDir = String(args[0]);
    }
    return this.callPython('build_background_index', args);
  }

  async compute_group_id(...args: any[]) {
    return this.callPython('compute_group_id', args);
  }

  async locate_fonts(...args: any[]) {
    return this.callPython('locate_fonts', args);
  }

  async locate_fonts_dict(...args: any[]) {
    return this.callPython('locate_fonts_dict', args);
  }

  async locate_text_positions(...args: any[]) {
    return this.callPython('locate_text_positions', args);
  }

  async locate_text_positions_dict(...args: any[]) {
    return this.callPython('locate_text_positions_dict', args);
  }

  async extract_text_layer(...args: any[]) {
    return this.callPython('extract_text_layer', args);
  }

  async extract_text_layer_dict(...args: any[]) {
    return this.callPython('extract_text_layer_dict', args);
  }

  async restore_background_by_captcha(...args: any[]) {
    return this.callPython('restore_background_by_captcha', args);
  }

  async restore_background_by_captcha_dict(...args: any[]) {
    return this.callPython('restore_background_by_captcha_dict', args);
  }

  async extract_font_glyphs(...args: any[]) {
    return this.callPython('extract_font_glyphs', args);
  }

  async extract_font_glyphs_dict(...args: any[]) {
    return this.callPython('extract_font_glyphs_dict', args);
  }

  async extract_font_glyph_features(...args: any[]) {
    return this.callPython('extract_font_glyph_features', args);
  }

  async extract_font_glyph_features_dict(...args: any[]) {
    return this.callPython('extract_font_glyph_features_dict', args);
  }

  async extract_font_glyph_slots(...args: any[]) {
    return this.callPython('extract_font_glyph_slots', args);
  }

  async extract_font_glyph_slots_dict(...args: any[]) {
    return this.callPython('extract_font_glyph_slots_dict', args);
  }

  async export_font_glyph_images(...args: any[]) {
    return this.callPython('export_font_glyph_images', args);
  }

  async export_font_glyph_images_dict(...args: any[]) {
    return this.callPython('export_font_glyph_images_dict', args);
  }

  async export_text_glyph_images(...args: any[]) {
    return this.callPython('export_text_glyph_images', args);
  }

  async export_text_glyph_images_dict(...args: any[]) {
    return this.callPython('export_text_glyph_images_dict', args);
  }
}

export class CaptchaGapLocator extends PythonBackedSDK {
  constructor(options: CaptchaVisionSDKOptions = {}, bridgeOptions: PythonBridgeOptions = {}) {
    super('CaptchaGapLocator', options, bridgeOptions);
  }

  async build_background_index(...args: any[]) {
    if (args[0]) {
      this.backgroundDir = String(args[0]);
    }
    return this.callPython('build_background_index', args);
  }

  async compute_group_id(...args: any[]) {
    return this.callPython('compute_group_id', args);
  }

  async locate_gap(...args: any[]) {
    return this.callPython('locate_gap', args);
  }

  async locate_gap_dict(...args: any[]) {
    return this.callPython('locate_gap_dict', args);
  }
}
