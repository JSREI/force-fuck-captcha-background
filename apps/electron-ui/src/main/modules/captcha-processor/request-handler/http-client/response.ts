import { CaptchaRequestConfig } from '../../types';

export function setupRequestAbort(
  request: Electron.ClientRequest,
  signal: AbortSignal,
  reject: (reason?: any) => void
): void {
  signal.addEventListener('abort', () => {
    request.abort();
    reject(new Error('请求已中止'));
  }, { once: true });
}

export function setupRequestHeaders(request: Electron.ClientRequest, config: CaptchaRequestConfig): void {
  if (!config.headers) {
    return;
  }
  Object.entries(config.headers).forEach(([key, value]) => {
    request.setHeader(key, value);
  });
}

export function setupRequestResponse(
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
      if (signal.aborted) {
        return;
      }
      handleResponseData(responseData, resolve);
    });
  });

  request.on('error', (error) => {
    if (!signal.aborted) {
      reject(error);
    }
  });
}

function handleResponseData(responseData: string, resolve: (value: any) => void): void {
  try {
    resolve(JSON.parse(responseData));
  } catch {
    resolve(responseData);
  }
}

