import type { Dispatch, SetStateAction } from 'react';
import type { LocalRestoreStatus, LocalRestoreSummary } from '../../../../shared/local-restore-types';
import type { RunHistoryItem } from '../types';

export interface StartLocalRestoreResult {
  accepted?: boolean;
  reason?: string;
}

export interface StopLocalRestoreResult {
  success?: boolean;
}

export interface OpenPathResult {
  success?: boolean;
  error?: string;
}

export interface CreateLocalRestoreActionsParams {
  inputDir: string;
  outputDir: string;
  canStart: boolean;
  outputManuallySelected: boolean;
  setInputDir: Dispatch<SetStateAction<string>>;
  setOutputDir: Dispatch<SetStateAction<string>>;
  setOutputManuallySelected: Dispatch<SetStateAction<boolean>>;
  setStatus: Dispatch<SetStateAction<LocalRestoreStatus>>;
  setSummary: Dispatch<SetStateAction<LocalRestoreSummary | null>>;
  setBusy: Dispatch<SetStateAction<boolean>>;
}

export interface LocalRestoreActionHandlers {
  handleSelectInputDir: () => Promise<void>;
  handleSelectOutputDir: () => Promise<void>;
  handleStart: () => Promise<void>;
  handleStop: () => Promise<void>;
  handleOpenOutput: () => Promise<void>;
  handleRestoreHistory: (item: RunHistoryItem) => void;
  handleOpenHistoryOutput: (item: RunHistoryItem) => Promise<void>;
}
