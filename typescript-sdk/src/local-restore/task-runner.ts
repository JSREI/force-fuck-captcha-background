import fs from 'fs';
import path from 'path';
import { LocalRestoreConfig, LocalRestoreStatus, LocalRestoreSummary } from '../types';
import { IMAGE_EXTENSIONS } from './constants';
import { scanAllFiles } from './fs-utils';
import { generateBucketOutputs, processImageIntoBuckets } from './vote-engine';
import { BucketState } from './types';
import { buildRunSummary, calculateSpeedPerSecond } from './status-utils';

interface ExecuteLocalRestoreRunParams {
  config: LocalRestoreConfig;
  status: LocalRestoreStatus;
  buckets: Map<string, BucketState>;
  errors: { file: string; reason: string }[];
  shouldStop: () => boolean;
  pushError: (filePath: string, reason: string) => void;
  emitProgress: (force: boolean) => void;
}

export async function executeLocalRestoreRun(params: ExecuteLocalRestoreRunParams): Promise<LocalRestoreSummary> {
  const { config, status, buckets, errors, shouldStop, pushError, emitProgress } = params;

  await fs.promises.mkdir(config.outputDir, { recursive: true });

  const allFiles = await scanAllFiles(config.inputDir);
  const imageFiles = allFiles.filter((filePath) => IMAGE_EXTENSIONS.has(path.extname(filePath).toLowerCase()));
  status.totalFiles = allFiles.length;
  status.imageFiles = imageFiles.length;
  status.skippedFiles = allFiles.length - imageFiles.length;
  emitProgress(true);

  for (const filePath of imageFiles) {
    if (shouldStop()) {
      break;
    }

    status.currentFile = filePath;
    try {
      await processImageIntoBuckets(filePath, buckets);
      status.succeededFiles += 1;
    } catch (error: any) {
      status.failedFiles += 1;
      pushError(filePath, error?.message || String(error));
    } finally {
      status.processedFiles += 1;
      status.bucketCount = buckets.size;
      status.speedPerSecond = calculateSpeedPerSecond(status);
      emitProgress(false);
    }
  }

  status.currentFile = null;
  const bucketSummaries = await generateBucketOutputs(config.outputDir, buckets);
  status.completedBucketCount = bucketSummaries.length;
  status.bucketCount = buckets.size;

  const finishedStatus: LocalRestoreSummary['status'] = shouldStop() ? 'stopped' : 'completed';
  const now = Date.now();
  status.status = finishedStatus;
  status.endTime = now;
  status.speedPerSecond = calculateSpeedPerSecond(status);

  const summary = buildRunSummary({
    status,
    finishedStatus,
    bucketSummaries,
    errors,
    now
  });

  const summaryPath = path.join(config.outputDir, 'summary.json');
  await fs.promises.writeFile(summaryPath, JSON.stringify(summary, null, 2), 'utf8');
  status.summaryPath = summaryPath;

  return summary;
}
