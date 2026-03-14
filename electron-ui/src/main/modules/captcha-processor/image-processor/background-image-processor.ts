import * as fs from 'fs';
import { app } from 'electron';
import * as path from 'path';
import sharp from 'sharp';
import { BackgroundProcessorState, BackgroundImageBucket } from '../types';
import { logger } from '../../logger';
import { BucketManager } from './bucket-manager';
import { ImageGenerator } from './image-generator';

export class BackgroundImageProcessor {
  private bucketManager: BucketManager;
  private imageGenerator: ImageGenerator;
  private outputDirectory: string;
  private startTime: number;
  private processedImageCount: number;
  private consecutiveNoNewBucketCount: number;
  private isCompleted: boolean;

  constructor() {
    this.bucketManager = new BucketManager();
    this.imageGenerator = new ImageGenerator();
    this.outputDirectory = path.join(app.getPath('userData'), 'background-images');
    this.startTime = Date.now();
    this.processedImageCount = 0;
    this.consecutiveNoNewBucketCount = 0;
    this.isCompleted = false;

    if (!fs.existsSync(this.outputDirectory)) {
      fs.mkdirSync(this.outputDirectory, { recursive: true });
    }
  }

  public async processImage(imageBuffer: Buffer): Promise<void> {
    try {
      const image = sharp(imageBuffer);
      const metadata = await image.metadata();
      if (!metadata.width || !metadata.height) {
        throw new Error('无法获取图片尺寸');
      }

      const { data, info } = await image.raw().toBuffer({ resolveWithObject: true });
      await this.bucketManager.processImageData({
        data: new Uint8ClampedArray(data),
        width: info.width,
        height: info.height
      });

      const completedBuckets = this.bucketManager.getCompletedBuckets();
      for (const bucket of completedBuckets) {
        if (bucket.finalImagePath) {
          continue;
        }
        const { width, height } = bucket;
        const imageData = {
          data: new Uint8ClampedArray(width * height * 4),
          width,
          height
        };
        this.imageGenerator.generateFinalImage(bucket.votes, imageData);

        const timestamp = Date.now();
        const bucketId = bucket.id.replace(/\|/g, '_');
        const filename = `background_${bucketId}_${timestamp}.png`;
        const outputPath = path.join(this.outputDirectory, filename);

        await sharp(imageData.data, {
          raw: {
            width: imageData.width,
            height: imageData.height,
            channels: 4
          }
        })
          .png()
          .toFile(outputPath);

        bucket.finalImagePath = outputPath;
        logger.info(`背景图片已保存到: ${outputPath}`);
      }
    } catch (error) {
      logger.error('处理图片失败:', error);
      throw error;
    }
  }

  public getState(): BackgroundProcessorState {
    return {
      buckets: this.bucketManager.getBuckets(),
      consecutiveNoNewBucketCount: this.consecutiveNoNewBucketCount,
      isCompleted: this.isCompleted,
      startTime: this.startTime,
      processedImageCount: this.processedImageCount
    };
  }

  public getCompletedBackgrounds(): { id: string; imagePath: string }[] {
    return this.bucketManager.getCompletedBuckets()
      .map((bucket) => ({
        id: bucket.id,
        imagePath: bucket.finalImagePath || ''
      }))
      .filter((bg) => bg.imagePath !== '');
  }

  public getOutputDirectory(): string {
    return this.outputDirectory;
  }

  public getBuckets(): Map<string, BackgroundImageBucket> {
    return this.bucketManager.getBuckets();
  }

  public getCompletedBuckets(): BackgroundImageBucket[] {
    return this.bucketManager.getCompletedBuckets();
  }
}

