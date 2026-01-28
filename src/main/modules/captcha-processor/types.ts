/**
 * 验证码处理模块类型定义
 */

/**
 * 代理配置
 */
export interface ProxyConfig {
  // 是否使用系统代理（从环境变量获取）
  useSystemProxy?: boolean;
  // 手动指定的代理URL，如：http://127.0.0.1:8080
  proxyUrl?: string;
}

/**
 * 验证码请求配置
 * 用于配置如何请求和提取验证码图片
 * 
 * 使用示例：
 * ```typescript
 * const config: CaptchaRequestConfig = {
 *   url: 'https://example.com/captcha',
 *   method: 'POST',
 *   headers: {
 *     'User-Agent': 'Mozilla/5.0',
 *     'Content-Type': 'application/json'
 *   },
 *   bodyType: 'raw',
 *   body: JSON.stringify({ token: 'xxx' }),
 *   requestCount: 100,    // 请求100次
 *   concurrency: 5,       // 同时发送5个请求
 *   interval: 1000,       // 每次请求间隔1秒
 *   captchaUrlExtractor: {
 *     type: 'json-path',
 *     pattern: 'data.captchaUrl',  // 从响应的data.captchaUrl字段提取
 *     baseUrl: 'https://example.com'
 *   },
 *   proxy: {
 *     useSystemProxy: true,  // 使用系统代理
 *     // 或者手动指定代理
 *     // proxyUrl: 'http://127.0.0.1:8080'
 *   }
 * };
 * ```
 */
export interface CaptchaRequestConfig {
  // 请求URL
  url: string;
  // 请求方法：GET、POST等
  method: string;
  // 请求头，可选
  // 示例：{ 'User-Agent': 'xxx', 'Cookie': 'xxx' }
  headers?: Record<string, string>;
  // 请求体类型
  // - raw: 原始数据，如JSON字符串
  // - x-www-form-urlencoded: 表单数据，如a=1&b=2
  // - form-data: 多部分表单数据，用于上传文件等
  bodyType?: 'raw' | 'x-www-form-urlencoded' | 'form-data';
  // 请求体内容
  // 根据bodyType的不同，格式也不同：
  // - raw: 任意数据
  // - x-www-form-urlencoded: { key: string, value: string }[]
  // - form-data: { key: string, value: string | Buffer }[]
  body?: any;
  // 总共需要请求多少次
  requestCount: number;
  // 同时并发的请求数量
  concurrency: number;
  // 请求间隔（毫秒）
  interval: number;
  // 验证码图片URL提取规则
  captchaUrlExtractor: {
    // 提取方式：
    // - json-path: 从JSON响应中按路径提取，如 "data.url"
    // - regex: 使用正则表达式提取，如 "src=\"(.*?)\""
    type: 'json-path' | 'regex';
    // 提取模式：
    // - json-path时：data.image.url 这样的路径
    // - regex时：匹配图片URL的正则表达式
    pattern: string;
    // 正则表达式的分组索引，仅type为regex时有效
    // 示例：如果pattern是 "src=\"(.*?)\"" 则groupIndex为1可以提取括号中的内容
    groupIndex?: number;
    // 基础URL，用于将相对路径转为完整URL
    // 如果不提供，则使用请求URL作为基础URL
    // 示例：baseUrl为"https://example.com" 时
    // "/images/1.jpg" => "https://example.com/images/1.jpg"
    baseUrl?: string;
  };
  // 代理配置
  proxy?: ProxyConfig;
}

/**
 * 验证码图片信息
 * 表示一个验证码图片的所有相关信息
 * 
 * 示例：
 * ```typescript
 * const image: CaptchaImage = {
 *   id: "255_255_255_0_0_0",  // 基于四角像素的唯一ID
 *   requestIndex: 0,           // 第一次请求得到的图片
 *   url: "https://example.com/captcha/123.jpg",
 *   data: <Buffer ...>,       // 图片二进制数据
 *   localPath: "/path/to/local/captcha_123.jpg",
 *   cornerPixels: {
 *     topLeft: [255, 255, 255],     // 左上角像素RGB值
 *     topRight: [0, 0, 0],          // 右上角像素RGB值
 *     bottomLeft: [128, 128, 128],  // 左下角像素RGB值
 *     bottomRight: [200, 200, 200]  // 右下角像素RGB值
 *   }
 * };
 * ```
 */
export interface CaptchaImage {
  // 图片ID，基于四个角落的像素值生成的唯一标识
  id: string;
  // 请求索引，标识是第几次请求获得的图片
  requestIndex: number;
  // 图片的原始URL
  url: string;
  // 图片数据，可以是base64字符串或二进制buffer
  data?: string | Buffer;
  // 图片保存在本地的路径
  localPath?: string;
  // 图片四个角落的像素RGB值
  cornerPixels?: {
    topLeft: number[];     // [R,G,B] 如 [255,255,255]
    topRight: number[];    // [R,G,B]
    bottomLeft: number[];  // [R,G,B]
    bottomRight: number[]; // [R,G,B]
  };
}

