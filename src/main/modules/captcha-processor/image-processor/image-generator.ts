import * as fs from 'fs';
import * as path from 'path';
import { createCanvas } from 'canvas';
import { BackgroundImageBucket } from '../types';
import { logger } from '../../logger';

/**
 * 图片生成器
 * 负责将投票结果转换为最终的背景图片
 */
export class ImageGenerator {
  /**
   * 生成并保存最终的背景图片
   * @param bucket 已完成投票的背景图片桶
   * @param outputDirectory 输出目录
   * @throws 如果保存过程中出现错误
   */
  public static async generateAndSaveImage(
    bucket: BackgroundImageBucket,
    outputDirectory: string
  ): Promise<void> {
    try {
      // 创建Canvas并生成图片
      const canvas = createCanvas(bucket.width, bucket.height);
      const ctx = canvas.getContext('2d');
      const imageData = ctx.createImageData(bucket.width, bucket.height);

      // 填充像素数据
      for (let y = 0; y < bucket.height; y++) {
        for (let x = 0; x < bucket.width; x++) {
          const pixelState = bucket.pixelVotes[y][x];
          if (!pixelState.finalRGB) continue;
          
          const index = (y * bucket.width + x) * 4;
          imageData.data[index] = pixelState.finalRGB.r;
          imageData.data[index + 1] = pixelState.finalRGB.g;
          imageData.data[index + 2] = pixelState.finalRGB.b;
          imageData.data[index + 3] = 255; // alpha通道设为不透明
        }
      }

      ctx.putImageData(imageData, 0, 0);

      // 生成文件名
      const timestamp = Date.now();
      const filename = `background_${bucket.id.split('|').join('_')}_${timestamp}.png`;
      const filepath = path.join(outputDirectory, filename);

      // 保存图片
      const buffer = canvas.toBuffer('image/png');
      fs.writeFileSync(filepath, buffer);

      // 更新桶的信息
      bucket.finalImage = buffer;
      bucket.finalImagePath = filepath;

      logger.info(`背景图片已保存: ${filepath}`);

    } catch (error) {
      logger.error('保存背景图片失败:', error);
      throw error;
    }
  }
} 