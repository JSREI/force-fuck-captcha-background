import { BrowserWindow } from 'electron';
import {
  LocalRestoreConfig,
  LocalRestoreProgressEvent,
  LocalRestoreStatus,
  LocalRestoreSummary
} from '../../shared/local-restore-types';
import { logger } from './logger';
import { MAX_ERROR_ITEMS, PROGRESS_INTERVAL_MS } from './local-restore/helpers/constants';
import { BucketState } from './local-restore/helpers/types';
import {
  buildRunSummary,
  calculateSpeedPerSecond,
  createInitialLocalRestoreStatus
} from './local-restore/helpers/status-utils';
import { validateAndPreparePaths } from './local-restore/helpers/path-validation';
import { executeLocalRestoreRun } from './local-restore/helpers/task-runner';

export class LocalRestoreManager {
  private status: LocalRestoreStatus = createInitialLocalRestoreStatus();
  private buckets = new Map<string, BucketState>();
  private errors: { file: string; reason: string }[] = [];
  private stopRequested = false;
  private runningPromise: Promise<void> | null = null;
  private mainWindow: BrowserWindow | null = null;
  private lastProgressEmitAt = 0;

  public async start(config: LocalRestoreConfig, mainWindow: BrowserWindow): Promise<{ accepted: boolean; reason?: string }> {
    if (this.status.status === 'running' || this.runningPromise) {
      return { accepted: false, reason: 'already_running' };
    }

    try {
      const validated = await validateAndPreparePaths(config);
      if (!validated.accepted || !validated.normalizedInput || !validated.normalizedOutput) {
        return { accepted: false, reason: validated.reason || 'path_validation_failed' };
      }

      this.mainWindow = mainWindow;
      const normalizedConfig = {
        ...config,
        inputDir: validated.normalizedInput,
        outputDir: validated.normalizedOutput
      };
      this.resetForRun(normalizedConfig);
      this.runningPromise = this.run(normalizedConfig);
      return { accepted: true };
    } catch (error: any) {
      logger.error('Output directory check failed:', error);
      return { accepted: false, reason: 'output_dir_check_failed' };
    }
  }

  public stop(): { success: boolean } {
    if (this.status.status !== 'running') {
      return { success: false };
    }
    this.stopRequested = true;
    this.status.stopRequested = true;
    this.emitProgress(true);
    return { success: true };
  }

  public getStatus(): LocalRestoreStatus {
    return { ...this.status };
  }

  private resetForRun(config: LocalRestoreConfig): void {
    this.status = createInitialLocalRestoreStatus();
    this.status.status = 'running';
    this.status.inputDir = config.inputDir;
    this.status.outputDir = config.outputDir;
    this.status.startTime = Date.now();
    this.buckets.clear();
    this.errors = [];
    this.stopRequested = false;
    this.lastProgressEmitAt = 0;
  }

  private async run(config: LocalRestoreConfig): Promise<void> {
    try {
      const summary = await executeLocalRestoreRun({
        config,
        status: this.status,
        buckets: this.buckets,
        errors: this.errors,
        shouldStop: () => this.stopRequested,
        pushError: (filePath, reason) => this.pushError(filePath, reason),
        emitProgress: (force) => this.emitProgress(force)
      });
      this.emitProgress(true);
      this.emitFinished(summary);
    } catch (error: any) {
      const now = Date.now();
      this.status.status = 'failed';
      this.status.endTime = now;
      this.status.currentFile = null;
      this.status.errorMessage = error?.message || String(error);
      this.status.speedPerSecond = calculateSpeedPerSecond(this.status);
      this.emitProgress(true);
      this.emitFinished(buildRunSummary({
        status: this.status,
        finishedStatus: 'failed',
        bucketSummaries: [],
        errors: this.errors,
        now
      }));
      logger.error('Local restore failed:', error);
    } finally {
      this.runningPromise = null;
      this.stopRequested = false;
      this.status.stopRequested = false;
    }
  }

  private pushError(filePath: string, reason: string): void {
    if (this.errors.length >= MAX_ERROR_ITEMS) {
      return;
    }
    this.errors.push({ file: filePath, reason });
  }

  private emitProgress(force: boolean): void {
    const now = Date.now();
    if (!force && now - this.lastProgressEmitAt < PROGRESS_INTERVAL_MS) {
      return;
    }
    this.lastProgressEmitAt = now;
    if (!this.mainWindow || this.mainWindow.isDestroyed()) {
      return;
    }
    const payload: LocalRestoreProgressEvent = {
      status: this.status.status,
      progress: this.getStatus()
    };
    this.mainWindow.webContents.send('local-restore-progress', payload);
  }

  private emitFinished(summary: LocalRestoreSummary): void {
    if (!this.mainWindow || this.mainWindow.isDestroyed()) {
      return;
    }
    this.mainWindow.webContents.send('local-restore-finished', {
      status: this.status.status,
      progress: this.getStatus(),
      summary
    });
  }
}