/**
 * 处理状态
 * 用于跟踪验证码处理的整体进度
 * 
 * 示例：
 * ```typescript
 * const status: ProcessingStatus = {
 *   status: 'processing',           // 正在处理中
 *   totalRequests: 100,            // 总共要处理100个请求
 *   completedRequests: 60,         // 已完成60个请求
 *   successRequests: 58,           // 成功58个
 *   failedRequests: 2,             // 失败2个
 *   downloadedImages: 58,          // 下载了58张图片
 *   bucketCount: 3,                // 有3个不同的背景图片
 *   error: null                    // 没有错误
 * };
 * ```
 */
export interface ProcessingStatus {
  // 当前状态
  // - idle: 空闲，未开始处理
  // - processing: 正在处理中
  // - completed: 处理完成
  // - failed: 处理失败
  status: 'idle' | 'processing' | 'completed' | 'failed';
  // 总共需要处理的请求数量
  totalRequests: number;
  // 已经完成的请求数量（包括成功和失败的）
  completedRequests: number;
  // 成功的请求数量
  successRequests: number;
  // 失败的请求数量
  failedRequests: number;
  // 已下载的验证码图片数量
  downloadedImages: number;
  // 桶的数量（具有相同四角像素的图片集合）
  bucketCount: number;
  // 错误信息，如果有的话
  error?: string;
}

/**
 * 像素投票状态
 * 用于记录每个像素位置的投票情况和最终确定的颜色
 * 
 * 工作原理：
 * 1. 每个像素位置都维护一个投票状态
 * 2. 不同图片对应位置的像素颜色会进行投票
 * 3. 当某个颜色的票数达到阈值，就确定为最终颜色
 * 
 * 示例：
 * ```typescript
 * const pixelState: PixelVoteState = {
 *   x: 100,
 *   y: 200,
 *   votes: new Map([
 *     ["255,255,255", 2],  // 白色获得2票
 *     ["0,0,0", 1],        // 黑色获得1票
 *     ["128,128,128", 3]   // 灰色获得3票，达到阈值
 *   ]),
 *   isFinalized: true,     // 已确定最终颜色
 *   finalRGB: { r: 128, g: 128, b: 128 }  // 最终确定为灰色
 * };
 * ```
 */
export interface PixelVoteState {
  // 像素在图片中的X坐标
  x: number;
  // 像素在图片中的Y坐标
  y: number;
  // 投票状态映射
  // key: "r,g,b"格式的RGB字符串，如"255,255,255"
  // value: 该颜色获得的票数
  votes: Map<string, number>;
  // 是否已经确定了最终的颜色
  // 当某个颜色的票数达到阈值时为true
  isFinalized: boolean;
  // 最终确定的RGB值
  // 当isFinalized为true时才有值
  finalRGB?: {
    r: number;  // 红色分量 (0-255)
    g: number;  // 绿色分量 (0-255)
    b: number;  // 蓝色分量 (0-255)
  };
}

/**
 * 背景图片桶
 * 用于存储和处理具有相同四角像素的图片集合
 */
export interface BackgroundImageBucket {
  // 桶ID，由四个角落的像素RGB值组合而成
  id: string;
  // 该桶中已处理的图片数量
  imageCount: number;
  // 图片宽度（像素）
  width: number;
  // 图片高度（像素）
  height: number;
  // 每个像素位置的投票状态
  pixelVotes: PixelVoteState[][];
  // 是否已完成投票
  isCompleted: boolean;
  // 最终图片在硬盘上的保存路径
  finalImagePath?: string;
  // 最终图片的二进制数据
  finalImage?: Buffer;
  // 每个像素位置的投票记录
  votes: Map<string, Map<string, number>>;
}

/**
 * 背景图片处理器状态
 * 用于跟踪整个处理过程的进度和状态
 * 
 * 示例：
 * ```typescript
 * const state: BackgroundProcessorState = {
 *   // 所有的背景图片桶
 *   buckets: new Map([
 *     ["bucket1_id", bucket1],
 *     ["bucket2_id", bucket2]
 *   ]),
 *   consecutiveNoNewBucketCount: 5,  // 连续5次没有新桶
 *   isCompleted: false,              // 处理还未完成
 *   startTime: 1647123456789,        // 开始处理的时间戳
 *   processedImageCount: 100         // 已处理100张图片
 * };
 * ```
 */
export interface BackgroundProcessorState {
  // 所有的背景图片桶，key为桶ID
  buckets: Map<string, BackgroundImageBucket>;
  // 连续没有新桶的次数
  // 用于判断是否应该结束处理
  // 当这个值达到阈值时，认为已经收集到了所有可能的背景图片
  consecutiveNoNewBucketCount: number;
  // 是否已完成所有处理
  isCompleted: boolean;
  // 处理开始的时间戳
  startTime: number;
  // 已处理的图片总数
  processedImageCount: number;
}

/**
 * 简化的图像数据接口
 * 用于在不同模块间传递图像数据
 */
export interface SimpleImageData {
  data: Uint8ClampedArray;
  width: number;
  height: number;
} 