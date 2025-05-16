import * as fs from 'fs';
import * as path from 'path';
import { CaptchaImage } from '../types';
import { logger } from '../../logger';

/**
 * 图片保存工具类
 * 负责将验证码图片保存到本地文件系统
 */
export class ImageSaver {
  /**
   * 验证码图片的下载目录
   */
  private downloadDirectory: string;

  /**
   * 构造函数
   * @param downloadDirectory 验证码图片下载目录的路径
   */
  constructor(downloadDirectory: string) {
    this.downloadDirectory = downloadDirectory;
    this.ensureDownloadDirectory();
  }

  /**
   * 确保下载目录存在
   */
  private ensureDownloadDirectory(): void {
    if (!fs.existsSync(this.downloadDirectory)) {
      fs.mkdirSync(this.downloadDirectory, { recursive: true });
      logger.info(`创建验证码下载目录: ${this.downloadDirectory}`);
    }
  }

  /**
   * 保存图片到文件
   * @param captchaImage 验证码图片对象
   * @param imageData 图片数据
   */
  public async saveImage(captchaImage: CaptchaImage, imageData: Buffer): Promise<void> {
    const fileName = this.generateFileName(captchaImage);
    const filePath = path.join(this.downloadDirectory, fileName);
    
    try {
      fs.writeFileSync(filePath, imageData);
      captchaImage.data = imageData;
      captchaImage.localPath = filePath;
      logger.info(`成功保存验证码图片: ${filePath}`);
    } catch (error) {
      logger.error(`保存验证码图片失败: ${error}`);
      throw error;
    }
  }

  /**
   * 生成图片文件名
   * @param captchaImage 验证码图片对象
   * @returns 生成的文件名
   */
  private generateFileName(captchaImage: CaptchaImage): string {
    return `captcha_${captchaImage.requestIndex}_${Date.now()}.png`;
  }
} 