import { BrowserWindow } from 'electron';
import { TaskManager } from './task-manager';
import { CaptchaRequestConfig } from './captcha-processor/types';
import { CaptchaImageProcessor, BackgroundImageProcessor } from './captcha-processor/image-processor/index';
import { logger } from './logger';
import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';

export class DownloadManager {
  private taskManager: TaskManager;
  private mainWindow: BrowserWindow;
  private captchaProcessor: CaptchaImageProcessor;
  private backgroundProcessor: BackgroundImageProcessor;

  constructor(mainWindow: BrowserWindow) {
    this.taskManager = new TaskManager();
    this.mainWindow = mainWindow;
    this.captchaProcessor = new CaptchaImageProcessor();
    this.backgroundProcessor = new BackgroundImageProcessor();
  }

  /**
   * 开始下载任务
   */
  public async startDownload(config: CaptchaRequestConfig): Promise<void> {
    const task = this.taskManager.createTask();
    
    try {
      let downloadedCount = 0;
      const totalRequests = config.requestCount;

      // 创建下载队列
      const queue = Array.from({ length: totalRequests }, (_, i) => i);
      const workers = Array.from({ length: config.concurrency }, () => null);

      // 更新进度的函数
      const updateProgress = () => {
        const buckets = this.backgroundProcessor.getBuckets();
        const completedBuckets = this.backgroundProcessor.getCompletedBuckets();
        
        const progress = {
          downloadedImages: downloadedCount,
          totalBuckets: buckets.size,
          completedBuckets: completedBuckets.length,
          votingProgress: downloadedCount / totalRequests,
          downloadProgress: downloadedCount / totalRequests
        };
        
        this.taskManager.updateTaskProgress(progress);
        this.mainWindow.webContents.send('download-progress-update', progress);
      };

      // 处理单个下载任务
      const processDownload = async () => {
        if (queue.length === 0) return;
        
        const index = queue.shift()!;
        try {
          // 发送请求获取验证码
          const response = await axios.request({
            url: config.url,
            method: config.method,
            headers: config.headers,
            proxy: config.proxy?.proxyUrl ? {
              host: new URL(config.proxy.proxyUrl).hostname,
              port: parseInt(new URL(config.proxy.proxyUrl).port),
              protocol: new URL(config.proxy.proxyUrl).protocol.slice(0, -1)
            } : undefined
          });

          // 提取验证码图片URL
          let imageUrl = '';
          if (config.captchaUrlExtractor.type === 'json-path') {
            const paths = config.captchaUrlExtractor.pattern.split('.');
            let value = response.data;
            for (const path of paths) {
              value = value[path];
            }
            imageUrl = value;
          } else if (config.captchaUrlExtractor.type === 'regex') {
            const match = response.data.match(new RegExp(config.captchaUrlExtractor.pattern));
            if (match && match[config.captchaUrlExtractor.groupIndex || 1]) {
              imageUrl = match[config.captchaUrlExtractor.groupIndex || 1];
            }
          }

          if (!imageUrl) {
            throw new Error('无法提取验证码图片URL');
          }

          // 如果是相对路径，转换为完整URL
          if (!imageUrl.startsWith('http')) {
            const baseUrl = config.captchaUrlExtractor.baseUrl || config.url;
            imageUrl = new URL(imageUrl, baseUrl).toString();
          }

          // 下载验证码图片
          const imageResponse = await axios.get(imageUrl, {
            responseType: 'arraybuffer',
            proxy: config.proxy?.proxyUrl ? {
              host: new URL(config.proxy.proxyUrl).hostname,
              port: parseInt(new URL(config.proxy.proxyUrl).port),
              protocol: new URL(config.proxy.proxyUrl).protocol.slice(0, -1)
            } : undefined
          });

          // 保存验证码图片
          const imagePath = path.join(task.captchaDir, `captcha_${index}.png`);
          fs.writeFileSync(imagePath, imageResponse.data);

          // 处理验证码图片
          const captchaImage = {
            id: '',
            requestIndex: index,
            url: imageUrl,
            data: imageResponse.data,
            localPath: imagePath
          };

          const processedImage = await this.captchaProcessor.processImage(captchaImage);
          await this.backgroundProcessor.processImage(processedImage.data as Buffer);

          downloadedCount++;
          updateProgress();
          
          // 间隔指定时间后继续下一个任务
          setTimeout(processDownload, config.interval);
        } catch (error: any) {
          logger.error(`下载失败 (${index}):`, error);
          setTimeout(processDownload, config.interval);
        }
      };

      // 启动指定数量的工作线程
      workers.forEach(() => processDownload());

      // 等待所有下载完成
      await new Promise<void>((resolve) => {
        const checkComplete = setInterval(() => {
          if (downloadedCount === totalRequests) {
            clearInterval(checkComplete);
            resolve();
          }
        }, 1000);
      });

      this.taskManager.completeTask('completed');
      
      // 自动打开背景图片文件夹
      this.openDirectory('background');
      
      // 发送完成事件
      this.mainWindow.webContents.send('download-completed', {
        taskId: task.id,
        backgroundDir: task.backgroundDir,
        captchaDir: task.captchaDir
      });

    } catch (error: any) {
      logger.error('下载任务失败:', error);
      this.taskManager.completeTask('failed');
      this.mainWindow.webContents.send('download-failed', {
        taskId: task.id,
        error: error.message
      });
    }
  }

  /**
   * 打开指定类型的目录
   */
  public openDirectory(type: 'task' | 'captcha' | 'background'): void {
    this.taskManager.openTaskDirectory(type);
  }
} 