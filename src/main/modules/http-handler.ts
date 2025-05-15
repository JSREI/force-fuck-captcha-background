import { ipcMain, net } from 'electron';
import { logger } from './logger';

/**
 * 设置HTTP请求处理程序
 */
export function setupHttpHandler(): void {
  // 处理来自渲染进程的HTTP请求
  ipcMain.handle('send-http-request', async (event, requestConfig) => {
    logger.info('接收到HTTP请求:', requestConfig);
    
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
          logger.debug(`请求状态码: ${response.statusCode}`);
          
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
          logger.error('请求出错:', error);
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
      logger.error('HTTP请求失败:', error);
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
} 