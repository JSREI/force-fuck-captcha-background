import fs from 'fs';
import path from 'path';
import { BackgroundMeta } from './types';
import { groupIdFromPixels } from './group-id';
import { loadRgbaPixels } from './image-utils';

const DEFAULT_IMAGE_EXTS = new Set(['.png', '.jpg', '.jpeg', '.webp', '.bmp']);

export async function loadRgbaPixelsFromPath(imagePath: string) {
  return loadRgbaPixels(imagePath);
}

export async function computeGroupId(imagePath: string): Promise<string> {
  const { width, height, pixels } = await loadRgbaPixels(imagePath);
  return groupIdFromPixels(pixels, width, height);
}

async function scanFiles(root: string, recursive: boolean): Promise<string[]> {
  const entries = await fs.promises.readdir(root, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const fullPath = path.join(root, entry.name);
    if (entry.isDirectory()) {
      if (recursive) {
        files.push(...await scanFiles(fullPath, recursive));
      }
    } else if (entry.isFile()) {
      files.push(fullPath);
    }
  }
  return files;
}

export async function buildBackgroundIndex(
  backgroundDir: string,
  recursive: boolean = true,
  exts?: Iterable<string>
): Promise<Record<string, BackgroundMeta>> {
  if (!fs.existsSync(backgroundDir) || !fs.statSync(backgroundDir).isDirectory()) {
    throw new Error(`background_dir not found: ${backgroundDir}`);
  }
  const validExts = exts ? new Set(Array.from(exts).map((e) => e.toLowerCase())) : DEFAULT_IMAGE_EXTS;
  const files = await scanFiles(backgroundDir, recursive);

  const index: Record<string, BackgroundMeta> = {};
  for (const filePath of files) {
    const ext = path.extname(filePath).toLowerCase();
    if (!validExts.has(ext)) {
      continue;
    }
    const { width, height, pixels } = await loadRgbaPixels(filePath);
    const groupId = groupIdFromPixels(pixels, width, height);
    if (!index[groupId]) {
      index[groupId] = {
        group_id: groupId,
        image_path: filePath,
        width,
        height,
      };
    }
  }
  return index;
}

export async function buildBackgroundIndexFromFiles(
  imagePaths: Iterable<string>,
  exts?: Iterable<string>
): Promise<Record<string, BackgroundMeta>> {
  const validExts = exts ? new Set(Array.from(exts).map((e) => e.toLowerCase())) : DEFAULT_IMAGE_EXTS;
  const index: Record<string, BackgroundMeta> = {};
  for (const filePath of imagePaths) {
    if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
      continue;
    }
    const ext = path.extname(filePath).toLowerCase();
    if (!validExts.has(ext)) {
      continue;
    }
    const { width, height, pixels } = await loadRgbaPixels(filePath);
    const groupId = groupIdFromPixels(pixels, width, height);
    if (!index[groupId]) {
      index[groupId] = {
        group_id: groupId,
        image_path: filePath,
        width,
        height,
      };
    }
  }
  return index;
}
