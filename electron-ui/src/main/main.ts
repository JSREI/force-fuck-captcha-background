import { app, ipcMain, shell } from 'electron';
import * as isDev from 'electron-is-dev';
import {
  createWindow,
  setupHttpHandler,
  setupStateManager,
  setupExternalLinkHandler,
  setupAppLifecycle,
  setupCaptchaProcessor,
  settingsManager
} from './modules';
import { DownloadManager } from './modules/download-manager';
import { LocalRestoreManager } from './modules/local-restore-manager';

/**
 * 验证码辅助工具主入口
 */
console.log('应用启动中...');
console.log('开发模式:', isDev ? '是' : '否');

// 设置应用生命周期事件处理
setupAppLifecycle();

// 应用就绪时初始化所有模块
app.whenReady().then(() => {
  console.log('应用就绪，初始化所有模块...');
  
  // 创建并加载主窗口（统一通过 window.ts 处理入口）
  const mainWindow = createWindow();
  
  // 设置HTTP请求处理程序
  setupHttpHandler();
  
  // 设置应用状态管理
  setupStateManager();
  
  // 设置外部链接处理
  setupExternalLinkHandler();
  
  // 设置验证码处理模块
  setupCaptchaProcessor();

  // 初始化设置管理器
  settingsManager;
  
  const downloadManager = new DownloadManager(mainWindow);
  const localRestoreManager = new LocalRestoreManager();

  // 注册下载相关的IPC处理程序
  ipcMain.handle('start-download', async (event, config) => {
    await downloadManager.startDownload(config);
  });

  ipcMain.handle('open-directory', (event, type) => {
    downloadManager.openDirectory(type);
  });

  ipcMain.handle('start-local-restore', async (_, config) => {
    return localRestoreManager.start(config, mainWindow);
  });

  ipcMain.handle('stop-local-restore', async () => {
    return localRestoreManager.stop();
  });

  ipcMain.handle('get-local-restore-status', async () => {
    return localRestoreManager.getStatus();
  });

  ipcMain.handle('open-path', async (_, targetPath: string) => {
    try {
      const result = await shell.openPath(targetPath);
      if (result) {
        return { success: false, error: result };
      }
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error?.message || String(error) };
    }
  });
  
  console.log('所有模块初始化完成');
});
