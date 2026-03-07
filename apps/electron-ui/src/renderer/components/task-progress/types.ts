import type { TaskInfo } from '../../../main/modules/task-manager';

export type OpenDirectoryType = 'task' | 'captcha' | 'background';

export interface TaskProgressProps {
  task: TaskInfo | null;
  onOpenDirectory: (type: OpenDirectoryType) => void;
}
