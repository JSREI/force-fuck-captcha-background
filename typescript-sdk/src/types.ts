export type LocalRestoreTaskStatus =
  | 'idle'
  | 'running'
  | 'completed'
  | 'failed'
  | 'stopped';

export interface LocalRestoreConfig {
  inputDir: string;
  outputDir: string;
  clearOutputBeforeRun?: boolean;
}

export interface ProcessingErrorItem {
  file: string;
  reason: string;
}

export interface BucketSummary {
  id: string;
  width: number;
  height: number;
  imageCount: number;
  outputFile: string;
  outputPath: string;
}

export interface LocalRestoreSummary {
  status: Exclude<LocalRestoreTaskStatus, 'idle' | 'running'>;
  inputDir: string;
  outputDir: string;
  startTime: number;
  endTime: number;
  durationMs: number;
  totalFiles: number;
  imageFiles: number;
  processedFiles: number;
  succeededFiles: number;
  failedFiles: number;
  skippedFiles: number;
  bucketCount: number;
  completedBucketCount: number;
  outputFiles: number;
  buckets: BucketSummary[];
  errors: ProcessingErrorItem[];
}

export interface LocalRestoreStatus {
  status: LocalRestoreTaskStatus;
  inputDir: string;
  outputDir: string;
  startTime: number | null;
  endTime: number | null;
  totalFiles: number;
  imageFiles: number;
  processedFiles: number;
  succeededFiles: number;
  failedFiles: number;
  skippedFiles: number;
  bucketCount: number;
  completedBucketCount: number;
  speedPerSecond: number;
  currentFile: string | null;
  stopRequested: boolean;
  summaryPath: string | null;
  errorMessage: string | null;
}

export type ProgressCallback = (status: LocalRestoreStatus) => void;
export type StopChecker = () => boolean;

export interface LocalRestoreRunOptions {
  clearOutputBeforeRun?: boolean;
  onProgress?: ProgressCallback;
  progressIntervalMs?: number;
  stopChecker?: StopChecker;
}
