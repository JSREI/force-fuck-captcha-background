import * as fs from 'fs';
import { app } from 'electron';
import * as path from 'path';
import { createCanvas, loadImage } from 'canvas';
import { CaptchaImage, BackgroundProcessorState } from '../types';
import { logger } from '../../logger';
import { CornerExtractor } from './corner-extractor';
import { BucketManager } from './bucket-manager';
import { ImageGenerator } from './image-generator';

/**
 * 验证码图像处理类
 */
export class CaptchaImageProcessor {
  /**
   * 处理图像，提取四个角落的像素点
   */
  public async processImage(captchaImage: CaptchaImage): Promise<CaptchaImage> {
    try {
      if (!captchaImage.localPath || !fs.existsSync(captchaImage.localPath)) {
        throw new Error(`图像文件不存在: ${captchaImage.localPath}`);
      }

      // 提取四个角落的像素
      const cornerPixels = await CornerExtractor.extractCornerPixels(captchaImage.localPath);
      captchaImage.cornerPixels = cornerPixels;

      // 基于四个角落像素创建唯一ID
      captchaImage.id = this.generatePixelBasedId(cornerPixels);

      return captchaImage;
    } catch (error) {
      logger.error('处理图像失败:', error);
      return captchaImage;
    }
  }

  /**
   * 基于四个角落像素生成唯一ID
   */
  private generatePixelBasedId(cornerPixels: CaptchaImage['cornerPixels']): string {
    if (!cornerPixels) {
      return `unknown_${Date.now()}`;
    }

    // 将四个角落的像素值连接起来形成ID
    const pixelValues = [
      ...cornerPixels.topLeft,
      ...cornerPixels.topRight,
      ...cornerPixels.bottomLeft,
      ...cornerPixels.bottomRight
    ];

    // 创建一个简单的哈希
    return pixelValues.join('_');
  }
}

/**
 * 背景图片处理器
 */
export class BackgroundImageProcessor {
  private state: BackgroundProcessorState;
  private readonly outputDirectory: string;

  constructor() {
    // 初始化处理器状态
    this.state = {
      buckets: new Map(),
      consecutiveNoNewBucketCount: 0,
      isCompleted: false,
      startTime: Date.now(),
      processedImageCount: 0
    };

    // 设置输出目录（在用户数据目录下的background-images文件夹）
    this.outputDirectory = path.join(app.getPath('userData'), 'background-images');
    // 确保输出目录存在
    if (!fs.existsSync(this.outputDirectory)) {
      fs.mkdirSync(this.outputDirectory, { recursive: true });
      logger.info(`创建背景图片输出目录: ${this.outputDirectory}`);
    }
  }

  /**
   * 处理一张新的背景图片
   */
  public async processImage(imageBuffer: Buffer): Promise<void> {
    try {
      // 加载图片到Canvas中以便处理像素数据
      const image = await loadImage(imageBuffer);
      const canvas = createCanvas(image.width, image.height);
      const ctx = canvas.getContext('2d');
      ctx.drawImage(image, 0, 0);
      const imageData = ctx.getImageData(0, 0, image.width, image.height);

      // 生成桶ID（基于四个角落的像素值）
      const bucketId = BucketManager.generateBucketId(imageData);
      
      // 获取或创建桶
      let bucket = this.state.buckets.get(bucketId);
      if (!bucket) {
        logger.info(`发现新的背景图片桶: ${bucketId}`);
        this.state.consecutiveNoNewBucketCount = 0;
        bucket = BucketManager.createBucket(bucketId, image.width, image.height);
        this.state.buckets.set(bucketId, bucket);
      } else {
        this.state.consecutiveNoNewBucketCount++;
      }

      // 处理图片像素（进行投票）
      BucketManager.processPixels(bucket, imageData);
      bucket.imageCount++;
      this.state.processedImageCount++;

      // 检查桶是否完成投票
      if (!bucket.isCompleted && BucketManager.checkBucketCompletion(bucket)) {
        bucket.isCompleted = true;
        await ImageGenerator.generateAndSaveImage(bucket, this.outputDirectory);
        logger.info(`背景图片桶 ${bucketId} 完成处理，共处理 ${bucket.imageCount} 张图片`);
      }

      // 检查整体处理是否完成
      if (BucketManager.checkOverallCompletion(this.state)) {
        this.state.isCompleted = true;
      }

    } catch (error) {
      logger.error('处理背景图片失败:', error);
      throw error;
    }
  }

  /**
   * 获取处理状态
   */
  public getState(): BackgroundProcessorState {
    return this.state;
  }

  /**
   * 获取已完成的背景图片信息
   */
  public getCompletedBackgrounds(): { bucketId: string, imageBuffer: Buffer, imagePath: string }[] {
    const results: { bucketId: string, imageBuffer: Buffer, imagePath: string }[] = [];
    for (const [bucketId, bucket] of this.state.buckets) {
      if (bucket.isCompleted && bucket.finalImage && bucket.finalImagePath) {
        results.push({
          bucketId,
          imageBuffer: bucket.finalImage,
          imagePath: bucket.finalImagePath
        });
      }
    }
    return results;
  }

  /**
   * 获取输出目录路径
   */
  public getOutputDirectory(): string {
    return this.outputDirectory;
  }
}

// 导出默认的背景图片处理器实例
export const backgroundProcessor = new BackgroundImageProcessor(); 