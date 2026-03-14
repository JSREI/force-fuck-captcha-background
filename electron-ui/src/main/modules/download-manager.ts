import { BrowserWindow } from 'electron';
import { TaskManager } from './task-manager';
import { CaptchaRequestConfig } from './captcha-processor/types';
import { CaptchaImageProcessor, BackgroundImageProcessor } from './captcha-processor/image-processor';
import { logger } from './logger';
import { DownloadRunner } from './download/runner';

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

  public async startDownload(config: CaptchaRequestConfig): Promise<void> {
    const task = this.taskManager.createTask();

    try {
      const runner = new DownloadRunner({
        task,
        config,
        captchaProcessor: this.captchaProcessor,
        backgroundProcessor: this.backgroundProcessor,
        onProgress: (progress) => {
          this.taskManager.updateTaskProgress(progress);
          this.mainWindow.webContents.send('download-progress-update', progress);
        }
      });

      await runner.run();
      this.taskManager.completeTask('completed');
      this.openDirectory('background');
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

  public openDirectory(type: 'task' | 'captcha' | 'background'): void {
    this.taskManager.openTaskDirectory(type);
  }
}

