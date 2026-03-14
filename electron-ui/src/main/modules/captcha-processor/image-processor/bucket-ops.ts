import { BackgroundImageBucket, PixelVoteState, SimpleImageData } from '../types';

export const VOTE_THRESHOLD = 3;
export const MAX_BUCKETS = 10000;
export const MAX_NO_NEW_BUCKET = 10;

export function createBucket(id: string, width: number, height: number): BackgroundImageBucket {
  const pixelVotes: PixelVoteState[][] = Array(height).fill(null).map((_, y) =>
    Array(width).fill(null).map((_, x) => ({
      x,
      y,
      votes: new Map(),
      isFinalized: false
    }))
  );

  return {
    id,
    imageCount: 0,
    width,
    height,
    pixelVotes,
    votes: new Map(),
    isCompleted: false,
    finalImagePath: undefined,
    finalImage: undefined
  };
}

export function getRGBAt(imageData: SimpleImageData, x: number, y: number) {
  const index = (y * imageData.width + x) * 4;
  return {
    r: imageData.data[index],
    g: imageData.data[index + 1],
    b: imageData.data[index + 2]
  };
}

export function processPixels(bucket: BackgroundImageBucket, imageData: SimpleImageData): void {
  const width = imageData.width;
  const height = imageData.height;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const rgb = getRGBAt(imageData, x, y);
      const pixelState = bucket.pixelVotes[y][x];
      if (pixelState.isFinalized) {
        continue;
      }
      const rgbKey = `${rgb.r},${rgb.g},${rgb.b}`;
      const currentVotes = pixelState.votes.get(rgbKey) || 0;
      pixelState.votes.set(rgbKey, currentVotes + 1);
      if (currentVotes + 1 >= VOTE_THRESHOLD) {
        pixelState.isFinalized = true;
        pixelState.finalRGB = rgb;
      }
    }
  }
}

export function checkBucketCompletion(bucket: BackgroundImageBucket): boolean {
  for (let y = 0; y < bucket.height; y++) {
    for (let x = 0; x < bucket.width; x++) {
      if (!bucket.pixelVotes[y][x].isFinalized) {
        return false;
      }
    }
  }
  return true;
}

export function generateBucketId(imageData: SimpleImageData): string {
  const width = imageData.width;
  const height = imageData.height;
  const corners = [
    getRGBAt(imageData, 0, 0),
    getRGBAt(imageData, width - 1, 0),
    getRGBAt(imageData, 0, height - 1),
    getRGBAt(imageData, width - 1, height - 1)
  ];
  return corners.map((rgb) => `${rgb.r},${rgb.g},${rgb.b}`).join('|');
}

