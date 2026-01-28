import { app, BrowserWindow, ipcMain, dialog } from 'electron';
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
import path from 'path';
import fs from 'fs';
import { DownloadManager } from './modules/download-manager';

/**
 * 验证码辅助工具主入口
 */
console.log('应用启动中...');
console.log('开发模式:', isDev ? '是' : '否');

// 设置应用生命周期事件处理
setupAppLifecycle();

// 设置文件路径
const settingsPath = path.join(app.getPath('userData'), 'settings.json');

// 加载设置
function loadSettings() {
  try {
    if (fs.existsSync(settingsPath)) {
      return JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
    }
  } catch (error) {
    console.error('加载设置失败:', error);
  }
  return {
    workspacePath: path.join(app.getPath('userData'), 'workspace'),
    useSystemProxy: false,
    customProxy: ''
  };
}

// 保存设置
function saveSettings(settings: any) {
  try {
    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
  } catch (error) {
    console.error('保存设置失败:', error);
  }
}

// 设置 IPC 处理程序
function setupSettingsHandlers() {
  // 获取设置
  ipcMain.handle('get-settings', () => {
    return loadSettings();
  });

  // 选择目录
  ipcMain.handle('select-directory', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory']
    });
    if (!result.canceled && result.filePaths.length > 0) {
      return result.filePaths[0];
    }
    return null;
  });

  // 保存设置
  ipcMain.handle('save-settings', (event, settings) => {
    saveSettings(settings);
    return true;
  });
}

// 应用就绪时初始化所有模块
app.whenReady().then(() => {
  console.log('应用就绪，初始化所有模块...');
  
  // 设置 IPC 处理程序
  setupSettingsHandlers();
  
  // 创建主窗口
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  // 打开开发者工具并将输出保存到文件
  mainWindow.webContents.openDevTools();
  const logFile = path.join(app.getPath('userData'), 'renderer.log');
  mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
    const timestamp = new Date().toISOString();
    const logMessage = `${timestamp} [${level}] ${message}\n`;
    fs.appendFileSync(logFile, logMessage);
  });
  
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

  // 注册下载相关的IPC处理程序
  ipcMain.handle('start-download', async (event, config) => {
    await downloadManager.startDownload(config);
  });

  ipcMain.handle('open-directory', (event, type) => {
    downloadManager.openDirectory(type);
  });
  
  console.log('所有模块初始化完成');
}); 