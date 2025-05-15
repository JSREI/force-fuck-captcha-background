import { BrowserWindow } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import { logger } from './logger';

// 主窗口引用
let mainWindow: BrowserWindow | null = null;

/**
 * 创建主应用窗口
 */
export function createWindow(): BrowserWindow {
  logger.info('创建主窗口...');
  logger.debug('当前工作目录:', process.cwd());
  logger.debug('__dirname:', __dirname);
  
  // 创建浏览器窗口 - 使用更宽松的安全限制以解决白屏问题
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    show: false, // 先不显示窗口，等最大化后再显示
    webPreferences: {
      nodeIntegration: true, // 允许Node集成
      contextIsolation: false, // 禁用上下文隔离
      webSecurity: false, // 禁用web安全策略
      preload: path.join(__dirname, '..', 'preload.js')
    },
  });

  // 最大化窗口
  mainWindow.maximize();
  
  // 窗口准备好后再显示，避免调整大小时的闪烁
  mainWindow.once('ready-to-show', () => {
    if (mainWindow) {
      mainWindow.show();
    }
  });

  // 加载应用
  logger.info('开始加载应用...');
  
  const indexPath = path.join(__dirname, '..', 'index.html');
  logger.debug('检查index.html是否存在:', indexPath, fs.existsSync(indexPath));
  
  if (fs.existsSync(indexPath)) {
    logger.info('从文件加载React应用:', indexPath);
    mainWindow.loadFile(indexPath);
  } else {
    logger.error('找不到index.html文件，无法加载React应用');
    loadFallbackContent(mainWindow);
  }

  // 记录加载事件
  mainWindow.webContents.on('did-finish-load', () => {
    logger.info('内容加载完成');
  });

  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    logger.error('内容加载失败:', errorCode, errorDescription);
  });

  // 窗口关闭时释放资源
  mainWindow.on('closed', () => {
    mainWindow = null;
    logger.info('主窗口已关闭');
  });
  
  return mainWindow;
}

/**
 * 获取主窗口实例
 */
export function getMainWindow(): BrowserWindow | null {
  return mainWindow;
}

/**
 * 加载备用内容（当React应用加载失败时）
 */
export function loadFallbackContent(window: BrowserWindow): void {
  logger.info('加载备用内容...');
  
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>验证码辅助工具 - 加载失败</title>
      <style>
        body { 
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
          margin: 0; 
          padding: 0; 
          background-color: #f0f2f5; 
        }
        .header { 
          background: #1890ff; 
          color: white; 
          padding: 15px 20px; 
        }
        .container { 
          max-width: 800px; 
          margin: 0 auto; 
          padding: 20px; 
        }
        .content { 
          background: white; 
          margin-top: 20px; 
          padding: 20px; 
          border-radius: 4px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        .error {
          color: #ff4d4f;
          background-color: #fff2f0;
          border: 1px solid #ffccc7;
          padding: 15px;
          border-radius: 4px;
          margin-top: 20px;
        }
        button { 
          background: #1890ff; 
          color: white; 
          border: none; 
          padding: 8px 16px; 
          border-radius: 4px; 
          cursor: pointer; 
          margin-top: 15px;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1 style="margin: 0;">验证码辅助工具</h1>
      </div>
      
      <div class="container">
        <div class="content">
          <h2>应用加载失败</h2>
          <p>无法加载React应用，请检查以下可能的原因：</p>
          
          <div class="error">
            <p><strong>找不到index.html文件</strong></p>
            <p>这可能是由于构建过程中出现问题，或者文件路径配置错误。</p>
          </div>
          
          <p>路径信息:</p>
          <ul>
            <li>当前目录: ${process.cwd()}</li>
            <li>__dirname: ${__dirname}</li>
          </ul>
          
          <button onclick="location.reload()">刷新页面</button>
        </div>
      </div>
    </body>
    </html>
  `;
  
  window.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`);
} 