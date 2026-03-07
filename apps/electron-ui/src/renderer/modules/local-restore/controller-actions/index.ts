import type { CreateLocalRestoreActionsParams, LocalRestoreActionHandlers } from './types';
import { createDirectoryActions } from './directory-actions';
import { createTaskActions } from './task-actions';

export function createLocalRestoreActions(
  params: CreateLocalRestoreActionsParams
): LocalRestoreActionHandlers {
  return {
    ...createDirectoryActions(params),
    ...createTaskActions(params)
  };
}
