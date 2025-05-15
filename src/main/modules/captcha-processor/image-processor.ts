import * as fs from 'fs';
import * as path from 'path';
import { CaptchaImage, CaptchaGroup } from './types';

// 尝试加载sharp库
let sharp: any;
try {
  sharp = require('sharp');
} catch (e) {
  console.warn('缺少sharp库，将使用备用方法进行图像处理。如需完整功能，请安装sharp库。');
  sharp = null;
}

/**
 * 验证码图像处理类
 */
export class CaptchaImageProcessor {
  /**
   * 处理图像，提取四个角落的像素点
   * @param captchaImage 验证码图像对象
   */
  public async processImage(captchaImage: CaptchaImage): Promise<CaptchaImage> {
    try {
      if (!captchaImage.localPath || !fs.existsSync(captchaImage.localPath)) {
        throw new Error(`图像文件不存在: ${captchaImage.localPath}`);
      }

      // 提取四个角落的像素
      const cornerPixels = await this.extractCornerPixels(captchaImage.localPath);
      captchaImage.cornerPixels = cornerPixels;

      // 基于四个角落像素创建唯一ID
      captchaImage.id = this.generatePixelBasedId(cornerPixels);

      return captchaImage;
    } catch (error) {
      console.error('处理图像失败:', error);
      return captchaImage;
    }
  }

  /**
   * 根据四个角落像素对图像进行分组
   * @param images 处理过的验证码图像列表
   */
  public groupImages(images: CaptchaImage[]): CaptchaGroup[] {
    const groups: Record<string, CaptchaGroup> = {};

    // 遍历所有图像进行分组
    for (const image of images) {
      // 跳过没有提取到角落像素的图像
      if (!image.cornerPixels) {
        continue;
      }

      // 获取图像ID
      const imageId = image.id;

      // 如果是新的分组，创建分组
      if (!groups[imageId]) {
        groups[imageId] = {
          id: imageId,
          imageIds: [],
          count: 0,
          // 预留投票和众数像素字段
          pixelVotes: {
            topLeft: {},
            topRight: {},
            bottomLeft: {},
            bottomRight: {}
          }
        };
      }

      // 将图像添加到分组
      groups[imageId].imageIds.push(image.id);
      groups[imageId].count++;

      // 预留：这里将来会实现像素投票逻辑
    }

    // 将分组转换为数组并排序
    return Object.values(groups).sort((a, b) => b.count - a.count);
  }

  /**
   * 提取图像四个角落的像素
   */
  private async extractCornerPixels(imagePath: string): Promise<CaptchaImage['cornerPixels']> {
    // 如果有sharp库，使用sharp提取像素
    if (sharp) {
      return this.extractCornerPixelsWithSharp(imagePath);
    } else {
      // 备用方法：使用canvas或其他方法
      // 这里预留，实际实现会根据项目需求和依赖来定
      return this.extractCornerPixelsFallback(imagePath);
    }
  }

  /**
   * 使用sharp库提取四个角落像素
   */
  private async extractCornerPixelsWithSharp(imagePath: string): Promise<CaptchaImage['cornerPixels']> {
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
   * 备用方法：不使用sharp的像素提取（预留）
   */
  private extractCornerPixelsFallback(imagePath: string): CaptchaImage['cornerPixels'] {
    // 由于这里需要实际读取图像像素，但没有sharp库时比较复杂
    // 这里暂时返回一个模拟的结果，实际项目中需要使用canvas或其他库来实现
    console.warn('使用备用方法提取像素，结果可能不准确');
    
    // 生成随机像素作为模拟数据
    return {
      topLeft: [255, 255, 255],
      topRight: [255, 255, 255],
      bottomLeft: [255, 255, 255],
      bottomRight: [255, 255, 255]
    };
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
   * 预留：实现投票算法计算每个像素位置的众数
   * 这个方法将在未来实现
   */
  public calculateConsensusPixels(group: CaptchaGroup, images: CaptchaImage[]): void {
    // 预留给投票算法，将在未来实现
    console.log('投票算法预留，将在未来实现');
  }
} 