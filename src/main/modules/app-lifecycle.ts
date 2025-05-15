import { app, BrowserWindow } from 'electron';
import { createWindow } from './window';
import { logger } from './logger';

/**
 * 设置应用生命周期事件处理
 */
export function setupAppLifecycle(): void {
  // 处理窗口全部关闭的情况
  app.on('window-all-closed', () => {
    logger.info('所有窗口已关闭');
    // 在macOS上保持应用运行，直到用户使用Cmd+Q退出
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });

  // 处理应用激活事件
  app.on('activate', () => {
    logger.info('应用被激活');
    // 在macOS上，点击dock图标重新创建窗口
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
} 