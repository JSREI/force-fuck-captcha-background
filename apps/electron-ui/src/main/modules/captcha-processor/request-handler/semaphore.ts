/**
 * 简单的信号量实现，用于控制并发
 * 
 * 使用示例：
 * ```typescript
 * const semaphore = new Semaphore(3); // 最多允许3个并发
 * 
 * async function doWork() {
 *   await semaphore.acquire();  // 获取一个许可
 *   try {
 *     // 执行需要控制并发的操作
 *     await someOperation();
 *   } finally {
 *     semaphore.release();  // 释放许可
 *   }
 * }
 * ```
 */
export class Semaphore {
  private permits: number;
  private waiting: Array<() => void> = [];

  /**
   * 构造函数
   * @param permits 最大并发数
   */
  constructor(permits: number) {
    this.permits = permits;
  }

  /**
   * 获取一个许可
   * 如果当前没有可用许可，则等待
   */
  public async acquire(): Promise<void> {
    if (this.permits > 0) {
      this.permits--;
      return Promise.resolve();
    }

    return new Promise<void>((resolve) => {
      this.waiting.push(resolve);
    });
  }

  /**
   * 释放一个许可
   * 如果有等待的任务，则唤醒一个
   */
  public release(): void {
    if (this.waiting.length > 0) {
      const resolve = this.waiting.shift()!;
      resolve();
    } else {
      this.permits++;
    }
  }
} 