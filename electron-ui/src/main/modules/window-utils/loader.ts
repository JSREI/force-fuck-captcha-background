import fs from 'fs';
import { BrowserWindow } from 'electron';
import { loadFallbackContent } from './fallback';
import { logger } from '../logger';

export function loadMainWindowContent(mainWindow: BrowserWindow, indexPath: string, isDev: boolean): void {
  logger.info('开始加载应用...');
  logger.debug('检查index.html是否存在:', indexPath, fs.existsSync(indexPath));

  if (isDev) {
    const devUrl = 'http://localhost:9000';
    logger.info('开发模式从URL加载React应用:', devUrl);
    mainWindow.loadURL(devUrl).catch((error) => {
      logger.error('开发模式加载URL失败，尝试回退文件加载:', error);
      if (fs.existsSync(indexPath)) {
        mainWindow.loadFile(indexPath);
      } else {
        loadFallbackContent(mainWindow);
      }
    });
    return;
  }

  if (fs.existsSync(indexPath)) {
    logger.info('从文件加载React应用:', indexPath);
    mainWindow.loadFile(indexPath);
    return;
  }

  logger.error('找不到index.html文件，无法加载React应用');
  loadFallbackContent(mainWindow);
}

