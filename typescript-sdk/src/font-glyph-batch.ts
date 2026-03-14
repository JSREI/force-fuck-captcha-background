import fs from 'fs';
import path from 'path';
import { BatchGlyphExtractItem, BatchGlyphExtractResult, FontGlyphFeatureExtractResult } from './types';

const DEFAULT_IMAGE_EXTS = new Set(['.png', '.jpg', '.jpeg', '.webp', '.bmp', '.gif']);

export async function scanCaptchaFiles(
  inputDir: string,
  recursive: boolean = true,
  exts?: Iterable<string>,
  limit?: number
): Promise<string[]> {
  const root = path.resolve(inputDir);
  if (!fs.existsSync(root) || !fs.statSync(root).isDirectory()) {
    throw new Error(`input_dir not found: ${inputDir}`);
  }
  const validExts = exts ? new Set(Array.from(exts).map((e) => e.toLowerCase())) : DEFAULT_IMAGE_EXTS;

  async function scan(dir: string): Promise<string[]> {
    const entries = await fs.promises.readdir(dir, { withFileTypes: true });
    const files: string[] = [];
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (recursive) {
          files.push(...await scan(fullPath));
        }
      } else if (entry.isFile()) {
        if (validExts.has(path.extname(fullPath).toLowerCase())) {
          files.push(fullPath);
        }
      }
    }
    return files;
  }

  let files = await scan(root);
  files.sort();
  if (limit !== undefined) {
    if (limit < 0) {
      throw new Error('limit must be >= 0');
    }
    files = files.slice(0, limit);
  }
  return files;
}

export async function batchExtractFontGlyphFeatures(
  inputDir: string,
  extractor: (captchaPath: string) => Promise<FontGlyphFeatureExtractResult>,
  targetWidth: number,
  targetHeight: number,
  recursive: boolean = true,
  exts?: Iterable<string>,
  limit?: number,
  includePayload: boolean = false,
  continueOnError: boolean = true
): Promise<BatchGlyphExtractResult> {
  const files = await scanCaptchaFiles(inputDir, recursive, exts, limit);

  const items: BatchGlyphExtractItem[] = [];
  let successCount = 0;
  let errorCount = 0;

  for (const filePath of files) {
    try {
      const result = await extractor(filePath);
      items.push({
        captcha_path: filePath,
        status: 'ok',
        group_id: result.group_id,
        glyph_count: result.glyph_features.length,
        error: null,
        result: includePayload ? result : null,
      });
      successCount += 1;
    } catch (error: any) {
      items.push({
        captcha_path: filePath,
        status: 'error',
        group_id: null,
        glyph_count: 0,
        error: error?.message || String(error),
        result: null,
      });
      errorCount += 1;
      if (!continueOnError) {
        break;
      }
    }
  }

  return {
    input_dir: path.resolve(inputDir),
    total_files: files.length,
    processed_files: items.length,
    success_count: successCount,
    error_count: errorCount,
    target_size: [targetWidth, targetHeight],
    items,
  };
}
