import { toResponsePayload } from './json-utils';

const possibleBgPaths = [
  'data.bg',
  'data.background',
  'data.captchaImg',
  'data.image',
  'data.img',
  'data.bgImage',
  'bg',
  'background',
  'logo',
  'data.logo'
];

const isPureBase64 = (value: string): boolean => /^[A-Za-z0-9+/=]+$/.test(value);

export const normalizeImageUrl = (value: string): { imageUrl: string; isUnknownFormat: boolean } => {
  if (value.startsWith('data:image')) {
    return { imageUrl: value, isUnknownFormat: false };
  }
  if (/^(http|https)/.test(value)) {
    return { imageUrl: value, isUnknownFormat: false };
  }
  if (isPureBase64(value)) {
    return { imageUrl: `data:image/png;base64,${value}`, isUnknownFormat: false };
  }
  return { imageUrl: value, isUnknownFormat: true };
};

export const resolvePath = (data: any, jsonPath: string): any => {
  const segments = jsonPath.split('.');
  let current = data;

  for (const segment of segments) {
    if (segment.includes('[') && segment.includes(']')) {
      const arrayName = segment.substring(0, segment.indexOf('['));
      const indexStr = segment.substring(segment.indexOf('[') + 1, segment.indexOf(']'));
      const index = parseInt(indexStr, 10);

      if (!current?.[arrayName]) {
        throw new Error(`路径 ${arrayName} 不存在`);
      }
      if (!Array.isArray(current[arrayName])) {
        throw new Error(`${arrayName} 不是数组`);
      }
      if (index >= current[arrayName].length) {
        throw new Error(`索引 ${index} 超出数组范围`);
      }
      current = current[arrayName][index];
    } else {
      if (current?.[segment] === undefined) {
        const availableProps = typeof current === 'object' && current !== null
          ? Object.keys(current).join(', ')
          : '无可用属性';
        throw new Error(`路径 "${segment}" 不存在。可用的属性: ${availableProps}`);
      }
      current = current[segment];
    }
  }

  return current;
};

export const extractImageByPath = (responseData: any, jsonPath: string): { imageUrl: string } => {
  const data = toResponsePayload(responseData?.data);
  const value = resolvePath(data, jsonPath);
  if (typeof value !== 'string') {
    if (typeof value === 'object' && value !== null) {
      throw new Error(`提取的值不是字符串，而是一个 ${Array.isArray(value) ? '数组' : '对象'}。请指定更具体的路径。`);
    }
    throw new Error(`提取的值是 ${typeof value} 类型，而不是字符串。`);
  }
  const { imageUrl } = normalizeImageUrl(value);
  return { imageUrl };
};

export const autoExtractBackgroundImage = (
  responseData: any
): { imageUrl: string; jsonPath: string; unknownFormat: boolean } | null => {
  const data = toResponsePayload(responseData?.data);
  for (const path of possibleBgPaths) {
    try {
      const value = resolvePath(data, path);
      if (typeof value !== 'string') {
        continue;
      }
      const normalized = normalizeImageUrl(value);
      return {
        imageUrl: normalized.imageUrl,
        jsonPath: path,
        unknownFormat: normalized.isUnknownFormat
      };
    } catch {
      continue;
    }
  }
  return null;
};

