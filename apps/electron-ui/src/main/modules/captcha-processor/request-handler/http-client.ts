import { net } from 'electron';
import { CaptchaRequestConfig } from '../types';
import { logger } from '../../logger';
import { setupRequestBody } from './http-client/body';
import { getProxyUrl } from './http-client/proxy';
import { setupRequestAbort, setupRequestHeaders, setupRequestResponse } from './http-client/response';

export class HttpClient {
  public static async sendRequest(config: CaptchaRequestConfig, signal: AbortSignal): Promise<any> {
    return new Promise((resolve, reject) => {
      if (signal.aborted) {
        reject(new Error('请求已中止'));
        return;
      }

      const request = this.createRequest(config);
      setupRequestAbort(request, signal, reject);
      setupRequestHeaders(request, config);
      setupRequestBody(request, config);
      setupRequestResponse(request, signal, resolve, reject);
      request.end();
    });
  }

  public static async downloadFile(url: string, config?: CaptchaRequestConfig): Promise<Buffer> {
    return new Promise<Buffer>((resolve, reject) => {
      const proxyUrl = config ? getProxyUrl(config) : undefined;
      const request = net.request({ url, redirect: 'follow', ...(proxyUrl ? { proxyUrl } : {}) });

      request.on('response', (response) => {
        const chunks: Buffer[] = [];
        response.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
        response.on('end', () => resolve(Buffer.concat(chunks)));
      });

      request.on('error', reject);
      request.end();
    });
  }

  private static createRequest(config: CaptchaRequestConfig): Electron.ClientRequest {
    const proxyUrl = getProxyUrl(config);
    if (proxyUrl) {
      logger.debug(`使用代理请求: ${proxyUrl}`);
    }
    return net.request({
      method: config.method,
      url: config.url,
      redirect: 'follow',
      ...(proxyUrl ? { proxyUrl } : {})
    });
  }
}

