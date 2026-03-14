import * as fs from 'fs';
import * as path from 'path';

export function cleanupDirectoryFiles(downloadDirectory: string): void {
  try {
    const files = fs.readdirSync(downloadDirectory);
    for (const file of files) {
      const filePath = path.join(downloadDirectory, file);
      if (fs.statSync(filePath).isFile()) {
        fs.unlinkSync(filePath);
      }
    }
  } catch (error) {
    console.error('清理临时文件失败:', error);
  }
}

