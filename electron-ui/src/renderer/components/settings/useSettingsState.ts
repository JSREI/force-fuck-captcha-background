import { useEffect, useState } from 'react';

declare global {
  interface Window {
    electronAPI: {
      ipcRenderer: {
        invoke(channel: string, ...args: any[]): Promise<any>;
      };
    };
  }
}

export function useSettingsState() {
  const [workspacePath, setWorkspacePath] = useState<string>('');
  const [useSystemProxy, setUseSystemProxy] = useState<boolean>(false);
  const [customProxy, setCustomProxy] = useState<string>('');

  useEffect(() => {
    window.electronAPI.ipcRenderer.invoke('get-settings').then((settings: any) => {
      setWorkspacePath(settings.workspacePath || '');
      setUseSystemProxy(settings.useSystemProxy || false);
      setCustomProxy(settings.customProxy || '');
    });
  }, []);

  const selectDirectory = async () => {
    const result = await window.electronAPI.ipcRenderer.invoke('select-directory');
    if (result) {
      setWorkspacePath(result);
    }
  };

  const saveSettings = async () => {
    await window.electronAPI.ipcRenderer.invoke('save-settings', {
      workspacePath,
      useSystemProxy,
      customProxy
    });
  };

  return {
    workspacePath,
    setWorkspacePath,
    useSystemProxy,
    setUseSystemProxy,
    customProxy,
    setCustomProxy,
    selectDirectory,
    saveSettings
  };
}

