import { LocalRestoreConfig, LocalRestoreRunOptions, LocalRestoreStatus, LocalRestoreSummary } from './types';
import { MAX_ERROR_ITEMS, DEFAULT_PROGRESS_INTERVAL_MS } from './local-restore/constants';
import { BucketState } from './local-restore/types';
import { validateAndPreparePaths } from './local-restore/path-validation';
import { executeLocalRestoreRun } from './local-restore/task-runner';
import { buildRunSummary, calculateSpeedPerSecond, createInitialLocalRestoreStatus } from './local-restore/status-utils';

export async function runLocalRestore(
  inputDir: string,
  outputDir: string,
  options: LocalRestoreRunOptions = {}
): Promise<LocalRestoreSummary> {
  const status = createInitialLocalRestoreStatus();
  const buckets = new Map<string, BucketState>();
  const errors: { file: string; reason: string }[] = [];

  const progressInterval = options.progressIntervalMs ?? DEFAULT_PROGRESS_INTERVAL_MS;
  let lastProgressAt = 0;

  const emitProgress = (force: boolean) => {
    if (!options.onProgress) {
      return;
    }
    const now = Date.now();
    if (!force && now - lastProgressAt < progressInterval) {
      return;
    }
    lastProgressAt = now;
    options.onProgress({ ...status });
  };

  const shouldStop = () => {
    const stopped = Boolean(options.stopChecker && options.stopChecker());
    if (stopped) {
      status.stopRequested = true;
    }
    return stopped;
  };

  const pushError = (filePath: string, reason: string) => {
    if (errors.length >= MAX_ERROR_ITEMS) {
      return;
    }
    errors.push({ file: filePath, reason });
  };

  const config: LocalRestoreConfig = {
    inputDir,
    outputDir,
    clearOutputBeforeRun: options.clearOutputBeforeRun
  };

  const validated = await validateAndPreparePaths(config);
  if (!validated.accepted || !validated.normalizedInput || !validated.normalizedOutput) {
    throw new Error(validated.reason || 'path_validation_failed');
  }

  const normalizedConfig = {
    ...config,
    inputDir: validated.normalizedInput,
    outputDir: validated.normalizedOutput
  };

  status.status = 'running';
  status.inputDir = normalizedConfig.inputDir;
  status.outputDir = normalizedConfig.outputDir;
  status.startTime = Date.now();

  try {
    const summary = await executeLocalRestoreRun({
      config: normalizedConfig,
      status,
      buckets,
      errors,
      shouldStop,
      pushError,
      emitProgress
    });
    emitProgress(true);
    return summary;
  } catch (error: any) {
    const now = Date.now();
    status.status = 'failed';
    status.endTime = now;
    status.currentFile = null;
    status.errorMessage = error?.message || String(error);
    status.speedPerSecond = calculateSpeedPerSecond(status);
    emitProgress(true);
    return buildRunSummary({
      status,
      finishedStatus: 'failed',
      bucketSummaries: [],
      errors,
      now
    });
  }
}

export class CaptchaVisionSDK {
  async runLocalRestore(
    inputDir: string,
    outputDir: string,
    options: LocalRestoreRunOptions = {}
  ): Promise<LocalRestoreSummary> {
    return runLocalRestore(inputDir, outputDir, options);
  }

  async runLocalRestoreDict(
    inputDir: string,
    outputDir: string,
    options: LocalRestoreRunOptions = {}
  ): Promise<LocalRestoreSummary> {
    return runLocalRestore(inputDir, outputDir, options);
  }
}
