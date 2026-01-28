/**
 * 预加载脚本 - 在渲染进程中提供必要的API
 * 由于现在使用了nodeIntegration: true，contextIsolation: false，
 * 不需要通过contextBridge暴露API
 */
import { ipcRenderer } from 'electron';

// 日志输出
console.log('preload脚本已加载');

// 暴露一些全局变量和API
(window as any).electronAPI = {
  // 系统信息
  versions: {
    node: process.versions.node,
    electron: process.versions.electron
  },
  platform: process.platform,
  
  // HTTP请求API
  sendHttpRequest: async (requestConfig: any) => {
    return await ipcRenderer.invoke('send-http-request', requestConfig);
  },
  
  // 打开外部链接API
  openExternalLink: (url: string) => {
    ipcRenderer.invoke('open-external-link', url);
  },
  
  // 应用状态管理API
  saveAppState: async (state: any) => {
    return await ipcRenderer.invoke('save-app-state', state);
  },
  
  loadAppState: async () => {
    return await ipcRenderer.invoke('load-app-state');
  },
  
  clearAppState: async () => {
    return await ipcRenderer.invoke('clear-app-state');
  },

  // 设置管理API
  ipcRenderer: {
    invoke: (channel: string, ...args: any[]) => {
      return ipcRenderer.invoke(channel, ...args);
    }
  }
};

// 在DOM加载完成后执行
window.addEventListener('DOMContentLoaded', () => {
  console.log('DOM内容已加载，preload脚本执行完成');
  console.log('已注册electronAPI.sendHttpRequest方法');
  console.log('已注册electronAPI.openExternalLink方法');
  console.log('已注册electronAPI.saveAppState方法');
  console.log('已注册electronAPI.loadAppState方法');
  console.log('已注册electronAPI.clearAppState方法');
  console.log('已注册electronAPI.ipcRenderer方法');
  
  // 给窗口添加一个可见标记，表明preload脚本已执行
  document.body.classList.add('electron-ready');
}); 