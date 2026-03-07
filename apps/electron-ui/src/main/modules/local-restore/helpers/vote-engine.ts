import path from 'path';
import sharp from 'sharp';
import { BucketSummary } from '../../../../shared/local-restore-types';
import { BucketState } from './types';

function getRgb24(data: Buffer, channels: number, width: number, x: number, y: number): number {
  const base = (y * width + x) * channels;
  return (data[base] << 16) | (data[base + 1] << 8) | data[base + 2];
}

function buildBucketId(data: Buffer, width: number, height: number, channels: number): string {
  const lt = getRgb24(data, channels, width, 0, 0);
  const rt = getRgb24(data, channels, width, width - 1, 0);
  const lb = getRgb24(data, channels, width, 0, height - 1);
  const rb = getRgb24(data, channels, width, width - 1, height - 1);
  return `${width}x${height}|${lt}|${rt}|${lb}|${rb}`;
}

export async function processImageIntoBuckets(
  filePath: string,
  buckets: Map<string, BucketState>
): Promise<void> {
  const image = sharp(filePath, { failOnError: true }).ensureAlpha();
  const { data, info } = await image.raw().toBuffer({ resolveWithObject: true });
  const width = info.width;
  const height = info.height;
  const channels = info.channels;

  if (!width || !height || !channels || channels < 3) {
    throw new Error('invalid_image_dimensions');
  }

  const bucketId = buildBucketId(data, width, height, channels);
  let bucket = buckets.get(bucketId);
  if (!bucket) {
    bucket = {
      id: bucketId,
      width,
      height,
      imageCount: 0,
      pixelVotes: new Map()
    };
    buckets.set(bucketId, bucket);
  }

  bucket.imageCount += 1;
  const pixelCount = width * height;
  for (let pixelIndex = 0; pixelIndex < pixelCount; pixelIndex += 1) {
    const base = pixelIndex * channels;
    const rgb24 = (data[base] << 16) | (data[base + 1] << 8) | data[base + 2];
    let colorVotes = bucket.pixelVotes.get(pixelIndex);
    if (!colorVotes) {
      colorVotes = new Map();
      bucket.pixelVotes.set(pixelIndex, colorVotes);
    }
    colorVotes.set(rgb24, (colorVotes.get(rgb24) || 0) + 1);
  }
}

export async function generateBucketOutputs(
  outputDir: string,
  buckets: Map<string, BucketState>
): Promise<BucketSummary[]> {
  const summaries: BucketSummary[] = [];
  const bucketEntries = Array.from(buckets.values());

  for (let index = 0; index < bucketEntries.length; index += 1) {
    const bucket = bucketEntries[index];
    const rgba = new Uint8ClampedArray(bucket.width * bucket.height * 4);
    const pixelCount = bucket.width * bucket.height;

    for (let pixelIndex = 0; pixelIndex < pixelCount; pixelIndex += 1) {
      const colorVotes = bucket.pixelVotes.get(pixelIndex);
      if (!colorVotes || colorVotes.size === 0) {
        continue;
      }

      let bestVotes = -1;
      let bestRgb24 = Number.MAX_SAFE_INTEGER;
      for (const [rgb24, votes] of colorVotes.entries()) {
        if (votes > bestVotes || (votes === bestVotes && rgb24 < bestRgb24)) {
          bestVotes = votes;
          bestRgb24 = rgb24;
        }
      }

      const base = pixelIndex * 4;
      rgba[base] = (bestRgb24 >> 16) & 0xff;
      rgba[base + 1] = (bestRgb24 >> 8) & 0xff;
      rgba[base + 2] = bestRgb24 & 0xff;
      rgba[base + 3] = 255;
    }

    const safeBucketId = bucket.id.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 120);
    const outputFile = `background_${index + 1}_${safeBucketId}_${bucket.imageCount}.png`;
    const outputPath = path.join(outputDir, outputFile);
    await sharp(Buffer.from(rgba), {
      raw: { width: bucket.width, height: bucket.height, channels: 4 }
    }).png().toFile(outputPath);

    bucket.finalImagePath = outputPath;
    summaries.push({
      id: bucket.id,
      width: bucket.width,
      height: bucket.height,
      imageCount: bucket.imageCount,
      outputFile,
      outputPath
    });
  }

  return summaries;
}

