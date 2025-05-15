import { net } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import { CaptchaRequestConfig, CaptchaImage, ProcessingStatus } from './types';
import { logger } from '../logger';

/**
 * 验证码请求处理类
 */
export class CaptchaRequestHandler {
  private status: ProcessingStatus = {
    status: 'idle',
    totalRequests: 0,
    completedRequests: 0,
    successRequests: 0,
    failedRequests: 0,
    downloadedImages: 0,
    groupCount: 0
  };

  private captchaImages: CaptchaImage[] = [];
  private config: CaptchaRequestConfig | null = null;
  private downloadDirectory: string;
  private abortController: AbortController | null = null;

  /**
   * 构造函数
   * @param downloadDirectory 验证码图片下载目录
   */
  constructor(downloadDirectory: string) {
    this.downloadDirectory = downloadDirectory;
    // 确保下载目录存在
    if (!fs.existsSync(this.downloadDirectory)) {
      fs.mkdirSync(this.downloadDirectory, { recursive: true });
      logger.info(`创建验证码下载目录: ${this.downloadDirectory}`);
    }
  }

  /**
   * 获取当前处理状态
   */
  public getStatus(): ProcessingStatus {
    return { ...this.status };
  }

  /**
   * 获取已处理的验证码图片列表
   */
  public getCaptchaImages(): CaptchaImage[] {
    return [...this.captchaImages];
  }

  /**
   * 开始处理验证码请求
   * @param config 请求配置
   */
  public async startProcessing(config: CaptchaRequestConfig): Promise<void> {
    // 初始化状态
    this.config = config;
    this.status = {
      status: 'processing',
      totalRequests: config.requestCount,
      completedRequests: 0,
      successRequests: 0,
      failedRequests: 0,
      downloadedImages: 0,
      groupCount: 0
    };
    this.captchaImages = [];
    this.abortController = new AbortController();

    logger.info(`开始处理验证码请求，总请求数: ${config.requestCount}, 并发数: ${config.concurrency}`);

    try {
      // 创建请求队列
      const requestPromises: Promise<void>[] = [];
      const signal = this.abortController.signal;

      // 控制并发
      const semaphore = new Semaphore(config.concurrency);

      // 创建请求任务
      for (let i = 0; i < config.requestCount; i++) {
        const requestPromise = this.executeRequestWithDelay(i, config, semaphore, signal);
        requestPromises.push(requestPromise);
      }

      // 等待所有请求完成
      await Promise.all(requestPromises);

      // 如果没有被中止，则标记为完成
      if (this.status.status !== 'failed') {
        this.status.status = 'completed';
      }
    } catch (error: any) {
      this.status.status = 'failed';
      this.status.error = error.message || '处理请求时发生错误';
      console.error('验证码处理失败:', error);
    }
  }

  /**
   * 停止处理
   */
  public stopProcessing(): void {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
    this.status.status = 'idle';
  }

  /**
   * 执行单个请求，包含延迟逻辑
   */
  private async executeRequestWithDelay(
    index: number,
    config: CaptchaRequestConfig,
    semaphore: Semaphore,
    signal: AbortSignal
  ): Promise<void> {
    // 计算延迟时间
    const delay = index * config.interval;

    // 如果有延迟，则等待
    if (delay > 0) {
      await new Promise<void>((resolve) => {
        const timeoutId = setTimeout(() => {
          resolve();
        }, delay);

        // 如果请求被中止，清除定时器
        signal.addEventListener('abort', () => {
          clearTimeout(timeoutId);
          resolve();
        }, { once: true });
      });
    }

    // 如果已中止，则直接返回
    if (signal.aborted) {
      return;
    }

    // 获取信号量，控制并发
    await semaphore.acquire();

    try {
      // 执行请求
      await this.executeRequest(index, config, signal);
    } finally {
      // 释放信号量
      semaphore.release();
    }
  }

  /**
   * 执行单个请求并处理响应
   */
  private async executeRequest(
    index: number,
    config: CaptchaRequestConfig,
    signal: AbortSignal
  ): Promise<void> {
    if (signal.aborted) {
      return;
    }
    
    try {
      logger.debug(`开始执行第 ${index + 1} 个请求`);
      // 发送请求
      const response = await this.sendRequest(config, signal);
      
      // 更新状态
      this.status.completedRequests++;
      this.status.successRequests++;
      
      // 提取验证码URL
      const captchaUrl = this.extractCaptchaUrl(response, config.captchaUrlExtractor);
      
      if (captchaUrl) {
        logger.debug(`成功提取验证码URL: ${captchaUrl}`);
        // 创建验证码图片对象
        const captchaImage: CaptchaImage = {
          id: `img_${Date.now()}_${index}`, // 临时ID，后续会基于像素更新
          requestIndex: index,
          url: captchaUrl
        };
        
        // 下载验证码图片
        await this.downloadCaptchaImage(captchaImage);
        logger.info(`成功下载验证码图片: ${captchaImage.localPath}`);
        
        // 添加到图片列表
        this.captchaImages.push(captchaImage);
        this.status.downloadedImages++;
      } else {
        logger.warn(`未能从响应中提取验证码URL，请求索引: ${index}`);
      }
    } catch (error: any) {
      // 更新失败状态
      this.status.completedRequests++;
      this.status.failedRequests++;
      logger.error(`请求 ${index} 失败: ${error.message || error}`);
    }
  }

