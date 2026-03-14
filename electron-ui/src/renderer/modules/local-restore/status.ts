import type { LocalRestoreStatus } from '../../../shared/local-restore-types';

export const initialLocalRestoreStatus: LocalRestoreStatus = {
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

export const computeProgressPercent = (status: LocalRestoreStatus): number => (
  status.imageFiles > 0
    ? Math.min(100, Number(((status.processedFiles / status.imageFiles) * 100).toFixed(1)))
    : 0
);

export const computeDurationSeconds = (status: LocalRestoreStatus): number => {
  if (!status.startTime) {
    return 0;
  }
  const end = status.endTime || Date.now();
  return Math.max(0, Math.floor((end - status.startTime) / 1000));
};

