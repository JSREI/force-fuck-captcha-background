import React from 'react';
import { Card, Space } from 'antd';
import { buildTaskProgressMetrics } from './task-progress/progress-metrics';
import { DownloadStatsSection } from './task-progress/DownloadStatsSection';
import { BackgroundStatsSection } from './task-progress/BackgroundStatsSection';
import { CompletionActions } from './task-progress/CompletionActions';
import type { TaskProgressProps } from './task-progress/types';

const TaskProgress: React.FC<TaskProgressProps> = ({ task, onOpenDirectory }) => {
  if (!task) {
    return null;
  }

  const { progress } = task;
  const metrics = buildTaskProgressMetrics(task);

  return (
    <Card title="任务进度" className="task-progress">
      <Space direction="vertical" style={{ width: '100%' }} size="large">
        <DownloadStatsSection
          downloadedImages={progress.downloadedImages}
          downloadPercent={metrics.downloadPercent}
          isCompleted={metrics.isCompleted}
        />
        <BackgroundStatsSection
          totalBuckets={progress.totalBuckets}
          completedBuckets={progress.completedBuckets}
          pendingBuckets={metrics.pendingBuckets}
          votingPercent={metrics.votingPercent}
          isCompleted={metrics.isCompleted}
        />
        {metrics.isCompleted && (
          <CompletionActions onOpenDirectory={onOpenDirectory} />
        )}
      </Space>
    </Card>
  );
};

export default TaskProgress;
