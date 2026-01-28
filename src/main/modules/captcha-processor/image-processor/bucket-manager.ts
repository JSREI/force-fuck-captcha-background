import { BackgroundImageBucket, PixelVoteState, BackgroundProcessorState, SimpleImageData } from '../types';
import { logger } from '../../logger';

/**
 * 桶管理器
 * 负责管理背景图片桶的创建、投票和完成状态检查
 */
export class BucketManager {
  // 投票阈值：某个颜色获得这么多票就会被确定为最终颜色
  private static readonly VOTE_THRESHOLD = 3;
  // 最大桶数量：超过这个数量就停止处理
  private static readonly MAX_BUCKETS = 10000;
  // 最大连续无新桶次数：连续这么多次没有新桶就停止处理
  private static readonly MAX_NO_NEW_BUCKET = 10;

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

  /**
   * 创建新的背景图片桶
   */
  public static createBucket(id: string, width: number, height: number): BackgroundImageBucket {
    // 创建二维数组并初始化每个像素的投票状态
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

  /**
   * 处理图片像素
   * 对每个像素位置进行投票
   */
  public static processPixels(bucket: BackgroundImageBucket, imageData: SimpleImageData): void {
    const width = imageData.width;
    const height = imageData.height;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const rgb = this.getRGBAt(imageData, x, y);
        const pixelState = bucket.pixelVotes[y][x];

        // 如果像素还未确定最终值，则进行投票
        if (!pixelState.isFinalized) {
          const rgbKey = `${rgb.r},${rgb.g},${rgb.b}`;
          const currentVotes = pixelState.votes.get(rgbKey) || 0;
          pixelState.votes.set(rgbKey, currentVotes + 1);

          // 检查是否达到投票阈值
          if (currentVotes + 1 >= this.VOTE_THRESHOLD) {
            pixelState.isFinalized = true;
            pixelState.finalRGB = rgb;
          }
        }
      }
    }
  }

  /**
   * 获取指定坐标的RGB值
   */
  private static getRGBAt(imageData: SimpleImageData, x: number, y: number) {
    const index = (y * imageData.width + x) * 4;
    return {
      r: imageData.data[index],
      g: imageData.data[index + 1],
      b: imageData.data[index + 2]
    };
  }

  /**
   * 检查桶是否完成投票
   */
  public static checkBucketCompletion(bucket: BackgroundImageBucket): boolean {
    for (let y = 0; y < bucket.height; y++) {
      for (let x = 0; x < bucket.width; x++) {
        if (!bucket.pixelVotes[y][x].isFinalized) {
          return false;
        }
      }
    }
    return true;
  }

  /**
   * 检查整体处理是否完成
   */
  public static checkOverallCompletion(state: BackgroundProcessorState): boolean {
    // 检查是否达到最大桶数量
    if (state.buckets.size >= this.MAX_BUCKETS) {
      logger.info('达到最大桶数量，处理完成');
      return true;
    }

    // 检查连续无新桶次数
    if (state.consecutiveNoNewBucketCount >= this.MAX_NO_NEW_BUCKET) {
      logger.info(`连续 ${this.MAX_NO_NEW_BUCKET} 次没有新桶，处理完成`);
      return true;
    }

    // 检查所有桶是否都完成
    for (const bucket of state.buckets.values()) {
      if (!bucket.isCompleted) {
        return false;
      }
    }

    const duration = (Date.now() - state.startTime) / 1000;
    logger.info(`所有桶处理完成，共处理 ${state.processedImageCount} 张图片，用时 ${duration.toFixed(2)} 秒`);
    return true;
  }

  /**
   * 生成桶ID
   */
  public static generateBucketId(imageData: SimpleImageData): string {
    const width = imageData.width;
    const height = imageData.height;
    const corners = [
      this.getRGBAt(imageData, 0, 0),                    // 左上角
      this.getRGBAt(imageData, width - 1, 0),           // 右上角
      this.getRGBAt(imageData, 0, height - 1),          // 左下角
      this.getRGBAt(imageData, width - 1, height - 1)   // 右下角
    ];
    return corners.map(rgb => `${rgb.r},${rgb.g},${rgb.b}`).join('|');
  }

  /**
   * 处理图片数据
   * @param imageData 图片数据
   */
  public async processImageData(imageData: SimpleImageData): Promise<void> {
    // 生成桶ID（基于四个角落的像素值）
    const bucketId = BucketManager.generateBucketId(imageData);
    
    // 获取或创建桶
    let bucket = this.buckets.get(bucketId);
    if (!bucket) {
      logger.info(`发现新的背景图片桶: ${bucketId}`);
      this.consecutiveNoNewBucketCount = 0;
      bucket = BucketManager.createBucket(bucketId, imageData.width, imageData.height);
      this.buckets.set(bucketId, bucket);
    } else {
      this.consecutiveNoNewBucketCount++;
    }

    // 处理图片像素（进行投票）
    BucketManager.processPixels(bucket, imageData);
    bucket.imageCount++;
    this.processedImageCount++;

    // 检查桶是否完成投票
    if (!bucket.isCompleted && BucketManager.checkBucketCompletion(bucket)) {
      bucket.isCompleted = true;
      logger.info(`背景图片桶 ${bucketId} 完成处理，共处理 ${bucket.imageCount} 张图片`);
    }
  }

  /**
   * 获取所有桶
   */
  public getBuckets(): Map<string, BackgroundImageBucket> {
    return this.buckets;
  }

  /**
   * 获取已完成的桶
   */
  public getCompletedBuckets(): BackgroundImageBucket[] {
    return Array.from(this.buckets.values()).filter(bucket => bucket.isCompleted);
  }
} 