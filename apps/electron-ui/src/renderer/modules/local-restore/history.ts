import type { LocalRestoreStatus, LocalRestoreSummary } from '../../../shared/local-restore-types';
import type { RunHistoryItem } from './types';

export function buildRunHistoryItem(
  progress: LocalRestoreStatus,
  runSummary?: LocalRestoreSummary
): RunHistoryItem {
  const endedAt = progress.endTime || Date.now();
  const startedAt = progress.startTime || endedAt;
  return {
    id: `${startedAt}-${endedAt}-${Math.random().toString(36).slice(2, 8)}`,
    status: runSummary?.status || progress.status,
    startedAt,
    endedAt: progress.endTime,
    durationMs: runSummary?.durationMs || Math.max(0, endedAt - startedAt),
    inputDir: runSummary?.inputDir || progress.inputDir,
    outputDir: runSummary?.outputDir || progress.outputDir,
    processedFiles: runSummary?.processedFiles ?? progress.processedFiles,
    imageFiles: runSummary?.imageFiles ?? progress.imageFiles,
    bucketCount: runSummary?.bucketCount ?? progress.bucketCount,
    summaryPath: progress.summaryPath
  };
}

