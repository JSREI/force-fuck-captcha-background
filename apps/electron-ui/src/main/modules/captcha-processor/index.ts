import { app } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import { CaptchaRequestHandler } from './request-handler';
import { BackgroundImageProcessor } from './image-processor';
import { CaptchaRequestConfig, CaptchaImage, ProcessingStatus, BackgroundImageBucket } from './types';
import { registerCaptchaProcessorIpc } from './helpers/ipc';
import { buildBucketsFromCaptchaImages } from './helpers/background-bucket-builder';
import { cleanupDirectoryFiles } from './helpers/cleanup';

export * from './types';
export * from './request-handler';
export * from './image-processor';

export const backgroundProcessor = new BackgroundImageProcessor();

export class CaptchaProcessor {
  private requestHandler: CaptchaRequestHandler;
  private downloadDirectory: string;
  private isProcessing = false;
  private captchaImages: CaptchaImage[] = [];
  private imageBuckets: Map<string, BackgroundImageBucket> = new Map();

  constructor() {
    this.downloadDirectory = path.join(app.getPath('userData'), 'captcha-images');
    if (!fs.existsSync(this.downloadDirectory)) {
      fs.mkdirSync(this.downloadDirectory, { recursive: true });
    }
    this.requestHandler = new CaptchaRequestHandler(this.downloadDirectory);
  }

  public setupIpcHandlers(): void {
    registerCaptchaProcessorIpc(this);
  }

  public async startProcessing(config: CaptchaRequestConfig): Promise<{ success: boolean; error?: string }> {
    if (this.isProcessing) {
      return { success: false, error: '已有处理任务正在进行中' };
    }

    try {
      this.isProcessing = true;
      this.captchaImages = [];
      this.imageBuckets.clear();

      await this.requestHandler.startProcessing(config);
      this.captchaImages = this.requestHandler.getCaptchaImages();
      this.imageBuckets = await buildBucketsFromCaptchaImages(this.captchaImages, backgroundProcessor);

      this.isProcessing = false;
      return { success: true };
    } catch (error: any) {
      this.isProcessing = false;
      return { success: false, error: error.message || '处理验证码请求失败' };
    }
  }

  public stopProcessing(): { success: boolean } {
    if (!this.isProcessing) {
      return { success: true };
    }
    try {
      this.requestHandler.stopProcessing();
      this.isProcessing = false;
      return { success: true };
    } catch {
      return { success: false };
    }
  }

  public getStatus(): ProcessingStatus & { isProcessing: boolean; imageCount: number; bucketCount: number } {
    const status = this.requestHandler.getStatus();
    return {
      ...status,
      isProcessing: this.isProcessing,
      imageCount: this.captchaImages.length,
      bucketCount: this.imageBuckets.size
    };
  }

  public getCaptchaImages() {
    return this.captchaImages.map((img) => ({
      id: img.id,
      requestIndex: img.requestIndex,
      url: img.url,
      localPath: img.localPath,
      cornerPixels: img.cornerPixels
    }));
  }

  public getBackgroundBuckets() {
    return Array.from(this.imageBuckets.values()).map((bucket) => ({
      id: bucket.id,
      imageCount: bucket.imageCount,
      isCompleted: bucket.isCompleted,
      finalImagePath: bucket.finalImagePath
    }));
  }

  public cleanupTempFiles(): void {
    cleanupDirectoryFiles(this.downloadDirectory);
  }
}

export function setupCaptchaProcessor(): CaptchaProcessor {
  const processor = new CaptchaProcessor();
  processor.setupIpcHandlers();
  return processor;
}

