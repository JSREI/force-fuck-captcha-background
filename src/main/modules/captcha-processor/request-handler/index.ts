import { CaptchaRequestConfig, CaptchaImage, ProcessingStatus } from '../types';
import { logger } from '../../logger';
import { Semaphore } from './semaphore';
import { HttpClient } from './http-client';
import { UrlExtractor } from './url-extractor';
import { ImageSaver } from './image-saver';

/**
 * 验证码请求处理类
 * 负责发送请求获取验证码图片，并下载保存到本地
 * 
 * 使用示例：
 * ```typescript
 * const handler = new CaptchaRequestHandler('./downloads');
 * 
 * const config: CaptchaRequestConfig = {
 *   url: 'https://example.com/captcha',
 *   method: 'GET',
 *   requestCount: 10,
 *   concurrency: 2,
 *   interval: 1000,
 *   captchaUrlExtractor: {
 *     type: 'json-path',
 *     pattern: 'data.imageUrl'
 *   }
 * };
 * 
 * // 开始处理
 * await handler.startProcessing(config);
 * 
 * // 获取状态
 * const status = handler.getStatus();
 * console.log(`已下载 ${status.downloadedImages} 张验证码图片`);
 * 
 * // 获取图片列表
 * const images = handler.getCaptchaImages();
 * ```
 */
export class CaptchaRequestHandler {
  /**
   * 处理状态，记录整体进度
   */
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

  /**
   * 已处理的验证码图片列表
   */
  private captchaImages: CaptchaImage[] = [];

  /**
   * 当前的请求配置
   */
  private config: CaptchaRequestConfig | null = null;

  /**
   * 用于中止请求的控制器
   */
  private abortController: AbortController | null = null;

  /**
   * 图片保存器
   */
  private imageSaver: ImageSaver;

  /**
   * 构造函数
   * @param downloadDirectory 验证码图片下载目录的路径
   */
  constructor(downloadDirectory: string) {
    this.imageSaver = new ImageSaver(downloadDirectory);
  }

  /**
   * 获取当前的处理状态
   * @returns 当前状态的副本
   */
  public getStatus(): ProcessingStatus {
    return { ...this.status };
  }

  /**
   * 获取已处理的验证码图片列表
   * @returns 验证码图片列表的副本
   */
  public getCaptchaImages(): CaptchaImage[] {
    return [...this.captchaImages];
  }

  /**
   * 开始处理验证码请求
   * @param config 请求配置
   */
  public async startProcessing(config: CaptchaRequestConfig): Promise<void> {
    this.initializeProcessing(config);

    try {
      await this.executeRequests();
      this.finalizeProcessing();
    } catch (error: any) {
      this.handleProcessingError(error);
    }
  }

  /**
   * 初始化处理状态
   */
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

  /**
   * 执行所有请求
   */
  private async executeRequests(): Promise<void> {
    if (!this.config || !this.abortController) return;

    const requestPromises: Promise<void>[] = [];
    const signal = this.abortController.signal;
    const semaphore = new Semaphore(this.config.concurrency);

    for (let i = 0; i < this.config.requestCount; i++) {
      const requestPromise = this.executeRequestWithDelay(i, this.config, semaphore, signal);
      requestPromises.push(requestPromise);
    }

    await Promise.all(requestPromises);
  }

  /**
   * 完成处理
   */
  private finalizeProcessing(): void {
    if (this.status.status !== 'failed') {
      this.status.status = 'completed';
    }
  }

  /**
   * 处理错误
   */
  private handleProcessingError(error: any): void {
    this.status.status = 'failed';
    this.status.error = error.message || '处理请求时发生错误';
    logger.error('验证码处理失败:', error);
  }

  /**
   * 停止处理
   */
  public stopProcessing(): void {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
    this.status.status = 'idle';
  }

  /**
   * 执行单个请求，包含延迟逻辑
   */
  private async executeRequestWithDelay(
    index: number,
    config: CaptchaRequestConfig,
    semaphore: Semaphore,
    signal: AbortSignal
  ): Promise<void> {
    await this.delay(index * config.interval, signal);
    if (signal.aborted) return;

    await semaphore.acquire();
    try {
      await this.executeRequest(index, config, signal);
    } finally {
      semaphore.release();
    }
  }

  /**
   * 等待指定时间
   */
  private async delay(ms: number, signal: AbortSignal): Promise<void> {
    if (ms <= 0) return;

    return new Promise<void>((resolve) => {
      const timeoutId = setTimeout(() => resolve(), ms);
      signal.addEventListener('abort', () => {
        clearTimeout(timeoutId);
        resolve();
      }, { once: true });
    });
  }

  /**
   * 执行单个请求并处理响应
   */
  private async executeRequest(
    index: number,
    config: CaptchaRequestConfig,
    signal: AbortSignal
  ): Promise<void> {
    if (signal.aborted) return;
    
    try {
      logger.debug(`开始执行第 ${index + 1} 个请求`);
      const response = await HttpClient.sendRequest(config, signal);
      await this.handleRequestSuccess(index, response);
    } catch (error: any) {
      this.handleRequestError(index, error);
    }
  }

  /**
   * 处理请求成功的情况
   */
  private async handleRequestSuccess(index: number, response: any): Promise<void> {
    if (!this.config) return;

    this.status.completedRequests++;
    this.status.successRequests++;
    
    const captchaUrl = UrlExtractor.extractUrl(response, this.config.captchaUrlExtractor, this.config.url);
    if (!captchaUrl) {
      logger.warn(`未能从响应中提取验证码URL，请求索引: ${index}`);
      return;
    }

    logger.debug(`成功提取验证码URL: ${captchaUrl}`);
    const captchaImage = this.createCaptchaImage(index, captchaUrl);
    
    try {
      const imageData = await HttpClient.downloadFile(captchaUrl);
      await this.imageSaver.saveImage(captchaImage, imageData);
      this.captchaImages.push(captchaImage);
      this.status.downloadedImages++;
    } catch (error) {
      logger.error(`下载验证码图片失败: ${error}`);
      throw error;
    }
  }

  /**
   * 处理请求失败的情况
   */
  private handleRequestError(index: number, error: any): void {
    this.status.completedRequests++;
    this.status.failedRequests++;
    logger.error(`请求 ${index} 失败: ${error.message || error}`);
  }

  /**
   * 创建验证码图片对象
   */
  private createCaptchaImage(index: number, url: string): CaptchaImage {
    return {
      id: `img_${Date.now()}_${index}`, // 临时ID，后续会基于像素更新
      requestIndex: index,
      url: url
    };
  }
} 