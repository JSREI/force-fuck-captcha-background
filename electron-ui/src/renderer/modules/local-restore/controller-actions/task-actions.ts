import { Modal, message } from 'antd';
import type { LocalRestoreStatus } from '../../../../shared/local-restore-types';
import { startLocalRestore, stopLocalRestore } from '../electron-api';
import type {
  CreateLocalRestoreActionsParams,
  LocalRestoreActionHandlers,
  StartLocalRestoreResult,
  StopLocalRestoreResult
} from './types';

function setRunningStatus(params: {
  inputDir: string;
  outputDir: string;
  setStatus: CreateLocalRestoreActionsParams['setStatus'];
}): void {
  const { inputDir, outputDir, setStatus } = params;
  setStatus((prev: LocalRestoreStatus) => ({
    ...prev,
    status: 'running',
    inputDir,
    outputDir,
    startTime: Date.now(),
    endTime: null,
    errorMessage: null,
    summaryPath: null,
    processedFiles: 0,
    succeededFiles: 0,
    failedFiles: 0
  }));
}

export function createTaskActions(
  params: CreateLocalRestoreActionsParams
): Pick<LocalRestoreActionHandlers, 'handleStart' | 'handleStop'> {
  const { inputDir, outputDir, canStart, setStatus, setSummary, setBusy } = params;

  const startTask = async (clearOutputBeforeRun: boolean): Promise<void> => {
    setBusy(true);
    setSummary(null);

    const result = (await startLocalRestore(
      inputDir,
      outputDir,
      clearOutputBeforeRun
    )) as StartLocalRestoreResult;

    if (!result?.accepted) {
      if (result?.reason === 'output_not_empty' && !clearOutputBeforeRun) {
        setBusy(false);
        Modal.confirm({
          title: '输出目录非空',
          content: `目录 "${outputDir}" 中已有内容。确认清空该目录后再运行吗？`,
          okText: '清空并运行',
          okType: 'danger',
          cancelText: '取消',
          onOk: async () => {
            await startTask(true);
          }
        });
        return;
      }

      if (result?.reason === 'output_same_as_input') {
        message.error('输出目录不能与验证码目录相同');
      } else {
        message.error(`启动失败: ${result?.reason || 'unknown_error'}`);
      }
      setBusy(false);
      return;
    }

    setRunningStatus({ inputDir, outputDir, setStatus });
  };

  const handleStart = async (): Promise<void> => {
    if (!canStart) {
      return;
    }
    await startTask(false);
  };

  const handleStop = async (): Promise<void> => {
    const result = (await stopLocalRestore()) as StopLocalRestoreResult;
    if (result?.success) {
      message.info('已请求停止任务，正在收尾...');
    } else {
      message.warning('当前没有可停止的任务');
    }
  };

  return {
    handleStart,
    handleStop
  };
}
