import { app, ipcMain } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import { logger } from './logger';

// 应用状态保存路径
const APP_STATE_FILE = path.join(app.getPath('userData'), 'app-state.json');

/**
 * 设置应用状态管理
 */
export function setupStateManager(): void {
  // 保存应用状态
  ipcMain.handle('save-app-state', async (event, state) => {
    try {
      logger.info('保存应用状态...');
      fs.writeFileSync(APP_STATE_FILE, JSON.stringify(state, null, 2), 'utf8');
      logger.info('应用状态已保存到:', APP_STATE_FILE);
      return { success: true };
    } catch (error: any) {
      logger.error('保存应用状态失败:', error);
      return { success: false, error: error.toString() };
    }
  });

  // 加载应用状态
  ipcMain.handle('load-app-state', async (event) => {
    try {
      logger.info('加载应用状态...');
      if (fs.existsSync(APP_STATE_FILE)) {
        const stateData = fs.readFileSync(APP_STATE_FILE, 'utf8');
        const state = JSON.parse(stateData);
        logger.info('应用状态已加载');
        return state;
      } else {
        logger.info('应用状态文件不存在，返回null');
        return null;
      }
    } catch (error: any) {
      logger.error('加载应用状态失败:', error);
      return null;
    }
  });

  // 清除应用状态
  ipcMain.handle('clear-app-state', async (event) => {
    try {
      logger.info('清除应用状态...');
      if (fs.existsSync(APP_STATE_FILE)) {
        fs.unlinkSync(APP_STATE_FILE);
        logger.info('应用状态已清除');
      } else {
        logger.info('应用状态文件不存在，无需清除');
      }
      return { success: true };
    } catch (error: any) {
      logger.error('清除应用状态失败:', error);
      return { success: false, error: error.toString() };
    }
  });
} 