export type RGB = [number, number, number];
export type RGBA = [number, number, number, number];
export type BBox = [number, number, number, number];
export type Pixel = [number, number];

export enum CaptchaType {
  TEXT = 'text',
  FONT = 'font',
  SLIDER = 'slider'
}

export enum GlyphRenderMode {
  ORIGINAL = 'original',
  BLACK_ON_TRANSPARENT = 'black_on_transparent',
  BLACK_ON_WHITE = 'black_on_white',
  WHITE_ON_BLACK = 'white_on_black'
}

export type CaptchaTypeLike = CaptchaType | 'text' | 'font' | 'slider' | string;
export type GlyphRenderModeLike =
  | GlyphRenderMode
  | 'original'
  | 'black_on_transparent'
  | 'black_on_white'
  | 'white_on_black'
  | string;

export function normalizeCaptchaType(captchaType: CaptchaTypeLike): CaptchaType {
  if (typeof captchaType !== 'string') {
    return captchaType;
  }
  const value = String(captchaType).trim().toLowerCase();
  if (value === CaptchaType.TEXT) {
    return CaptchaType.TEXT;
  }
  if (value === CaptchaType.FONT) {
    return CaptchaType.FONT;
  }
  if (value === CaptchaType.SLIDER) {
    return CaptchaType.SLIDER;
  }
  throw new Error("captcha_type must be CaptchaType.TEXT/FONT/SLIDER or one of 'text'/'font'/'slider'");
}

export function normalizeGlyphRenderMode(renderMode: GlyphRenderModeLike): GlyphRenderMode {
  if (typeof renderMode !== 'string') {
    return renderMode;
  }
  const value = String(renderMode).trim().toLowerCase();
  if (value === GlyphRenderMode.ORIGINAL) {
    return GlyphRenderMode.ORIGINAL;
  }
  if (value === GlyphRenderMode.BLACK_ON_TRANSPARENT) {
    return GlyphRenderMode.BLACK_ON_TRANSPARENT;
  }
  if (value === GlyphRenderMode.BLACK_ON_WHITE) {
    return GlyphRenderMode.BLACK_ON_WHITE;
  }
  if (value === GlyphRenderMode.WHITE_ON_BLACK) {
    return GlyphRenderMode.WHITE_ON_BLACK;
  }
  throw new Error(
    "render_mode must be GlyphRenderMode.ORIGINAL/BLACK_ON_TRANSPARENT/BLACK_ON_WHITE/WHITE_ON_BLACK or one of 'original'/'black_on_transparent'/'black_on_white'/'white_on_black'"
  );
}

export interface BackgroundMeta {
  group_id: string;
  image_path: string;
  width: number;
  height: number;
}

export interface FontComponent {
  color: RGB;
  bbox: BBox;
  pixel_count: number;
  pixels: Pixel[];
}

export interface LocateResult {
  group_id: string;
  background_path: string;
  image_size: [number, number];
  components: FontComponent[];
  stats: Record<string, number>;
}

export interface SliderGap {
  bbox: BBox;
  center: Pixel;
  pixel_count: number;
}

export interface SliderLocateResult {
  group_id: string;
  background_path: string;
  image_size: [number, number];
  gap: SliderGap | null;
  stats: Record<string, number>;
}

export interface TextRegion {
  bbox: BBox;
  pixel_count: number;
  component_count: number;
  colors: RGB[];
  score: number;
  pixels: Pixel[];
}

export interface TextLocateResult {
  group_id: string;
  background_path: string;
  image_size: [number, number];
  regions: TextRegion[];
  stats: Record<string, number>;
}

export interface TextLayerResult {
  group_id: string;
  background_path: string;
  image_size: [number, number];
  text_bbox: BBox | null;
  text_pixel_count: number;
  output_path: string | null;
  stats: Record<string, number>;
}

export interface BackgroundRestoreResult {
  group_id: string;
  background_path: string;
  image_size: [number, number];
  output_path: string | null;
}

export interface FontGlyph {
  rect_index: number;
  bbox: BBox;
  width: number;
  height: number;
  color: RGB;
  pixel_count: number;
  pixels: Pixel[];
  bitmap_2d: number[][];
  rgba_2d: RGBA[][] | null;
}

export interface FontGlyphExtractResult {
  group_id: string;
  background_path: string;
  image_size: [number, number];
  glyphs: FontGlyph[];
  stats: Record<string, number>;
}

export interface FontGlyphFeature {
  rect_index: number;
  bbox: BBox;
  width: number;
  height: number;
  color: RGB;
  pixel_count: number;
  density: number;
  bitmap_2d: number[][];
  resized_bitmap_2d: number[][];
  vector_1d: number[];
}

export interface FontGlyphFeatureExtractResult {
  group_id: string;
  background_path: string;
  image_size: [number, number];
  target_size: [number, number];
  glyph_features: FontGlyphFeature[];
  stats: Record<string, number>;
}

