import { BackgroundImageBucket, BackgroundProcessorState, SimpleImageData } from '../types';
import { logger } from '../../logger';
import {
  checkBucketCompletion,
  createBucket,
  generateBucketId,
  MAX_BUCKETS,
  MAX_NO_NEW_BUCKET,
  processPixels
} from './bucket-ops';

export class BucketManager {
  private buckets: Map<string, BackgroundImageBucket>;
  private consecutiveNoNewBucketCount: number;
  private processedImageCount: number;
  private startTime: number;

  constructor() {
    this.buckets = new Map();
    this.consecutiveNoNewBucketCount = 0;
    this.processedImageCount = 0;
    this.startTime = Date.now();
  }

  public static checkOverallCompletion(state: BackgroundProcessorState): boolean {
    if (state.buckets.size >= MAX_BUCKETS) {
      logger.info('达到最大桶数量，处理完成');
      return true;
    }
    if (state.consecutiveNoNewBucketCount >= MAX_NO_NEW_BUCKET) {
      logger.info(`连续 ${MAX_NO_NEW_BUCKET} 次没有新桶，处理完成`);
      return true;
    }
    for (const bucket of state.buckets.values()) {
      if (!bucket.isCompleted) {
        return false;
      }
    }
    const duration = (Date.now() - state.startTime) / 1000;
    logger.info(`所有桶处理完成，共处理 ${state.processedImageCount} 张图片，用时 ${duration.toFixed(2)} 秒`);
    return true;
  }

  public async processImageData(imageData: SimpleImageData): Promise<void> {
    const bucketId = generateBucketId(imageData);

    let bucket = this.buckets.get(bucketId);
    if (!bucket) {
      logger.info(`发现新的背景图片桶: ${bucketId}`);
      this.consecutiveNoNewBucketCount = 0;
      bucket = createBucket(bucketId, imageData.width, imageData.height);
      this.buckets.set(bucketId, bucket);
    } else {
      this.consecutiveNoNewBucketCount++;
    }

    processPixels(bucket, imageData);
    bucket.imageCount++;
    this.processedImageCount++;

    if (!bucket.isCompleted && checkBucketCompletion(bucket)) {
      bucket.isCompleted = true;
      logger.info(`背景图片桶 ${bucketId} 完成处理，共处理 ${bucket.imageCount} 张图片`);
    }
  }

  public getBuckets(): Map<string, BackgroundImageBucket> {
    return this.buckets;
  }

  public getCompletedBuckets(): BackgroundImageBucket[] {
    return Array.from(this.buckets.values()).filter((bucket) => bucket.isCompleted);
  }
}

