import { useEffect } from 'react';
import type { LocalRestoreStatus, LocalRestoreSummary } from '../../../shared/local-restore-types';
import type { RunHistoryItem } from './types';
import { getDefaultOutputDir } from './path';
import { buildRunHistoryItem } from './history';
import {
  getLocalRestoreStatus as fetchLocalRestoreStatus,
  subscribeLocalRestoreEvents
} from './electron-api';
import {
  loadLocalRestorePrefs,
  loadRunHistory,
  persistLocalRestorePrefs,
  persistRunHistory
} from './storage';

interface UseLocalRestoreBootstrapParams {
  inputDir: string;
  outputDir: string;
  outputManuallySelected: boolean;
  history: RunHistoryItem[];
  setInputDir: (v: string) => void;
  setOutputDir: (v: string) => void;
  setOutputManuallySelected: (v: boolean) => void;
  setStatus: (updater: any) => void;
  setSummary: (v: LocalRestoreSummary | null) => void;
  setHistory: (updater: any) => void;
  setBusy: (v: boolean) => void;
}

export function useLocalRestoreBootstrap(params: UseLocalRestoreBootstrapParams): void {
  const {
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
  } = params;

  useEffect(() => {
    const prefs = loadLocalRestorePrefs();
    if (prefs.inputDir) {
      setInputDir(prefs.inputDir);
    }
    if (prefs.outputDir) {
      setOutputDir(prefs.outputDir);
    } else if (prefs.inputDir) {
      setOutputDir(getDefaultOutputDir(prefs.inputDir));
    }
    setOutputManuallySelected(Boolean(prefs.outputManuallySelected));
    setHistory(loadRunHistory());

    fetchLocalRestoreStatus().then((remoteStatus) => {
      if (!remoteStatus) {
        return;
      }
      setStatus(remoteStatus);
      if (remoteStatus.inputDir) {
        setInputDir(remoteStatus.inputDir);
      }
      if (remoteStatus.outputDir) {
        setOutputDir(remoteStatus.outputDir);
        setOutputManuallySelected(true);
      }
    });

    const unsubscribe = subscribeLocalRestoreEvents({
      onProgress: (payload: any) => {
        if (payload?.progress) {
          setStatus(payload.progress as LocalRestoreStatus);
        }
      },
      onFinished: (payload: any) => {
        if (payload?.progress) {
          const progress = payload.progress as LocalRestoreStatus;
          setStatus(progress);
          const runSummary = payload?.summary as LocalRestoreSummary | undefined;
          setHistory((prev: RunHistoryItem[]) => [buildRunHistoryItem(progress, runSummary), ...prev].slice(0, 10));
        }
        if (payload?.summary) {
          setSummary(payload.summary as LocalRestoreSummary);
        }
        setBusy(false);
      }
    });

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);

  useEffect(() => {
    persistLocalRestorePrefs({ inputDir, outputDir, outputManuallySelected });
  }, [inputDir, outputDir, outputManuallySelected]);

  useEffect(() => {
    persistRunHistory(history);
  }, [history]);
}

