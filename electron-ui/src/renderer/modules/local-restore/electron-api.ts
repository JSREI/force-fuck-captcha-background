import { message } from 'antd';
import type { LocalRestoreStatus } from '../../../shared/local-restore-types';

type AnyFn = (...args: any[]) => any;

function getApi(): any {
  return (window as any).electronAPI;
}

function ensureMethod(path: string, fn: AnyFn | undefined): fn is AnyFn {
  if (!fn) {
    message.error(`Electron API 未初始化: ${path}`);
    return false;
  }
  return true;
}

export async function chooseDirectory(): Promise<string | null> {
  const api = getApi();
  if (!ensureMethod('ipcRenderer.invoke', api?.ipcRenderer?.invoke)) {
    return null;
  }
  const selected = await api.ipcRenderer.invoke('select-directory');
  return selected || null;
}

export async function startLocalRestore(inputDir: string, outputDir: string, clearOutputBeforeRun: boolean): Promise<any> {
  const api = getApi();
  if (!ensureMethod('startLocalRestore', api?.startLocalRestore)) {
    return { accepted: false, reason: 'electron_api_missing' };
  }
  return api.startLocalRestore({ inputDir, outputDir, clearOutputBeforeRun });
}

export async function stopLocalRestore(): Promise<any> {
  const api = getApi();
  if (!ensureMethod('stopLocalRestore', api?.stopLocalRestore)) {
    return { success: false };
  }
  return api.stopLocalRestore();
}

export async function openPath(targetPath: string): Promise<any> {
  const api = getApi();
  if (!ensureMethod('openPath', api?.openPath)) {
    return { success: false, error: 'electron_api_missing' };
  }
  return api.openPath(targetPath);
}

export async function getLocalRestoreStatus(): Promise<LocalRestoreStatus | null> {
  const api = getApi();
  if (!api?.getLocalRestoreStatus) {
    return null;
  }
  try {
    return await api.getLocalRestoreStatus();
  } catch {
    return null;
  }
}

export function subscribeLocalRestoreEvents(params: {
  onProgress: (payload: any) => void;
  onFinished: (payload: any) => void;
}): (() => void) | null {
  const api = getApi();
  const onProgress = api?.onLocalRestoreProgress;
  const onFinished = api?.onLocalRestoreFinished;
  if (!onProgress || !onFinished) {
    return null;
  }

  const unSubProgress = onProgress(params.onProgress);
  const unSubFinished = onFinished(params.onFinished);

  return () => {
    if (typeof unSubProgress === 'function') {
      unSubProgress();
    }
    if (typeof unSubFinished === 'function') {
      unSubFinished();
    }
  };
}

