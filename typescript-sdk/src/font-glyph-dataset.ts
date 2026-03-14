import fs from 'fs';
import path from 'path';
import JSZip from 'jszip';
import {
  BatchGlyphExtractItem,
  BatchGlyphExtractResult,
  GlyphDatasetExportResult,
} from './types';

interface NpyArray {
  dtype: string;
  shape: number[];
  data: Buffer;
}

function ensureParent(targetPath: string) {
  const dir = path.dirname(targetPath);
  fs.mkdirSync(dir, { recursive: true });
}

function shapeToString(shape: number[]): string {
  if (shape.length === 1) {
    return `(${shape[0]},)`;
  }
  return `(${shape.join(', ')})`;
}

function encodeNpy(array: NpyArray): Buffer {
  const magic = Buffer.from([0x93, 0x4e, 0x55, 0x4d, 0x50, 0x59]);
  const version = Buffer.from([0x01, 0x00]);
  const headerDict = `{'descr': '${array.dtype}', 'fortran_order': False, 'shape': ${shapeToString(array.shape)}, }`;
  let header = Buffer.from(headerDict, 'ascii');
  const padLen = 16 - ((magic.length + version.length + 2 + header.length + 1) % 16);
  header = Buffer.concat([header, Buffer.from(' '.repeat(padLen) + '\n', 'ascii')]);
  const headerLen = Buffer.alloc(2);
  headerLen.writeUInt16LE(header.length, 0);
  return Buffer.concat([magic, version, headerLen, header, array.data]);
}

function toUint8Array(rows: number[][]): Uint8Array {
  const flat = rows.flat();
  return Uint8Array.from(flat);
}

function toInt32Array(rows: number[][]): Int32Array {
  const flat = rows.flat();
  return Int32Array.from(flat);
}

function toFloat32Array(values: number[]): Float32Array {
  return Float32Array.from(values);
}

function toStringArray(values: string[]): { buffer: Buffer; itemSize: number } {
  const maxLen = values.reduce((max, value) => Math.max(max, Buffer.byteLength(value, 'utf8')), 1);
  const buffer = Buffer.alloc(maxLen * values.length, 0);
  values.forEach((value, index) => {
    buffer.write(value, index * maxLen, maxLen, 'utf8');
  });
  return { buffer, itemSize: maxLen };
}

function collectRows(items: BatchGlyphExtractItem[]) {
  const rows: Array<Record<string, any>> = [];
  for (const item of items) {
    if (item.status !== 'ok' || !item.result) {
      continue;
    }
    for (const glyph of item.result.glyph_features) {
      rows.push({
        captcha_path: item.captcha_path,
        group_id: item.group_id || '',
        rect_index: glyph.rect_index,
        bbox: glyph.bbox,
        width: glyph.width,
        height: glyph.height,
        color: glyph.color,
        pixel_count: glyph.pixel_count,
        density: glyph.density,
        vector_1d: glyph.vector_1d,
      });
    }
  }
  return rows;
}

export async function exportGlyphDatasetNpz(
  batchResult: BatchGlyphExtractResult,
  outputNpzPath: string,
  outputJsonPath?: string
): Promise<GlyphDatasetExportResult> {
  const rows = collectRows(batchResult.items);
  if (!rows.length) {
    throw new Error('no glyph rows to export');
  }

  const vectors = rows.map((row) => row.vector_1d as number[]);
  const rectIndices = rows.map((row) => [row.rect_index as number]);
  const bbox = rows.map((row) => row.bbox as number[]);
  const widths = rows.map((row) => [row.width as number]);
  const heights = rows.map((row) => [row.height as number]);
  const colors = rows.map((row) => row.color as number[]);
  const pixelCounts = rows.map((row) => [row.pixel_count as number]);
  const densities = rows.map((row) => row.density as number);
  const captchaPaths = rows.map((row) => row.captcha_path as string);
  const groupIds = rows.map((row) => row.group_id as string);

  const vectorLength = vectors[0].length;

  const arrays: Record<string, NpyArray> = {
    X: {
      dtype: '<u1',
      shape: [vectors.length, vectorLength],
      data: Buffer.from(toUint8Array(vectors).buffer),
    },
    rect_index: {
      dtype: '<i4',
      shape: [rectIndices.length, 1],
      data: Buffer.from(toInt32Array(rectIndices).buffer),
    },
    bbox: {
      dtype: '<i4',
      shape: [bbox.length, 4],
      data: Buffer.from(toInt32Array(bbox).buffer),
    },
    width: {
      dtype: '<i4',
      shape: [widths.length, 1],
      data: Buffer.from(toInt32Array(widths).buffer),
    },
    height: {
      dtype: '<i4',
      shape: [heights.length, 1],
      data: Buffer.from(toInt32Array(heights).buffer),
    },
    color: {
      dtype: '<u1',
      shape: [colors.length, 3],
      data: Buffer.from(toUint8Array(colors).buffer),
    },
    pixel_count: {
      dtype: '<i4',
      shape: [pixelCounts.length, 1],
      data: Buffer.from(toInt32Array(pixelCounts).buffer),
    },
    density: {
      dtype: '<f4',
      shape: [densities.length],
      data: Buffer.from(toFloat32Array(densities).buffer),
    },
  };

  const captchaStr = toStringArray(captchaPaths);
  const groupStr = toStringArray(groupIds);
  arrays.captcha_path = {
    dtype: `|S${captchaStr.itemSize}`,
    shape: [captchaPaths.length],
    data: captchaStr.buffer,
  };
  arrays.group_id = {
    dtype: `|S${groupStr.itemSize}`,
    shape: [groupIds.length],
    data: groupStr.buffer,
  };

  const zip = new JSZip();
  for (const [name, array] of Object.entries(arrays)) {
    zip.file(`${name}.npy`, encodeNpy(array));
  }

  const zipBuffer = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
  const target = path.resolve(outputNpzPath);
  ensureParent(target);
  await fs.promises.writeFile(target, zipBuffer);

  let normalizedJson: string | null = null;
  if (outputJsonPath) {
    const jsonTarget = path.resolve(outputJsonPath);
    ensureParent(jsonTarget);
    const payload = {
      input_dir: batchResult.input_dir,
      total_files: batchResult.total_files,
      processed_files: batchResult.processed_files,
      success_count: batchResult.success_count,
      error_count: batchResult.error_count,
      target_size: batchResult.target_size,
      glyph_sample_count: rows.length,
      items: batchResult.items,
    };
    await fs.promises.writeFile(jsonTarget, JSON.stringify(payload, null, 2), 'utf8');
    normalizedJson = jsonTarget;
  }

  return {
    input_dir: batchResult.input_dir,
    total_files: batchResult.total_files,
    processed_files: batchResult.processed_files,
    success_count: batchResult.success_count,
    error_count: batchResult.error_count,
    glyph_sample_count: rows.length,
    target_size: batchResult.target_size,
    output_npz_path: target,
    output_json_path: normalizedJson,
  };
}
