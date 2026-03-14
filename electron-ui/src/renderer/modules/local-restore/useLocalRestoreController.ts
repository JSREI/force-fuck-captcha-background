import { useMemo, useState } from 'react';
import type { LocalRestoreStatus, LocalRestoreSummary } from '../../../shared/local-restore-types';
import type { RunHistoryItem } from './types';
import {
  computeDurationSeconds,
  computeProgressPercent,
  initialLocalRestoreStatus
} from './status';
import { useLocalRestoreBootstrap } from './useLocalRestoreBootstrap';
import { createLocalRestoreActions } from './controller-actions';

export function useLocalRestoreController() {
  const [inputDir, setInputDir] = useState('');
  const [outputDir, setOutputDir] = useState('');
  const [outputManuallySelected, setOutputManuallySelected] = useState(false);
  const [status, setStatus] = useState<LocalRestoreStatus>(initialLocalRestoreStatus);
  const [summary, setSummary] = useState<LocalRestoreSummary | null>(null);
  const [history, setHistory] = useState<RunHistoryItem[]>([]);
  const [busy, setBusy] = useState(false);

  const isRunning = status.status === 'running';
  const canStart = Boolean(inputDir && outputDir) && !isRunning;
  const progressPercent = useMemo(() => computeProgressPercent(status), [status]);
  const durationSeconds = useMemo(() => computeDurationSeconds(status), [status]);

  useLocalRestoreBootstrap({
    inputDir,
    outputDir,
    outputManuallySelected,
    history,
    setInputDir,
    setOutputDir,
    setOutputManuallySelected,
    setStatus,
    setSummary,
    setHistory,
    setBusy
  });

  const {
    handleSelectInputDir,
    handleSelectOutputDir,
    handleStart,
    handleStop,
    handleOpenOutput,
    handleRestoreHistory,
    handleOpenHistoryOutput
  } = createLocalRestoreActions({
    inputDir,
    outputDir,
    canStart,
    outputManuallySelected,
    setInputDir,
    setOutputDir,
    setOutputManuallySelected,
    setStatus,
    setSummary,
    setBusy
  });

  return {
    inputDir,
    outputDir,
    status,
    summary,
    history,
    busy,
    isRunning,
    canStart,
    progressPercent,
    durationSeconds,
    handleSelectInputDir,
    handleSelectOutputDir,
    handleStart,
    handleStop,
    handleOpenOutput,
    handleRestoreHistory,
    handleOpenHistoryOutput
  };
}
