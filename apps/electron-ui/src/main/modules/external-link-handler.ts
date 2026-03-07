import { ipcMain, shell } from 'electron';
import { logger } from './logger';

/**
 * 设置外部链接处理
 */
export function setupExternalLinkHandler(): void {
  // 处理打开外部链接的请求
  ipcMain.handle('open-external-link', async (event, url) => {
    logger.info('打开外部链接:', url);
    try {
      // 使用默认浏览器打开URL
      await shell.openExternal(url);
      return { success: true };
    } catch (error: any) {
      logger.error('打开外部链接失败:', error);
      return { success: false, error: error.toString() };
    }
  });
} 