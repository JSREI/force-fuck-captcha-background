import * as fs from 'fs';
import sharp from 'sharp';
import { CaptchaImage } from '../types';
import { logger } from '../../logger';
import { CornerExtractor } from './corner-extractor';

export class CaptchaImageProcessor {
  private cornerExtractor: CornerExtractor;

  constructor() {
    this.cornerExtractor = new CornerExtractor();
  }

  public async processImage(captchaImage: CaptchaImage): Promise<CaptchaImage> {
    try {
      if (!captchaImage.localPath || !fs.existsSync(captchaImage.localPath)) {
        throw new Error(`图像文件不存在: ${captchaImage.localPath}`);
      }

      const cornerPixels = await this.cornerExtractor.extractCornerPixels(captchaImage.localPath);
      captchaImage.cornerPixels = cornerPixels;
      captchaImage.id = this.generatePixelBasedId(cornerPixels);
      return captchaImage;
    } catch (error) {
      logger.error('处理图像失败:', error);
      return captchaImage;
    }
  }

  private generatePixelBasedId(cornerPixels: CaptchaImage['cornerPixels']): string {
    if (!cornerPixels) {
      return `unknown_${Date.now()}`;
    }
    const pixelValues = [
      ...cornerPixels.topLeft,
      ...cornerPixels.topRight,
      ...cornerPixels.bottomLeft,
      ...cornerPixels.bottomRight
    ];
    return pixelValues.join('_');
  }

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
        { x: 0, y: 0 },
        { x: width - 1, y: 0 },
        { x: 0, y: height - 1 },
        { x: width - 1, y: height - 1 }
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

