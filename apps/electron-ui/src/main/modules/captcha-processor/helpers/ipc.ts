import { ipcMain } from 'electron';
import { CaptchaRequestConfig } from '../types';

interface CaptchaProcessorLike {
  startProcessing: (config: CaptchaRequestConfig) => Promise<{ success: boolean; error?: string }>;
  stopProcessing: () => { success: boolean };
  getStatus: () => any;
  getCaptchaImages: () => any;
  getBackgroundBuckets: () => any;
}

export function registerCaptchaProcessorIpc(processor: CaptchaProcessorLike): void {
  ipcMain.handle('start-captcha-processing', async (_event, config: CaptchaRequestConfig) => {
    return processor.startProcessing(config);
  });

  ipcMain.handle('stop-captcha-processing', async () => {
    return processor.stopProcessing();
  });

  ipcMain.handle('get-captcha-processing-status', async () => {
    return processor.getStatus();
  });

  ipcMain.handle('get-captcha-images', async () => {
    return processor.getCaptchaImages();
  });

  ipcMain.handle('get-background-buckets', async () => {
    return processor.getBackgroundBuckets();
  });
}
