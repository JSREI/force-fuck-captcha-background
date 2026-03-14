import fs from 'fs';
import path from 'path';

export function resolvePreloadPath(): string {
  const preloadCandidates = [
    path.join(__dirname, 'preload.js'),
    path.join(__dirname, '..', 'preload.js'),
    path.join(__dirname, '..', '..', 'preload.js'),
    path.join(__dirname, '..', '..', '..', 'preload.js')
  ];
  return preloadCandidates.find((candidate) => fs.existsSync(candidate)) || preloadCandidates[0];
}

export function resolveIndexPath(): string {
  const indexCandidates = [
    path.join(__dirname, 'index.html'),
    path.join(__dirname, '..', 'index.html'),
    path.join(__dirname, '..', '..', 'index.html'),
    path.join(__dirname, '..', '..', '..', 'index.html')
  ];
  return indexCandidates.find((candidate) => fs.existsSync(candidate)) || indexCandidates[0];
}
