import { LOCAL_RESTORE_HISTORY_KEY, LOCAL_RESTORE_PREFS_KEY } from './constants';
import { getDefaultOutputDir } from './path';
import { RunHistoryItem } from './types';

export interface LocalRestorePrefs {
  inputDir: string;
  outputDir: string;
  outputManuallySelected: boolean;
}

export function loadLocalRestorePrefs(): Partial<LocalRestorePrefs> {
  try {
    const raw = localStorage.getItem(LOCAL_RESTORE_PREFS_KEY);
    if (!raw) {
      return {};
    }
    const parsed = JSON.parse(raw) as Partial<LocalRestorePrefs>;
    if (!parsed.outputDir && parsed.inputDir) {
      parsed.outputDir = getDefaultOutputDir(parsed.inputDir);
    }
    return parsed;
  } catch {
    return {};
  }
}

export function persistLocalRestorePrefs(prefs: LocalRestorePrefs): void {
  localStorage.setItem(LOCAL_RESTORE_PREFS_KEY, JSON.stringify(prefs));
}

export function loadRunHistory(): RunHistoryItem[] {
  try {
    const raw = localStorage.getItem(LOCAL_RESTORE_HISTORY_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw) as RunHistoryItem[];
    return Array.isArray(parsed) ? parsed.slice(0, 10) : [];
  } catch {
    return [];
  }
}

export function persistRunHistory(history: RunHistoryItem[]): void {
  localStorage.setItem(LOCAL_RESTORE_HISTORY_KEY, JSON.stringify(history.slice(0, 10)));
}