export interface BatchGlyphExtractItem {
  captcha_path: string;
  status: 'ok' | 'error';
  group_id: string | null;
  glyph_count: number;
  error: string | null;
  result: FontGlyphFeatureExtractResult | null;
}

export interface BatchGlyphExtractResult {
  input_dir: string;
  total_files: number;
  processed_files: number;
  success_count: number;
  error_count: number;
  target_size: [number, number];
  items: BatchGlyphExtractItem[];
}

export interface GlyphDatasetExportResult {
  input_dir: string;
  total_files: number;
  processed_files: number;
  success_count: number;
  error_count: number;
  glyph_sample_count: number;
  target_size: [number, number];
  output_npz_path: string;
  output_json_path: string | null;
}

export interface FontGlyphSlot {
  slot_index: number;
  present: boolean;
  rect_index: number | null;
  bbox: BBox | null;
  vector_1d: number[];
  density: number;
}

export interface FontGlyphSlotExtractResult {
  group_id: string;
  background_path: string;
  image_size: [number, number];
  target_size: [number, number];
  slot_count: number;
  slots: FontGlyphSlot[];
  stats: Record<string, number>;
}

export interface FontGlyphImageItem {
  rect_index: number;
  bbox: BBox;
  image_path: string;
  width: number;
  height: number;
  pixel_count: number;
}

export interface FontGlyphImageExportResult {
  group_id: string;
  background_path: string;
  image_size: [number, number];
  output_dir: string;
  glyph_images: FontGlyphImageItem[];
  stats: Record<string, number>;
}

export interface BackgroundTextureResult {
  group_id: string;
  background_path: string;
  image_size: [number, number];
  mean_intensity: number;
  std_intensity: number;
  entropy: number;
  edge_density: number;
  histogram: number[];
  grid_energy: number[];
  stats: Record<string, number>;
}

export interface BackgroundDeepFeatureResult {
  group_id: string;
  background_path: string;
  image_size: [number, number];
  levels: number[];
  patch_count: number;
  vector_1d: number[];
  stats: Record<string, number>;
}

export interface ForegroundSkewEstimateResult {
  group_id: string;
  background_path: string;
  image_size: [number, number];
  angle_degrees: number;
  confidence: number;
  pixel_count: number;
  eigen_ratio: number;
}

export interface CaptchaAutoResult {
  detected_type: 'text' | 'slider' | 'unknown';
  confidence: number;
  reason: string;
  group_id: string;
  background_path: string;
  image_size: [number, number];
  text_score: number;
  slider_score: number;
  text_payload: Record<string, any> | null;
  slider_payload: Record<string, any> | null;
  stats: Record<string, number>;
}

export type RecognitionResult = LocateResult | SliderLocateResult | TextLocateResult;

export type LocalRestoreTaskStatus = 'idle' | 'running' | 'completed' | 'failed' | 'stopped';

export interface LocalRestoreConfig {
  inputDir: string;
  outputDir: string;
  clearOutputBeforeRun?: boolean;
  recursive?: boolean;
  maxErrorItems?: number;
}

export interface ProcessingErrorItem {
  file: string;
  reason: string;
}

export interface BucketSummary {
  id: string;
  width: number;
  height: number;
  imageCount: number;
  outputFile: string;
  outputPath: string;
}

export interface LocalRestoreSummary {
  status: Exclude<LocalRestoreTaskStatus, 'idle' | 'running'>;
  inputDir: string;
  outputDir: string;
  startTime: number;
  endTime: number;
  durationMs: number;
  totalFiles: number;
  imageFiles: number;
  processedFiles: number;
  succeededFiles: number;
  failedFiles: number;
  skippedFiles: number;
  bucketCount: number;
  completedBucketCount: number;
  outputFiles: number;
  buckets: BucketSummary[];
  errors: ProcessingErrorItem[];
}

export interface LocalRestoreStatus {
  status: LocalRestoreTaskStatus;
  inputDir: string;
  outputDir: string;
  startTime: number | null;
  endTime: number | null;
  totalFiles: number;
  imageFiles: number;
  processedFiles: number;
  succeededFiles: number;
  failedFiles: number;
  skippedFiles: number;
  bucketCount: number;
  completedBucketCount: number;
  speedPerSecond: number;
  currentFile: string | null;
  stopRequested: boolean;
  summaryPath: string | null;
  errorMessage: string | null;
}

export type ProgressCallback = (status: LocalRestoreStatus) => void;
export type StopChecker = () => boolean;

export interface LocalRestoreRunOptions {
  clearOutputBeforeRun?: boolean;
  onProgress?: ProgressCallback;
  progressIntervalMs?: number;
  stopChecker?: StopChecker;
}
