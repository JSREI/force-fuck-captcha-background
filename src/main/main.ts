import { app, BrowserWindow, ipcMain, net, shell } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import * as isDev from 'electron-is-dev';

// 主窗口引用
let mainWindow: BrowserWindow | null = null;

// 应用状态保存路径
const APP_STATE_FILE = path.join(app.getPath('userData'), 'app-state.json');

/**
 * 创建主应用窗口
 */
function createWindow(): void {
  console.log('创建主窗口...');
  console.log('当前工作目录:', process.cwd());
  console.log('__dirname:', __dirname);
  
  // 创建浏览器窗口 - 使用更宽松的安全限制以解决白屏问题
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    show: false, // 先不显示窗口，等最大化后再显示
    webPreferences: {
      nodeIntegration: true, // 允许Node集成
      contextIsolation: false, // 禁用上下文隔离
      webSecurity: false, // 禁用web安全策略
      preload: path.join(__dirname, 'preload.js')
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
  console.log('开始加载应用...');
  
  const indexPath = path.join(__dirname, 'index.html');
  console.log('检查index.html是否存在:', indexPath, fs.existsSync(indexPath));
  
  if (fs.existsSync(indexPath)) {
    console.log('从文件加载React应用:', indexPath);
    mainWindow.loadFile(indexPath);
  } else {
    console.error('找不到index.html文件，无法加载React应用');
    loadFallbackContent(mainWindow);
  }

  // 记录加载事件
  mainWindow.webContents.on('did-finish-load', () => {
    console.log('内容加载完成');
  });

  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.error('内容加载失败:', errorCode, errorDescription);
  });

  // 窗口关闭时释放资源
  mainWindow.on('closed', () => {
    mainWindow = null;
    console.log('主窗口已关闭');
  });
}

/**
 * 加载备用内容（当React应用加载失败时）
 */
function loadFallbackContent(window: BrowserWindow): void {
  console.log('加载备用内容...');
  
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

// 处理来自渲染进程的HTTP请求
ipcMain.handle('send-http-request', async (event, requestConfig) => {
  console.log('接收到HTTP请求:', requestConfig);
  
  try {
    // 解构请求配置
    const { method, url, headers, bodyType, body } = requestConfig;
    
    return new Promise((resolve, reject) => {
      // 使用Electron的net模块发送请求
      const request = net.request({
        method: method,
        url: url,
        redirect: 'follow'
      });
      
      // 设置请求头
      if (headers) {
        Object.entries(headers).forEach(([key, value]) => {
          request.setHeader(key, value as string);
        });
      }
      
      // 根据bodyType设置请求体
      if (bodyType === 'raw' && body) {
        request.write(body);
      } else if (bodyType === 'x-www-form-urlencoded' && body) {
        const formParams = new URLSearchParams();
        body.forEach((item: any) => {
          if (item.key) {
            formParams.append(item.key, item.value || '');
          }
        });
        request.setHeader('Content-Type', 'application/x-www-form-urlencoded');
        request.write(formParams.toString());
      } else if (bodyType === 'form-data' && body) {
        // 简化处理，仅支持文本表单项
        const boundary = `----WebKitFormBoundary${Math.random().toString(16).substr(2)}`;
        let formData = '';
        
        body.forEach((item: any) => {
          if (item.key) {
            formData += `--${boundary}\r\n`;
            formData += `Content-Disposition: form-data; name="${item.key}"\r\n\r\n`;
            formData += `${item.value || ''}\r\n`;
          }
        });
        
        formData += `--${boundary}--\r\n`;
        request.setHeader('Content-Type', `multipart/form-data; boundary=${boundary}`);
        request.write(formData);
      }
      
      // 处理响应
      request.on('response', (response) => {
        console.log(`请求状态码: ${response.statusCode}`);
        
        const responseHeaders: Record<string, string> = {};
        
        // 使用正确的方法获取响应头
        const headers = response.headers;
        Object.keys(headers).forEach(name => {
          const value = headers[name];
          if (value) {
            responseHeaders[name] = Array.isArray(value) ? value.join(', ') : value;
          }
        });
        
        // 读取响应体
        let responseData = '';
        response.on('data', (chunk) => {
          responseData += chunk.toString();
        });
        
        response.on('end', () => {
          // 尝试解析JSON
          let parsedData;
          try {
            parsedData = JSON.parse(responseData);
          } catch (e) {
            parsedData = responseData;
          }
          
          resolve({
            status: response.statusCode,
            statusText: response.statusMessage,
            headers: responseHeaders,
            data: parsedData
          });
        });
      });
      
      request.on('error', (error) => {
        console.error('请求出错:', error);
        reject({
          status: 0,
          statusText: 'Error',
          headers: {},
          data: {
            error: error.toString()
          }
        });
      });
      
      // 发送请求
      request.end();
    });
  } catch (error: any) {
    console.error('HTTP请求失败:', error);
    return {
      status: 0,
      statusText: 'Failed',
      headers: {},
      data: {
        error: error.message || '请求失败'
      }
    };
  }
});

// 应用就绪时创建窗口
app.whenReady().then(() => {
  console.log('应用就绪，创建窗口...');
  createWindow();
  
  // 处理打开外部链接的请求
  ipcMain.handle('open-external-link', async (event, url) => {
    console.log('打开外部链接:', url);
    try {
      // 使用默认浏览器打开URL
      await shell.openExternal(url);
      return { success: true };
    } catch (error: any) {
      console.error('打开外部链接失败:', error);
      return { success: false, error: error.toString() };
    }
  });

  // 保存应用状态
  ipcMain.handle('save-app-state', async (event, state) => {
    try {
      console.log('保存应用状态...');
      fs.writeFileSync(APP_STATE_FILE, JSON.stringify(state, null, 2), 'utf8');
      console.log('应用状态已保存到:', APP_STATE_FILE);
      return { success: true };
    } catch (error: any) {
      console.error('保存应用状态失败:', error);
      return { success: false, error: error.toString() };
    }
  });

  // 加载应用状态
  ipcMain.handle('load-app-state', async (event) => {
    try {
      console.log('加载应用状态...');
      if (fs.existsSync(APP_STATE_FILE)) {
        const stateData = fs.readFileSync(APP_STATE_FILE, 'utf8');
        const state = JSON.parse(stateData);
        console.log('应用状态已加载');
        return state;
      } else {
        console.log('应用状态文件不存在，返回null');
        return null;
      }
    } catch (error: any) {
      console.error('加载应用状态失败:', error);
      return null;
    }
  });

  // 清除应用状态
  ipcMain.handle('clear-app-state', async (event) => {
    try {
      console.log('清除应用状态...');
      if (fs.existsSync(APP_STATE_FILE)) {
        fs.unlinkSync(APP_STATE_FILE);
        console.log('应用状态已清除');
      } else {
        console.log('应用状态文件不存在，无需清除');
      }
      return { success: true };
    } catch (error: any) {
      console.error('清除应用状态失败:', error);
      return { success: false, error: error.toString() };
    }
  });
});

// 处理窗口全部关闭的情况
app.on('window-all-closed', () => {
  console.log('所有窗口已关闭');
  // 在macOS上保持应用运行，直到用户使用Cmd+Q退出
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// 处理应用激活事件
app.on('activate', () => {
  console.log('应用被激活');
  // 在macOS上，点击dock图标重新创建窗口
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
}); 