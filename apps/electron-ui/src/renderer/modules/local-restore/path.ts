export const normalizeDir = (dir: string): string => dir.replace(/[\\/]+$/, '');
export const getDefaultOutputDir = (selectedInputDir: string): string => `${normalizeDir(selectedInputDir)}_background`;

