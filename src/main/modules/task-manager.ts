import * as path from 'path';
import * as fs from 'fs';
import { app } from 'electron';
import { v4 as uuidv4 } from 'uuid';

export interface TaskInfo {
  id: string;
  startTime: number;
  taskDir: string;
  captchaDir: string;
  backgroundDir: string;
  status: 'running' | 'completed' | 'failed';
  progress: {
    downloadedImages: number;
    totalBuckets: number;
    completedBuckets: number;
    votingProgress: number;
    downloadProgress: number;
  };
}

export class TaskManager {
  private currentTask: TaskInfo | null = null;
  private readonly baseDir: string;

  constructor() {
    this.baseDir = path.join(app.getPath('userData'), 'tasks');
    if (!fs.existsSync(this.baseDir)) {
      fs.mkdirSync(this.baseDir, { recursive: true });
    }
  }

  /**
   * 创建新任务
   */
  public createTask(): TaskInfo {
    const taskId = uuidv4();
    const taskDir = path.join(this.baseDir, taskId);
    const captchaDir = path.join(taskDir, 'captchas');
    const backgroundDir = path.join(taskDir, 'backgrounds');

    // 创建任务相关目录
    fs.mkdirSync(taskDir);
    fs.mkdirSync(captchaDir);
    fs.mkdirSync(backgroundDir);

    this.currentTask = {
      id: taskId,
      startTime: Date.now(),
      taskDir,
      captchaDir,
      backgroundDir,
      status: 'running',
      progress: {
        downloadedImages: 0,
        totalBuckets: 0,
        completedBuckets: 0,
        votingProgress: 0,
        downloadProgress: 0
      }
    };

    return this.currentTask;
  }

  /**
   * 获取当前任务信息
   */
  public getCurrentTask(): TaskInfo | null {
    return this.currentTask;
  }

  /**
   * 更新任务进度
   */
  public updateTaskProgress(progress: Partial<TaskInfo['progress']>): void {
    if (this.currentTask) {
      this.currentTask.progress = {
        ...this.currentTask.progress,
        ...progress
      };
    }
  }

  /**
   * 完成任务
   */
  public completeTask(status: 'completed' | 'failed' = 'completed'): void {
    if (this.currentTask) {
      this.currentTask.status = status;
    }
  }

  /**
   * 打开任务目录
   */
  public openTaskDirectory(type: 'task' | 'captcha' | 'background'): void {
    if (!this.currentTask) return;

    let dirPath: string;
    switch (type) {
      case 'task':
        dirPath = this.currentTask.taskDir;
        break;
      case 'captcha':
        dirPath = this.currentTask.captchaDir;
        break;
      case 'background':
        dirPath = this.currentTask.backgroundDir;
        break;
    }

    if (fs.existsSync(dirPath)) {
      require('electron').shell.openPath(dirPath);
    }
  }
} 