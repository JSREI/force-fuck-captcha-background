export interface RunHistoryItem {
  id: string;
  status: string;
  startedAt: number;
  endedAt: number | null;
  durationMs: number;
  inputDir: string;
  outputDir: string;
  processedFiles: number;
  imageFiles: number;
  bucketCount: number;
  summaryPath: string | null;
}

