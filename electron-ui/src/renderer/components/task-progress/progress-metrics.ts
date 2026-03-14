import type { TaskInfo } from '../../../main/modules/task-manager';

export interface TaskProgressMetrics {
  isCompleted: boolean;
  pendingBuckets: number;
  downloadPercent: number;
  votingPercent: number;
}

export function buildTaskProgressMetrics(task: TaskInfo): TaskProgressMetrics {
  const { progress, status } = task;
  return {
    isCompleted: status === 'completed',
    pendingBuckets: progress.totalBuckets - progress.completedBuckets,
    downloadPercent: Math.round(progress.downloadProgress * 100),
    votingPercent: progress.totalBuckets > 0
      ? parseFloat((progress.completedBuckets / progress.totalBuckets * 100).toFixed(1))
      : 0
  };
}
