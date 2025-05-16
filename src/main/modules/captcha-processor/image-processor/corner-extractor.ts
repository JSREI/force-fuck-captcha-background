import { CaptchaImage } from '../types';
import { logger } from '../../logger';
import { createCanvas, loadImage } from 'canvas';

// 尝试加载sharp库
let sharp: any;
try {
  sharp = require('sharp');
} catch (e) {
  logger.warn('缺少sharp库，将使用canvas进行图像处理');
  sharp = null;
}

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
  public static async extractCornerPixels(imagePath: string): Promise<CaptchaImage['cornerPixels']> {
    // 如果有sharp库，使用sharp提取像素
    if (sharp) {
      return this.extractCornerPixelsWithSharp(imagePath);
    } else {
      // 使用canvas提取像素
      return this.extractCornerPixelsWithCanvas(imagePath);
    }
  }

  /**
   * 使用sharp库提取四个角落像素
   */
  private static async extractCornerPixelsWithSharp(imagePath: string): Promise<CaptchaImage['cornerPixels']> {
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
  }

  /**
   * 使用canvas提取四个角落像素
   */
  private static async extractCornerPixelsWithCanvas(imagePath: string): Promise<CaptchaImage['cornerPixels']> {
    try {
      // 加载图片
      const image = await loadImage(imagePath);
      
      // 创建canvas并绘制图片
      const canvas = createCanvas(image.width, image.height);
      const ctx = canvas.getContext('2d');
      ctx.drawImage(image, 0, 0);
      
      // 获取四个角落的像素数据
      const topLeft = ctx.getImageData(0, 0, 1, 1).data;
      const topRight = ctx.getImageData(image.width - 1, 0, 1, 1).data;
      const bottomLeft = ctx.getImageData(0, image.height - 1, 1, 1).data;
      const bottomRight = ctx.getImageData(image.width - 1, image.height - 1, 1, 1).data;
      
      return {
        topLeft: [topLeft[0], topLeft[1], topLeft[2]],
        topRight: [topRight[0], topRight[1], topRight[2]],
        bottomLeft: [bottomLeft[0], bottomLeft[1], bottomLeft[2]],
        bottomRight: [bottomRight[0], bottomRight[1], bottomRight[2]]
      };
    } catch (error) {
      logger.error('使用canvas提取像素失败:', error);
      throw error;
    }
  }
} 