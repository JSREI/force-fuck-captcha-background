export interface ProcessingStatus {
  status: 'idle' | 'processing' | 'completed' | 'failed';
  totalRequests: number;
  completedRequests: number;
  successRequests: number;
  failedRequests: number;
  downloadedImages: number;
  bucketCount: number;
  error?: string;
}

