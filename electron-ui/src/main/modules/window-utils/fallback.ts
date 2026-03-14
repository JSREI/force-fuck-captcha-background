import { BrowserWindow } from 'electron';
import { logger } from '../logger';

function buildFallbackHtml(): string {
  return `
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
}

export function loadFallbackContent(window: BrowserWindow): void {
  logger.info('加载备用内容...');
  const htmlContent = buildFallbackHtml();
  window.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`);
}

