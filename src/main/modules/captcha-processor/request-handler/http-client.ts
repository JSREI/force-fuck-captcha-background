import { net } from 'electron';
import { CaptchaRequestConfig } from '../types';
import { logger } from '../../logger';

/**
 * HTTP 客户端工具类
 * 负责处理所有的 HTTP 请求
 */
export class HttpClient {
  /**
   * 从环境变量获取系统代理
   * @returns 系统代理URL或undefined
   */
  private static getSystemProxy(): string | undefined {
    // 优先使用 HTTPS 代理
    const httpsProxy = process.env.HTTPS_PROXY || process.env.https_proxy;
    if (httpsProxy) {
      return httpsProxy;
    }

    // 其次使用 HTTP 代理
    const httpProxy = process.env.HTTP_PROXY || process.env.http_proxy;
    if (httpProxy) {
      return httpProxy;
    }

    return undefined;
  }

  /**
   * 获取代理URL
   * @param config 请求配置
   * @returns 代理URL或undefined
   */
  private static getProxyUrl(config: CaptchaRequestConfig): string | undefined {
    if (!config.proxy) {
      return undefined;
    }

    // 如果指定了代理URL，直接使用
    if (config.proxy.proxyUrl) {
      return config.proxy.proxyUrl;
    }

    // 如果启用了系统代理，从环境变量获取
    if (config.proxy.useSystemProxy) {
      const systemProxy = this.getSystemProxy();
      if (systemProxy) {
        logger.debug(`使用系统代理: ${systemProxy}`);
        return systemProxy;
      } else {
        logger.warn('未找到系统代理配置');
      }
    }

    return undefined;
  }

  /**
   * 发送 HTTP 请求
   * @param config 请求配置
   * @param signal 中止信号
   * @returns 响应数据，如果是 JSON 则解析为对象，否则返回字符串
   */
  public static async sendRequest(config: CaptchaRequestConfig, signal: AbortSignal): Promise<any> {
    return new Promise((resolve, reject) => {
      if (signal.aborted) {
        reject(new Error('请求已中止'));
        return;
      }

      const request = this.createRequest(config);
      this.setupRequestAbort(request, signal, reject);
      this.setupRequestHeaders(request, config);
      this.setupRequestBody(request, config);
      this.setupRequestResponse(request, signal, resolve, reject);
      request.end();
    });
  }

  /**
   * 下载文件
   * @param url 文件URL
   * @param config 请求配置（可选，用于获取代理设置）
   * @returns 文件数据的 Buffer
   */
  public static async downloadFile(url: string, config?: CaptchaRequestConfig): Promise<Buffer> {
    return new Promise<Buffer>((resolve, reject) => {
      const proxyUrl = config ? this.getProxyUrl(config) : undefined;
      const request = net.request({
        url,
        redirect: 'follow',
        ...(proxyUrl ? { proxyUrl } : {})
      });
      
      request.on('response', (response) => {
        const chunks: Buffer[] = [];
        
        response.on('data', (chunk) => {
          chunks.push(Buffer.from(chunk));
        });
        
        response.on('end', () => {
          resolve(Buffer.concat(chunks));
        });
      });
      
      request.on('error', reject);
      request.end();
    });
  }

  /**
   * 创建请求对象
   */
  private static createRequest(config: CaptchaRequestConfig): Electron.ClientRequest {
    const proxyUrl = this.getProxyUrl(config);
    return net.request({
      method: config.method,
      url: config.url,
      redirect: 'follow',
      ...(proxyUrl ? { proxyUrl } : {})
    });
  }

  /**
   * 设置请求中止处理
   */
  private static setupRequestAbort(
    request: Electron.ClientRequest,
    signal: AbortSignal,
    reject: (reason?: any) => void
  ): void {
    signal.addEventListener('abort', () => {
      request.abort();
      reject(new Error('请求已中止'));
    }, { once: true });
  }

  /**
   * 设置请求头
   */
  private static setupRequestHeaders(request: Electron.ClientRequest, config: CaptchaRequestConfig): void {
    if (config.headers) {
      Object.entries(config.headers).forEach(([key, value]) => {
        request.setHeader(key, value);
      });
    }
  }

  /**
   * 设置请求体
   */
  private static setupRequestBody(request: Electron.ClientRequest, config: CaptchaRequestConfig): void {
    if (!config.bodyType || !config.body) return;

    switch (config.bodyType) {
      case 'raw':
        request.write(config.body);
        break;
      case 'x-www-form-urlencoded':
        this.setupFormUrlEncodedBody(request, config.body);
        break;
      case 'form-data':
        this.setupFormDataBody(request, config.body);
        break;
    }
  }

  /**
   * 设置 x-www-form-urlencoded 格式的请求体
   */
  private static setupFormUrlEncodedBody(request: Electron.ClientRequest, body: any[]): void {
    const formParams = new URLSearchParams();
    body.forEach((item: any) => {
      if (item.key) {
        formParams.append(item.key, item.value || '');
      }
    });
    request.setHeader('Content-Type', 'application/x-www-form-urlencoded');
    request.write(formParams.toString());
  }

  /**
   * 设置 form-data 格式的请求体
   */
  private static setupFormDataBody(request: Electron.ClientRequest, body: any[]): void {
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

  /**
   * 设置响应处理
   */
  private static setupRequestResponse(
    request: Electron.ClientRequest,
    signal: AbortSignal,
    resolve: (value: any) => void,
    reject: (reason?: any) => void
  ): void {
    request.on('response', (response) => {
      let responseData = '';
      response.on('data', (chunk) => {
        responseData += chunk.toString();
      });
      
      response.on('end', () => {
        if (signal.aborted) return;
        this.handleResponseData(responseData, resolve);
      });
    });

    request.on('error', (error) => {
      if (!signal.aborted) {
        reject(error);
      }
    });
  }

  /**
   * 处理响应数据
   */
  private static handleResponseData(responseData: string, resolve: (value: any) => void): void {
    try {
      const parsedData = JSON.parse(responseData);
      resolve(parsedData);
    } catch (e) {
      resolve(responseData);
    }
  }
} 