  /**
   * 发送HTTP请求
   */
  private sendRequest(config: CaptchaRequestConfig, signal: AbortSignal): Promise<any> {
    return new Promise((resolve, reject) => {
      // 如果已中止，则直接返回
      if (signal.aborted) {
        reject(new Error('请求已中止'));
        return;
      }

      // 创建请求
      const request = net.request({
        method: config.method,
        url: config.url,
        redirect: 'follow'
      });

      // 监听abort信号
      signal.addEventListener('abort', () => {
        request.abort();
        reject(new Error('请求已中止'));
      }, { once: true });

      // 设置请求头
      if (config.headers) {
        Object.entries(config.headers).forEach(([key, value]) => {
          request.setHeader(key, value);
        });
      }

      // 根据bodyType设置请求体
      if (config.bodyType === 'raw' && config.body) {
        request.write(config.body);
      } else if (config.bodyType === 'x-www-form-urlencoded' && config.body) {
        const formParams = new URLSearchParams();
        config.body.forEach((item: any) => {
          if (item.key) {
            formParams.append(item.key, item.value || '');
          }
        });
        request.setHeader('Content-Type', 'application/x-www-form-urlencoded');
        request.write(formParams.toString());
      } else if (config.bodyType === 'form-data' && config.body) {
        const boundary = `----WebKitFormBoundary${Math.random().toString(16).substr(2)}`;
        let formData = '';
        
        config.body.forEach((item: any) => {
          if (item.key) {
            formData += `--${boundary}\r\n`;
            formData += `Content-Disposition: form-data; name="${item.key}"\r\n\r\n`;
            formData += `${item.value || ''}\r\n`;
          }
        });
        
        formData += `--${boundary}--\r\n`;
        request.setHeader('Content-Type', `multipart/form-data; boundary=${boundary}`);
        request.write(formData);
      }

      // 处理响应
      request.on('response', (response) => {
        // 读取响应体
        let responseData = '';
        response.on('data', (chunk) => {
          responseData += chunk.toString();
        });
        
        response.on('end', () => {
          // 如果已中止，则不处理
          if (signal.aborted) {
            return;
          }

          // 尝试解析JSON
          try {
            const parsedData = JSON.parse(responseData);
            resolve(parsedData);
          } catch (e) {
            // 如果不是JSON，直接返回文本
            resolve(responseData);
          }
        });
      });

      request.on('error', (error) => {
        if (!signal.aborted) {
          reject(error);
        }
      });

      // 发送请求
      request.end();
    });
  }

  /**
   * 从响应中提取验证码URL
   */
  private extractCaptchaUrl(response: any, extractor: CaptchaRequestConfig['captchaUrlExtractor']): string | null {
    try {
      let captchaUrl: string | null = null;
      
      if (extractor.type === 'json-path') {
        // 从JSON路径提取URL
        captchaUrl = this.extractFromJsonPath(response, extractor.pattern);
      } else if (extractor.type === 'regex') {
        // 使用正则表达式提取URL
        if (typeof response === 'string') {
          captchaUrl = this.extractFromRegex(response, extractor.pattern, extractor.groupIndex || 0);
        } else {
          captchaUrl = this.extractFromRegex(JSON.stringify(response), extractor.pattern, extractor.groupIndex || 0);
        }
      }
      
      // 如果是相对路径，拼接基础URL
      if (captchaUrl && extractor.baseUrl && !captchaUrl.startsWith('http')) {
        captchaUrl = new URL(captchaUrl, extractor.baseUrl).toString();
      }
      
      return captchaUrl;
    } catch (error) {
      console.error('提取验证码URL失败:', error);
      return null;
    }
  }

  /**
   * 从JSON路径提取值
   */
  private extractFromJsonPath(obj: any, path: string): string | null {
    const keys = path.split('.');
    let current = obj;
    
    for (const key of keys) {
      if (current === null || current === undefined) {
        return null;
      }
      current = current[key];
    }
    
    return typeof current === 'string' ? current : null;
  }

  /**
   * 使用正则表达式提取值
   */
  private extractFromRegex(text: string, pattern: string, groupIndex: number): string | null {
    const regex = new RegExp(pattern);
    const match = text.match(regex);
    
    if (match && match[groupIndex] !== undefined) {
      return match[groupIndex];
    }
    
    return null;
  }

  /**
   * 下载验证码图片
   */
  private async downloadCaptchaImage(captchaImage: CaptchaImage): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const request = net.request(captchaImage.url);
      
      request.on('response', (response) => {
        const chunks: Buffer[] = [];
        
        response.on('data', (chunk) => {
          chunks.push(Buffer.from(chunk));
        });
        
        response.on('end', async () => {
          try {
            // 合并所有数据块
            const imageBuffer = Buffer.concat(chunks);
            
            // 生成文件名和保存路径
            const fileName = `captcha_${captchaImage.requestIndex}_${Date.now()}.png`;
            const filePath = path.join(this.downloadDirectory, fileName);
            
            // 保存图片
            fs.writeFileSync(filePath, imageBuffer);
            
            // 更新图片信息
            captchaImage.data = imageBuffer;
            captchaImage.localPath = filePath;
            
            resolve();
          } catch (error) {
            reject(error);
          }
        });
      });
      
      request.on('error', (error) => {
        reject(error);
      });
      
      request.end();
    });
  }
}

/**
 * 简单的信号量实现，用于控制并发
 */
class Semaphore {
  private permits: number;
  private waiting: Array<() => void> = [];

  constructor(permits: number) {
    this.permits = permits;
  }

  public async acquire(): Promise<void> {
    if (this.permits > 0) {
      this.permits--;
      return Promise.resolve();
    }

    return new Promise<void>((resolve) => {
      this.waiting.push(resolve);
    });
  }

  public release(): void {
    if (this.waiting.length > 0) {
      const resolve = this.waiting.shift()!;
      resolve();
    } else {
      this.permits++;
    }
  }
} 