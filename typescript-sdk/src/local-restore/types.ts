export interface BucketState {
  id: string;
  width: number;
  height: number;
  imageCount: number;
  pixelVotes: Map<number, Map<number, number>>;
  finalImagePath?: string;
}
