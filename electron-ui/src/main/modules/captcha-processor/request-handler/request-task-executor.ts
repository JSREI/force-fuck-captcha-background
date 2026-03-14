import { CaptchaImage, CaptchaRequestConfig, ProcessingStatus } from '../types';
import { logger } from '../../logger';
import { Semaphore } from './semaphore';
import { HttpClient } from './http-client';
import { UrlExtractor } from './url-extractor';
import { ImageSaver } from './image-saver';

export class RequestTaskExecutor {
  private readonly config: CaptchaRequestConfig;
  private readonly signal: AbortSignal;
  private readonly imageSaver: ImageSaver;
  private readonly status: ProcessingStatus;
  private readonly captchaImages: CaptchaImage[];

  constructor(params: {
    config: CaptchaRequestConfig;
    signal: AbortSignal;
    imageSaver: ImageSaver;
    status: ProcessingStatus;
    captchaImages: CaptchaImage[];
  }) {
    this.config = params.config;
    this.signal = params.signal;
    this.imageSaver = params.imageSaver;
    this.status = params.status;
    this.captchaImages = params.captchaImages;
  }

  public async run(): Promise<void> {
    const requestPromises: Promise<void>[] = [];
    const semaphore = new Semaphore(this.config.concurrency);

    for (let i = 0; i < this.config.requestCount; i += 1) {
      requestPromises.push(this.executeRequestWithDelay(i, semaphore));
    }

    await Promise.all(requestPromises);
  }

  private async executeRequestWithDelay(index: number, semaphore: Semaphore): Promise<void> {
    await this.delay(index * this.config.interval);
    if (this.signal.aborted) {
      return;
    }

    await semaphore.acquire();
    try {
      await this.executeRequest(index);
    } finally {
      semaphore.release();
    }
  }

  private async delay(ms: number): Promise<void> {
    if (ms <= 0) {
      return;
    }

    return new Promise<void>((resolve) => {
      const timeoutId = setTimeout(() => resolve(), ms);
      this.signal.addEventListener('abort', () => {
        clearTimeout(timeoutId);
        resolve();
      }, { once: true });
    });
  }

  private async executeRequest(index: number): Promise<void> {
    if (this.signal.aborted) {
      return;
    }

    try {
      logger.debug(`开始执行第 ${index + 1} 个请求`);
      const response = await HttpClient.sendRequest(this.config, this.signal);
      await this.handleRequestSuccess(index, response);
    } catch (error: any) {
      this.handleRequestError(index, error);
    }
  }

  private async handleRequestSuccess(index: number, response: any): Promise<void> {
    this.status.completedRequests += 1;
    this.status.successRequests += 1;

    const captchaUrl = UrlExtractor.extractUrl(response, this.config.captchaUrlExtractor, this.config.url);
    if (!captchaUrl) {
      logger.warn(`未能从响应中提取验证码URL，请求索引: ${index}`);
      return;
    }

    logger.debug(`成功提取验证码URL: ${captchaUrl}`);
    const captchaImage = this.createCaptchaImage(index, captchaUrl);

    const imageData = await HttpClient.downloadFile(captchaUrl);
    await this.imageSaver.saveImage(captchaImage, imageData);
    this.captchaImages.push(captchaImage);
    this.status.downloadedImages += 1;
  }

  private handleRequestError(index: number, error: any): void {
    this.status.completedRequests += 1;
    this.status.failedRequests += 1;
    logger.error(`请求 ${index} 失败: ${error.message || error}`);
  }

  private createCaptchaImage(index: number, url: string): CaptchaImage {
    return {
      id: `img_${Date.now()}_${index}`,
      requestIndex: index,
      url
    };
  }
}

