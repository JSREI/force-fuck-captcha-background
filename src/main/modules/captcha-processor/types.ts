/**
 * 验证码处理模块类型定义
 */

// 请求配置类型
export interface CaptchaRequestConfig {
  // 请求URL
  url: string;
  // 请求方法
  method: string;
  // 请求头
  headers?: Record<string, string>;
  // 请求体类型
  bodyType?: 'raw' | 'x-www-form-urlencoded' | 'form-data';
  // 请求体内容
  body?: any;
  // 请求次数
  requestCount: number;
  // 并发数
  concurrency: number;
  // 请求间隔 (ms)
  interval: number;
  // 验证码图片URL提取规则
  captchaUrlExtractor: {
    // 提取方式：响应json中的字段，或者正则表达式
    type: 'json-path' | 'regex';
    // json路径或正则表达式
    pattern: string;
    // 如果是正则，可能需要分组索引
    groupIndex?: number;
    // 基础URL（如果提取出的是相对路径，需要与基础URL拼接）
    baseUrl?: string;
  };
}

// 验证码图片信息
export interface CaptchaImage {
  // 图片ID（用于唯一标识，基于四角像素）
  id: string;
  // 请求索引（第几次请求）
  requestIndex: number;
  // 图片URL
  url: string;
  // 图片数据（base64或buffer）
  data?: string | Buffer;
  // 图片本地保存路径
  localPath?: string;
  // 图片的四个角落像素点RGB值
  cornerPixels?: {
    topLeft: number[];     // [R,G,B]
    topRight: number[];    // [R,G,B]
    bottomLeft: number[];  // [R,G,B]
    bottomRight: number[]; // [R,G,B]
  };
}

// 验证码分组
export interface CaptchaGroup {
  // 分组ID (基于四角像素)
  id: string;
  // 该分组包含的图片ID列表
  imageIds: string[];
  // 该分组的图片数量
  count: number;
  // 四个角落的像素投票结果（预留字段，暂不实现）
  pixelVotes?: {
    topLeft: Record<string, number>;     // 像素值到票数的映射
    topRight: Record<string, number>;    // 像素值到票数的映射
    bottomLeft: Record<string, number>;  // 像素值到票数的映射
    bottomRight: Record<string, number>; // 像素值到票数的映射
  };
  // 四个角落的众数像素（预留字段，暂不实现）
  consensusPixels?: {
    topLeft: number[];     // [R,G,B]
    topRight: number[];    // [R,G,B]
    bottomLeft: number[];  // [R,G,B]
    bottomRight: number[]; // [R,G,B]
  };
}

// 处理状态
export interface ProcessingStatus {
  // 当前状态
  status: 'idle' | 'processing' | 'completed' | 'failed';
  // 总请求数
  totalRequests: number;
  // 已完成请求数
  completedRequests: number;
  // 成功请求数
  successRequests: number;
  // 失败请求数
  failedRequests: number;
  // 已下载图片数
  downloadedImages: number;
  // 分组数
  groupCount: number;
  // 错误信息
  error?: string;
} 