import * as fs from 'fs';
import * as path from 'path';
import sharp from 'sharp';
import { BackgroundImageBucket, SimpleImageData } from '../types';
import { logger } from '../../logger';

/**
 * 图片生成器
 * 负责将投票结果转换为最终的背景图片
 */
export class ImageGenerator {
  /**
   * 生成最终图片
   * @param votes 像素投票结果
   * @param imageData 目标图片数据
   */
  public generateFinalImage(votes: Map<string, Map<string, number>>, imageData: SimpleImageData): void {
    // 遍历每个像素位置
    for (const [pixelIndex, colorVotes] of votes.entries()) {
      // 找出得票最多的颜色
      let maxVotes = 0;
      let finalColor = '';
      
      for (const [color, voteCount] of colorVotes.entries()) {
        if (voteCount > maxVotes) {
          maxVotes = voteCount;
          finalColor = color;
        }
      }
      
      // 如果找到了最终颜色
      if (finalColor) {
        const [r, g, b] = finalColor.split(',').map(Number);
        const i = parseInt(pixelIndex) * 4;
        imageData.data[i] = r;
        imageData.data[i + 1] = g;
        imageData.data[i + 2] = b;
        imageData.data[i + 3] = 255; // alpha通道设为不透明
      }
    }
  }

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
      // 创建图片数据
      const imageData = {
        data: new Uint8ClampedArray(bucket.width * bucket.height * 4),
        width: bucket.width,
        height: bucket.height
      };

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

      // 生成文件名
      const timestamp = Date.now();
      const filename = `background_${bucket.id.split('|').join('_')}_${timestamp}.png`;
      const filepath = path.join(outputDirectory, filename);

      // 保存图片
      await sharp(imageData.data, {
        raw: {
          width: imageData.width,
          height: imageData.height,
          channels: 4
        }
      })
      .png()
      .toFile(filepath);

      // 更新桶的信息
      bucket.finalImage = Buffer.from(imageData.data);
      bucket.finalImagePath = filepath;

      logger.info(`背景图片已保存: ${filepath}`);

    } catch (error) {
      logger.error('保存背景图片失败:', error);
      throw error;
    }
  }
} 