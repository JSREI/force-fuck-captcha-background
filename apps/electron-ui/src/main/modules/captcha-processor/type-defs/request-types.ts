export interface ProxyConfig {
  useSystemProxy?: boolean;
  proxyUrl?: string;
}

export interface CaptchaRequestConfig {
  url: string;
  method: string;
  headers?: Record<string, string>;
  bodyType?: 'raw' | 'x-www-form-urlencoded' | 'form-data';
  body?: any;
  requestCount: number;
  concurrency: number;
  interval: number;
  captchaUrlExtractor: {
    type: 'json-path' | 'regex';
    pattern: string;
    groupIndex?: number;
    baseUrl?: string;
  };
  proxy?: ProxyConfig;
}

