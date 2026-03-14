import { app, ipcMain, dialog } from 'electron';
import path from 'path';
import fs from 'fs';
import { logger } from './logger';

interface Settings {
  workspacePath: string;
  useSystemProxy: boolean;
  customProxy: string;
}

class SettingsManager {
  private settingsPath: string;
  private settings: Settings;

  constructor() {
    // 设置文件路径
    this.settingsPath = path.join(app.getPath('userData'), 'settings.json');
    
    // 默认设置
    this.settings = {
      workspacePath: path.join(process.cwd(), 'workspace'),
      useSystemProxy: false,
      customProxy: ''
    };

    // 加载已保存的设置
    this.loadSettings();
    
    // 确保工作目录存在
    this.ensureWorkspaceExists();
    
    // 注册IPC处理器
    this.registerIpcHandlers();
  }

  private loadSettings() {
    try {
      if (fs.existsSync(this.settingsPath)) {
        const data = fs.readFileSync(this.settingsPath, 'utf8');
        this.settings = { ...this.settings, ...JSON.parse(data) };
        logger.info('已加载设置:', this.settings);
      } else {
        logger.info('使用默认设置:', this.settings);
      }
    } catch (error) {
      logger.error('加载设置失败:', error);
    }
  }

  private saveSettings() {
    try {
      fs.writeFileSync(this.settingsPath, JSON.stringify(this.settings, null, 2));
      logger.info('设置已保存');
    } catch (error) {
      logger.error('保存设置失败:', error);
    }
  }

  private ensureWorkspaceExists() {
    try {
      if (!fs.existsSync(this.settings.workspacePath)) {
        fs.mkdirSync(this.settings.workspacePath, { recursive: true });
        logger.info('已创建工作目录:', this.settings.workspacePath);
      }
    } catch (error) {
      logger.error('创建工作目录失败:', error);
    }
  }

  private registerIpcHandlers() {
    // 获取设置
    ipcMain.handle('get-settings', () => {
      return this.settings;
    });

    // 保存设置
    ipcMain.handle('save-settings', (_, newSettings: Settings) => {
      this.settings = { ...this.settings, ...newSettings };
      this.saveSettings();
      this.ensureWorkspaceExists();
      return this.settings;
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
  }

  // 获取当前工作目录
  public getWorkspacePath(): string {
    return this.settings.workspacePath;
  }

  // 获取代理设置
  public getProxySettings() {
    return {
      useSystemProxy: this.settings.useSystemProxy,
      customProxy: this.settings.customProxy
    };
  }
}

// 导出单例实例
export const settingsManager = new SettingsManager(); 