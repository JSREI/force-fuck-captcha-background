import { message } from 'antd';
import { chooseDirectory, openPath } from '../electron-api';
import { getDefaultOutputDir } from '../path';
import type { RunHistoryItem } from '../types';
import type {
  CreateLocalRestoreActionsParams,
  LocalRestoreActionHandlers,
  OpenPathResult
} from './types';

export function createDirectoryActions(
  params: CreateLocalRestoreActionsParams
): Pick<
  LocalRestoreActionHandlers,
  | 'handleSelectInputDir'
  | 'handleSelectOutputDir'
  | 'handleOpenOutput'
  | 'handleRestoreHistory'
  | 'handleOpenHistoryOutput'
> {
  const {
    outputDir,
    outputManuallySelected,
    setInputDir,
    setOutputDir,
    setOutputManuallySelected
  } = params;

  const handleSelectInputDir = async (): Promise<void> => {
    const selected = await chooseDirectory();
    if (!selected) {
      return;
    }

    setInputDir(selected);
    if (!outputDir || !outputManuallySelected) {
      setOutputDir(getDefaultOutputDir(selected));
      setOutputManuallySelected(false);
    }
  };

  const handleSelectOutputDir = async (): Promise<void> => {
    const selected = await chooseDirectory();
    if (!selected) {
      return;
    }
    setOutputDir(selected);
    setOutputManuallySelected(true);
  };

  const handleOpenOutput = async (): Promise<void> => {
    if (!outputDir) {
      return;
    }
    const result = (await openPath(outputDir)) as OpenPathResult;
    if (!result?.success) {
      message.error(`打开目录失败: ${result?.error || 'unknown_error'}`);
    }
  };

  const handleRestoreHistory = (item: RunHistoryItem): void => {
    setInputDir(item.inputDir);
    setOutputDir(item.outputDir);
    setOutputManuallySelected(true);
    message.success('已恢复该次运行配置');
  };

  const handleOpenHistoryOutput = async (item: RunHistoryItem): Promise<void> => {
    const result = (await openPath(item.outputDir)) as OpenPathResult;
    if (!result?.success) {
      message.error(`打开目录失败: ${result?.error || 'unknown_error'}`);
    }
  };

  return {
    handleSelectInputDir,
    handleSelectOutputDir,
    handleOpenOutput,
    handleRestoreHistory,
    handleOpenHistoryOutput
  };
}
