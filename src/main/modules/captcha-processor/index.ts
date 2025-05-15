import { ipcMain, app } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import { CaptchaRequestHandler } from './request-handler';
import { CaptchaImageProcessor } from './image-processor';
import { CaptchaRequestConfig, CaptchaImage, CaptchaGroup, ProcessingStatus } from './types';

// 导出类型定义
export * from './types';

/**
 * 验证码处理器主类
 */
export class CaptchaProcessor {
  private requestHandler: CaptchaRequestHandler;
  private imageProcessor: CaptchaImageProcessor;
  private downloadDirectory: string;
  private isProcessing: boolean = false;
  private captchaImages: CaptchaImage[] = [];
  private captchaGroups: CaptchaGroup[] = [];

  /**
   * 构造函数
   */
  constructor() {
    // 设置下载目录
    this.downloadDirectory = path.join(app.getPath('userData'), 'captcha-images');
    
    // 确保下载目录存在
    if (!fs.existsSync(this.downloadDirectory)) {
      fs.mkdirSync(this.downloadDirectory, { recursive: true });
    }
    
    // 初始化处理器
    this.requestHandler = new CaptchaRequestHandler(this.downloadDirectory);
    this.imageProcessor = new CaptchaImageProcessor();
  }

  /**
   * 设置IPC处理程序
   */
  public setupIpcHandlers(): void {
    // 开始处理验证码请求
    ipcMain.handle('start-captcha-processing', async (event, config: CaptchaRequestConfig) => {
      return this.startProcessing(config);
    });

    // 停止处理
    ipcMain.handle('stop-captcha-processing', async (event) => {
      return this.stopProcessing();
    });

    // 获取处理状态
    ipcMain.handle('get-captcha-processing-status', async (event) => {
      return this.getStatus();
    });

    // 获取验证码图片列表
    ipcMain.handle('get-captcha-images', async (event) => {
      return this.captchaImages.map(img => ({
        id: img.id,
        requestIndex: img.requestIndex,
        url: img.url,
        localPath: img.localPath,
        cornerPixels: img.cornerPixels
      }));
    });

    // 获取验证码分组列表
    ipcMain.handle('get-captcha-groups', async (event) => {
      return this.captchaGroups;
    });
  }

  /**
   * 启动验证码处理流程
   * @param config 请求配置
   */
  public async startProcessing(config: CaptchaRequestConfig): Promise<{ success: boolean, error?: string }> {
    if (this.isProcessing) {
      return { success: false, error: '已有处理任务正在进行中' };
    }

    try {
      this.isProcessing = true;
      this.captchaImages = [];
      this.captchaGroups = [];

      // 1. 批量发送请求并下载验证码图片
      await this.requestHandler.startProcessing(config);

      // 2. 获取下载的图片列表
      this.captchaImages = this.requestHandler.getCaptchaImages();

      // 3. 处理每张图片，提取四个角落的像素
      for (let i = 0; i < this.captchaImages.length; i++) {
        const processedImage = await this.imageProcessor.processImage(this.captchaImages[i]);
        this.captchaImages[i] = processedImage;
      }

      // 4. 对图片进行分组
      this.captchaGroups = this.imageProcessor.groupImages(this.captchaImages);

      // 5. 预留：这里将来会实现投票算法

      this.isProcessing = false;
      return { success: true };
    } catch (error: any) {
      this.isProcessing = false;
      return { success: false, error: error.message || '处理验证码请求失败' };
    }
  }

  /**
   * 停止处理
   */
  public stopProcessing(): { success: boolean } {
    if (!this.isProcessing) {
      return { success: true };
    }

    try {
      this.requestHandler.stopProcessing();
      this.isProcessing = false;
      return { success: true };
    } catch (error) {
      return { success: false };
    }
  }

  /**
   * 获取当前处理状态
   */
  public getStatus(): ProcessingStatus & { isProcessing: boolean, imageCount: number, groupCount: number } {
    const status = this.requestHandler.getStatus();
    return {
      ...status,
      isProcessing: this.isProcessing,
      imageCount: this.captchaImages.length,
      groupCount: this.captchaGroups.length
    };
  }

  /**
   * 清理临时文件
   */
  public cleanupTempFiles(): void {
    try {
      // 删除下载目录中的所有文件，但保留目录
      const files = fs.readdirSync(this.downloadDirectory);
      for (const file of files) {
        const filePath = path.join(this.downloadDirectory, file);
        if (fs.statSync(filePath).isFile()) {
          fs.unlinkSync(filePath);
        }
      }
    } catch (error) {
      console.error('清理临时文件失败:', error);
    }
  }
}

// 导出模块初始化函数
export function setupCaptchaProcessor(): CaptchaProcessor {
  const processor = new CaptchaProcessor();
  processor.setupIpcHandlers();
  return processor;
} 