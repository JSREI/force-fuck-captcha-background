import { CaptchaRequestConfig } from '../../types';

export function getSystemProxy(): string | undefined {
  const httpsProxy = process.env.HTTPS_PROXY || process.env.https_proxy;
  if (httpsProxy) {
    return httpsProxy;
  }

  const httpProxy = process.env.HTTP_PROXY || process.env.http_proxy;
  if (httpProxy) {
    return httpProxy;
  }

  return undefined;
}

export function getProxyUrl(config: CaptchaRequestConfig): string | undefined {
  if (!config.proxy) {
    return undefined;
  }
  if (config.proxy.proxyUrl) {
    return config.proxy.proxyUrl;
  }
  if (config.proxy.useSystemProxy) {
    return getSystemProxy();
  }
  return undefined;
}

