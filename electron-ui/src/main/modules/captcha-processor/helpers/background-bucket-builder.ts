import * as fs from 'fs';
import { CaptchaImage, BackgroundImageBucket } from '../types';
import { BackgroundImageProcessor } from '../image-processor';

export async function buildBucketsFromCaptchaImages(
  images: CaptchaImage[],
  backgroundProcessor: BackgroundImageProcessor
): Promise<Map<string, BackgroundImageBucket>> {
  for (const image of images) {
    if (!image.localPath) {
      continue;
    }
    const imageBuffer = fs.readFileSync(image.localPath);
    await backgroundProcessor.processImage(imageBuffer);
  }

  return backgroundProcessor.getState().buckets;
}

