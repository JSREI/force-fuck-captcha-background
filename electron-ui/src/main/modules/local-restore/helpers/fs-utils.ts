import fs from 'fs';
import path from 'path';

export async function scanAllFiles(dirPath: string): Promise<string[]> {
  const files: string[] = [];
  const entries = await fs.promises.readdir(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      files.push(...await scanAllFiles(fullPath));
    } else if (entry.isFile()) {
      files.push(fullPath);
    }
  }

  return files;
}

export async function hasDirEntries(dirPath: string): Promise<boolean> {
  const entries = await fs.promises.readdir(dirPath);
  return entries.length > 0;
}

export async function clearDirectoryContents(dirPath: string): Promise<void> {
  const entries = await fs.promises.readdir(dirPath);
  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry);
    await fs.promises.rm(fullPath, { recursive: true, force: true });
  }
}

