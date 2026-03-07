import { CaptchaRequestConfig } from '../captcha-processor/types';

export function buildAxiosProxy(config: CaptchaRequestConfig): { host: string; port: number; protocol: string } | undefined {
  if (!config.proxy?.proxyUrl) {
    return undefined;
  }
  const parsed = new URL(config.proxy.proxyUrl);
  return {
    host: parsed.hostname,
    port: parseInt(parsed.port, 10),
    protocol: parsed.protocol.slice(0, -1)
  };
}

export function extractImageUrl(responseData: any, config: CaptchaRequestConfig): string {
  if (config.captchaUrlExtractor.type === 'json-path') {
    const paths = config.captchaUrlExtractor.pattern.split('.');
    let value = responseData;
    for (const path of paths) {
      value = value[path];
    }
    if (!value) {
      throw new Error('无法提取验证码图片URL');
    }
    return value;
  }

  const match = responseData.match(new RegExp(config.captchaUrlExtractor.pattern));
  if (match && match[config.captchaUrlExtractor.groupIndex || 1]) {
    return match[config.captchaUrlExtractor.groupIndex || 1];
  }
  throw new Error('无法提取验证码图片URL');
}

export function normalizeImageUrl(imageUrl: string, config: CaptchaRequestConfig): string {
  if (imageUrl.startsWith('http')) {
    return imageUrl;
  }
  const baseUrl = config.captchaUrlExtractor.baseUrl || config.url;
  return new URL(imageUrl, baseUrl).toString();
}

