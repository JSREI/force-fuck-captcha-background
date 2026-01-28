import * as fs from 'fs';
import { app } from 'electron';
import * as path from 'path';
import sharp from 'sharp';
import { CaptchaImage, BackgroundProcessorState, BackgroundImageBucket } from '../types';
import { logger } from '../../logger';
import { CornerExtractor } from './corner-extractor';
import { BucketManager } from './bucket-manager';
import { ImageGenerator } from './image-generator';

/**
 * 验证码图像处理类
 */
class CaptchaImageProcessor {
  private cornerExtractor: CornerExtractor;

  constructor() {
    this.cornerExtractor = new CornerExtractor();
  }

  /**
   * 处理图像，提取四个角落的像素点
   */
  public async processImage(captchaImage: CaptchaImage): Promise<CaptchaImage> {
    try {
      if (!captchaImage.localPath || !fs.existsSync(captchaImage.localPath)) {
        throw new Error(`图像文件不存在: ${captchaImage.localPath}`);
      }

      // 提取四个角落的像素
      const cornerPixels = await this.cornerExtractor.extractCornerPixels(captchaImage.localPath);
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

  /**
   * 从图片中提取四个角落的像素值
   * @param imageBuffer 图片数据
   * @returns 四个角落的像素值
   */
  public async extractCornerPixels(imageBuffer: Buffer): Promise<number[][]> {
    try {
      const image = sharp(imageBuffer);
      const metadata = await image.metadata();
      
      if (!metadata.width || !metadata.height) {
        throw new Error('无法获取图片尺寸');
      }
      
      const width = metadata.width;
      const height = metadata.height;
      
      const coordinates = [
        { x: 0, y: 0 },                // 左上角
        { x: width - 1, y: 0 },        // 右上角
        { x: 0, y: height - 1 },       // 左下角
        { x: width - 1, y: height - 1} // 右下角
      ];
      
      const pixels: number[][] = [];
      
      for (const coord of coordinates) {
        const extracted = await image
          .extract({ left: coord.x, top: coord.y, width: 1, height: 1 })
          .raw()
          .toBuffer();
        
        pixels.push([extracted[0], extracted[1], extracted[2]]);
      }
      
      return pixels;
    } catch (error) {
      logger.error('提取图片角落像素失败:', error);
      throw error;
    }
  }
}

/**
 * 背景图片处理器
 */
class BackgroundImageProcessor {
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
    
    // 确保输出目录存在
    if (!fs.existsSync(this.outputDirectory)) {
      fs.mkdirSync(this.outputDirectory, { recursive: true });
    }
  }

  /**
   * 处理新的图片
   * @param imageBuffer 图片数据
   */
  public async processImage(imageBuffer: Buffer): Promise<void> {
    try {
      const image = sharp(imageBuffer);
      const metadata = await image.metadata();
      
      if (!metadata.width || !metadata.height) {
        throw new Error('无法获取图片尺寸');
      }
      
      const { data, info } = await image
        .raw()
        .toBuffer({ resolveWithObject: true });
        
      // 处理图片数据
      await this.bucketManager.processImageData({
        data: new Uint8ClampedArray(data),
        width: info.width,
        height: info.height
      });
      
      // 检查是否有完成的桶，生成最终图片
      const completedBuckets = this.bucketManager.getCompletedBuckets();
      for (const bucket of completedBuckets) {
        if (!bucket.finalImagePath) {
          const { width, height } = bucket;
          const imageData = {
            data: new Uint8ClampedArray(width * height * 4),
            width,
            height
          };
          
          this.imageGenerator.generateFinalImage(bucket.votes, imageData);
          
          // 保存图片
          const timestamp = Date.now();
          const bucketId = bucket.id.replace(/\|/g, '_');
          const filename = `background_${bucketId}_${timestamp}.png`;
          const outputPath = path.join(this.outputDirectory, filename);
          
          // 将图片数据保存为文件
          await sharp(imageData.data, {
            raw: {
              width: imageData.width,
              height: imageData.height,
              channels: 4
            }
          })
          .png()
          .toFile(outputPath);
          
          // 更新桶的最终图片路径
          bucket.finalImagePath = outputPath;
          logger.info(`背景图片已保存到: ${outputPath}`);
        }
      }
    } catch (error) {
      logger.error('处理图片失败:', error);
      throw error;
    }
  }

  /**
   * 获取当前状态
   */
  public getState(): BackgroundProcessorState {
    return {
      buckets: this.bucketManager.getBuckets(),
      consecutiveNoNewBucketCount: this.consecutiveNoNewBucketCount,
      isCompleted: this.isCompleted,
      startTime: this.startTime,
      processedImageCount: this.processedImageCount
    };
  }

  /**
   * 获取已完成的背景图片列表
   */
  public getCompletedBackgrounds(): { id: string; imagePath: string }[] {
    return this.bucketManager.getCompletedBuckets()
      .map(bucket => ({
        id: bucket.id,
        imagePath: bucket.finalImagePath || ''
      }))
      .filter(bg => bg.imagePath !== '');
  }

  /**
   * 获取输出目录路径
   */
  public getOutputDirectory(): string {
    return this.outputDirectory;
  }

  /**
   * 获取所有桶
   */
  public getBuckets(): Map<string, BackgroundImageBucket> {
    return this.bucketManager.getBuckets();
  }

  /**
   * 获取已完成的桶
   */
  public getCompletedBuckets(): BackgroundImageBucket[] {
    return this.bucketManager.getCompletedBuckets();
  }
}

// 导出类
export { CaptchaImageProcessor, BackgroundImageProcessor }; 