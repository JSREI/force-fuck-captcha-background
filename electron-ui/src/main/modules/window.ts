import { BrowserWindow } from 'electron';
import * as isDev from 'electron-is-dev';
import { logger } from './logger';
import { loadMainWindowContent } from './window-utils/loader';
import { loadFallbackContent } from './window-utils/fallback';
import { resolveIndexPath, resolvePreloadPath } from './window-utils/paths';

let mainWindow: BrowserWindow | null = null;

export function createWindow(): BrowserWindow {
  logger.info('创建主窗口...');
  logger.debug('当前工作目录:', process.cwd());
  logger.debug('__dirname:', __dirname);

  const preloadPath = resolvePreloadPath();
  logger.debug('preload路径:', preloadPath);

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    show: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      webSecurity: false,
      preload: preloadPath
    },
  });

  mainWindow.maximize();
  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  const indexPath = resolveIndexPath();
  loadMainWindowContent(mainWindow, indexPath, Boolean(isDev));

  mainWindow.webContents.on('did-finish-load', () => {
    logger.info('内容加载完成');
  });
  mainWindow.webContents.on('did-fail-load', (_event, errorCode, errorDescription) => {
    logger.error('内容加载失败:', errorCode, errorDescription);
  });
  mainWindow.on('closed', () => {
    mainWindow = null;
    logger.info('主窗口已关闭');
  });

  return mainWindow;
}

export function getMainWindow(): BrowserWindow | null {
  return mainWindow;
}

export { loadFallbackContent };

