import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import { CaptchaImageProcessor, BackgroundImageProcessor } from '../captcha-processor/image-processor';
import { CaptchaRequestConfig } from '../captcha-processor/types';
import { TaskInfo } from '../task-manager';
import { logger } from '../logger';
import { buildAxiosProxy, extractImageUrl, normalizeImageUrl } from './helpers';

interface DownloadRunnerOptions {
  task: TaskInfo;
  config: CaptchaRequestConfig;
  captchaProcessor: CaptchaImageProcessor;
  backgroundProcessor: BackgroundImageProcessor;
  onProgress: (progress: {
    downloadedImages: number;
    totalBuckets: number;
    completedBuckets: number;
    votingProgress: number;
    downloadProgress: number;
  }) => void;
}

export class DownloadRunner {
  private readonly task: TaskInfo;
  private readonly config: CaptchaRequestConfig;
  private readonly captchaProcessor: CaptchaImageProcessor;
  private readonly backgroundProcessor: BackgroundImageProcessor;
  private readonly onProgress: DownloadRunnerOptions['onProgress'];

  private downloadedCount = 0;
  private processedCount = 0;

  constructor(options: DownloadRunnerOptions) {
    this.task = options.task;
    this.config = options.config;
    this.captchaProcessor = options.captchaProcessor;
    this.backgroundProcessor = options.backgroundProcessor;
    this.onProgress = options.onProgress;
  }

  public async run(): Promise<void> {
    const totalRequests = this.config.requestCount;
    const queue = Array.from({ length: totalRequests }, (_, i) => i);
    const workerCount = Math.max(1, this.config.concurrency);

    const workers = Array.from({ length: workerCount }, () => this.workerLoop(queue));
    await Promise.all(workers);
  }

  private async workerLoop(queue: number[]): Promise<void> {
    while (queue.length > 0) {
      const index = queue.shift();
      if (index === undefined) {
        break;
      }

      await this.processSingle(index);
      this.processedCount += 1;
      await this.delay(this.config.interval);
    }
  }

  private async processSingle(index: number): Promise<void> {
    try {
      const proxy = buildAxiosProxy(this.config);
      const response = await axios.request({
        url: this.config.url,
        method: this.config.method,
        headers: this.config.headers,
        proxy
      });

      const rawImageUrl = extractImageUrl(response.data, this.config);
      const imageUrl = normalizeImageUrl(rawImageUrl, this.config);

      const imageResponse = await axios.get(imageUrl, {
        responseType: 'arraybuffer',
        proxy
      });

      const imagePath = path.join(this.task.captchaDir, `captcha_${index}.png`);
      fs.writeFileSync(imagePath, imageResponse.data);

      const captchaImage = {
        id: '',
        requestIndex: index,
        url: imageUrl,
        data: imageResponse.data,
        localPath: imagePath
      };

      const processedImage = await this.captchaProcessor.processImage(captchaImage);
      await this.backgroundProcessor.processImage(processedImage.data as Buffer);

      this.downloadedCount += 1;
      this.emitProgress();
    } catch (error: any) {
      logger.error(`下载失败 (${index}):`, error);
      this.emitProgress();
    }
  }

  private emitProgress(): void {
    const totalRequests = this.config.requestCount;
    const buckets = this.backgroundProcessor.getBuckets();
    const completedBuckets = this.backgroundProcessor.getCompletedBuckets();

    this.onProgress({
      downloadedImages: this.downloadedCount,
      totalBuckets: buckets.size,
      completedBuckets: completedBuckets.length,
      votingProgress: totalRequests > 0 ? this.processedCount / totalRequests : 0,
      downloadProgress: totalRequests > 0 ? this.downloadedCount / totalRequests : 0
    });
  }

  private async delay(ms: number): Promise<void> {
    if (ms <= 0) {
      return;
    }
    await new Promise<void>((resolve) => setTimeout(resolve, ms));
  }
}

