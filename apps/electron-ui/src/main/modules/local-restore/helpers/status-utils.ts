import { BucketSummary, LocalRestoreStatus, LocalRestoreSummary } from '../../../../shared/local-restore-types';

export function createInitialLocalRestoreStatus(): LocalRestoreStatus {
  return {
    status: 'idle',
    inputDir: '',
    outputDir: '',
    startTime: null,
    endTime: null,
    totalFiles: 0,
    imageFiles: 0,
    processedFiles: 0,
    succeededFiles: 0,
    failedFiles: 0,
    skippedFiles: 0,
    bucketCount: 0,
    completedBucketCount: 0,
    speedPerSecond: 0,
    currentFile: null,
    stopRequested: false,
    summaryPath: null,
    errorMessage: null
  };
}

export function calculateSpeedPerSecond(status: LocalRestoreStatus): number {
  if (!status.startTime) {
    return 0;
  }
  const elapsedMs = Date.now() - status.startTime;
  if (elapsedMs <= 0) {
    return 0;
  }
  return Number((status.processedFiles / (elapsedMs / 1000)).toFixed(2));
}

export function buildRunSummary(params: {
  status: LocalRestoreStatus;
  finishedStatus: LocalRestoreSummary['status'];
  bucketSummaries: BucketSummary[];
  errors: { file: string; reason: string }[];
  now: number;
}): LocalRestoreSummary {
  const { status, finishedStatus, bucketSummaries, errors, now } = params;
  return {
    status: finishedStatus,
    inputDir: status.inputDir,
    outputDir: status.outputDir,
    startTime: status.startTime || now,
    endTime: now,
    durationMs: Math.max(0, now - (status.startTime || now)),
    totalFiles: status.totalFiles,
    imageFiles: status.imageFiles,
    processedFiles: status.processedFiles,
    succeededFiles: status.succeededFiles,
    failedFiles: status.failedFiles,
    skippedFiles: status.skippedFiles,
    bucketCount: status.bucketCount,
    completedBucketCount: status.completedBucketCount,
    outputFiles: bucketSummaries.length,
    buckets: bucketSummaries,
    errors
  };
}

