import { CaptchaImage, CaptchaRequestConfig, ProcessingStatus } from '../types';
import { logger } from '../../logger';
import { ImageSaver } from './image-saver';
import { RequestTaskExecutor } from './request-task-executor';

export class CaptchaRequestHandler {
  private status: ProcessingStatus = {
    status: 'idle',
    totalRequests: 0,
    completedRequests: 0,
    successRequests: 0,
    failedRequests: 0,
    downloadedImages: 0,
    bucketCount: 0,
    error: undefined
  };

  private captchaImages: CaptchaImage[] = [];
  private config: CaptchaRequestConfig | null = null;
  private abortController: AbortController | null = null;
  private imageSaver: ImageSaver;

  constructor(downloadDirectory: string) {
    this.imageSaver = new ImageSaver(downloadDirectory);
  }

  public getStatus(): ProcessingStatus {
    return { ...this.status };
  }

  public getCaptchaImages(): CaptchaImage[] {
    return [...this.captchaImages];
  }

  public async startProcessing(config: CaptchaRequestConfig): Promise<void> {
    this.initializeProcessing(config);

    try {
      await this.executeRequests();
      this.finalizeProcessing();
    } catch (error: any) {
      this.handleProcessingError(error);
    }
  }

  public stopProcessing(): void {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
    this.status.status = 'idle';
  }

  private initializeProcessing(config: CaptchaRequestConfig): void {
    this.config = config;
    this.status = {
      status: 'processing',
      totalRequests: config.requestCount,
      completedRequests: 0,
      successRequests: 0,
      failedRequests: 0,
      downloadedImages: 0,
      bucketCount: 0,
      error: undefined
    };
    this.captchaImages = [];
    this.abortController = new AbortController();

    logger.info(`开始处理验证码请求，总请求数: ${config.requestCount}, 并发数: ${config.concurrency}`);
  }

  private async executeRequests(): Promise<void> {
    if (!this.config || !this.abortController) {
      return;
    }

    const executor = new RequestTaskExecutor({
      config: this.config,
      signal: this.abortController.signal,
      imageSaver: this.imageSaver,
      status: this.status,
      captchaImages: this.captchaImages
    });
    await executor.run();
  }

  private finalizeProcessing(): void {
    if (this.status.status !== 'failed') {
      this.status.status = 'completed';
    }
  }

  private handleProcessingError(error: any): void {
    this.status.status = 'failed';
    this.status.error = error.message || '处理请求时发生错误';
    logger.error('验证码处理失败:', error);
  }
}

