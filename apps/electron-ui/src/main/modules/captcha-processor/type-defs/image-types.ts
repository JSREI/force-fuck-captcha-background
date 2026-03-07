export interface CaptchaImage {
  id: string;
  requestIndex: number;
  url: string;
  data?: string | Buffer;
  localPath?: string;
  cornerPixels?: {
    topLeft: number[];
    topRight: number[];
    bottomLeft: number[];
    bottomRight: number[];
  };
}

