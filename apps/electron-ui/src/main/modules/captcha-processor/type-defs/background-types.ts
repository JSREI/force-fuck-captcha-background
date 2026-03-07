export interface PixelVoteState {
  x: number;
  y: number;
  votes: Map<string, number>;
  isFinalized: boolean;
  finalRGB?: {
    r: number;
    g: number;
    b: number;
  };
}

export interface BackgroundImageBucket {
  id: string;
  imageCount: number;
  width: number;
  height: number;
  pixelVotes: PixelVoteState[][];
  isCompleted: boolean;
  finalImagePath?: string;
  finalImage?: Buffer;
  votes: Map<string, Map<string, number>>;
}

export interface BackgroundProcessorState {
  buckets: Map<string, BackgroundImageBucket>;
  consecutiveNoNewBucketCount: number;
  isCompleted: boolean;
  startTime: number;
  processedImageCount: number;
}

export interface SimpleImageData {
  data: Uint8ClampedArray;
  width: number;
  height: number;
}

