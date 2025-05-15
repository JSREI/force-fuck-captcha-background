import { app } from 'electron';
import * as isDev from 'electron-is-dev';
import {
  createWindow,
  setupHttpHandler,
  setupStateManager,
  setupExternalLinkHandler,
  setupAppLifecycle,
  setupCaptchaProcessor
} from './modules';

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
  
  // 创建主窗口
  createWindow();
  
  // 设置HTTP请求处理程序
  setupHttpHandler();
  
  // 设置应用状态管理
  setupStateManager();
  
  // 设置外部链接处理
  setupExternalLinkHandler();
  
  // 设置验证码处理模块
  setupCaptchaProcessor();
  
  console.log('所有模块初始化完成');
}); 