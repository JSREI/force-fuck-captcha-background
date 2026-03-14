import { CaptchaImage } from '../types';
import { logger } from '../../logger';
import sharp from 'sharp';

/**
 * 角落像素提取器
 * 负责从图片中提取四个角落的像素值
 */
export class CornerExtractor {
  /**
   * 提取图像四个角落的像素
   * @param imagePath 图片路径
   * @returns 四个角落的RGB值
   */
  public async extractCornerPixels(imagePath: string): Promise<CaptchaImage['cornerPixels']> {
    try {
      // 读取图像
      const image = sharp(imagePath);
      const metadata = await image.metadata();
      
      const width = metadata.width || 0;
      const height = metadata.height || 0;
      
      if (width === 0 || height === 0) {
        throw new Error('无法获取图像尺寸');
      }
      
      // 定义四个角落的坐标
      const coordinates = [
        { x: 0, y: 0 },                // 左上角
        { x: width - 1, y: 0 },        // 右上角
        { x: 0, y: height - 1 },       // 左下角
        { x: width - 1, y: height - 1} // 右下角
      ];
      
      // 提取每个坐标的像素
      const pixels: number[][] = [];
      
      for (const coord of coordinates) {
        // 提取该坐标的1x1区域
        const extracted = await image
          .extract({ left: coord.x, top: coord.y, width: 1, height: 1 })
          .raw()
          .toBuffer();
        
        // 提取RGB值
        pixels.push([extracted[0], extracted[1], extracted[2]]);
      }
      
      // 返回四个角落的像素
      return {
        topLeft: pixels[0],
        topRight: pixels[1],
        bottomLeft: pixels[2],
        bottomRight: pixels[3]
      };
    } catch (error) {
      logger.error('提取图片角落像素失败:', error);
      throw error;
    }
  }
} 