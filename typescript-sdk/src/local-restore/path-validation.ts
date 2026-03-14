import fs from 'fs';
import path from 'path';
import type { LocalRestoreConfig } from '../types';
import { clearDirectoryContents, hasDirEntries } from './fs-utils';

interface ValidationResult {
  accepted: boolean;
  reason?: string;
  normalizedInput?: string;
  normalizedOutput?: string;
}

export async function validateAndPreparePaths(config: LocalRestoreConfig): Promise<ValidationResult> {
  if (!config.inputDir || !config.outputDir) {
    return { accepted: false, reason: 'input_or_output_missing' };
  }

  if (!fs.existsSync(config.inputDir) || !fs.statSync(config.inputDir).isDirectory()) {
    return { accepted: false, reason: 'input_dir_invalid' };
  }

  const normalizedInput = path.resolve(config.inputDir);
  const normalizedOutput = path.resolve(config.outputDir);
  if (normalizedInput === normalizedOutput) {
    return { accepted: false, reason: 'output_same_as_input' };
  }

  if (fs.existsSync(normalizedOutput)) {
    const stat = await fs.promises.stat(normalizedOutput);
    if (!stat.isDirectory()) {
      return { accepted: false, reason: 'output_dir_invalid' };
    }

    const hasEntries = await hasDirEntries(normalizedOutput);
    if (hasEntries) {
      if (!config.clearOutputBeforeRun) {
        return { accepted: false, reason: 'output_not_empty' };
      }
      await clearDirectoryContents(normalizedOutput);
    }
  }

  return {
    accepted: true,
    normalizedInput,
    normalizedOutput
  };
}
