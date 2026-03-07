import { ParsedCurlResult } from './types';

export const parseCurlCommand = (curlCommand: string): ParsedCurlResult => {
  const result: ParsedCurlResult = {
    method: 'GET',
    url: '',
    headers: [],
    params: [],
    bodyType: 'none',
    bodyContent: '',
    formData: []
  };

  const urlMatch = curlCommand.match(/curl\s+(?:--location\s+)?['"]?(https?:\/\/[^'"\s]+)['"]?/) ||
    curlCommand.match(/curl\s+(?:--location\s+)?['"]?([^'"\s]+)['"]?/);
  if (!urlMatch?.[1]) {
    throw new Error('无法从curl命令中提取URL，请检查命令格式');
  }
  result.url = urlMatch[1];

  let methodExtracted = false;
  if (curlCommand.includes('-X') || curlCommand.includes('--request')) {
    const methodMatch = curlCommand.match(/-X\s+['"]?([^'"\s]+)['"]?/) ||
      curlCommand.match(/--request\s+['"]?([^'"\s]+)['"]?/);
    if (methodMatch?.[1]) {
      result.method = methodMatch[1].toUpperCase();
      methodExtracted = true;
    }
  }
  if (!methodExtracted && (curlCommand.includes('-d') || curlCommand.includes('--data'))) {
    result.method = 'POST';
  }

  result.headers = extractHeaders(curlCommand);
  applyBody(result, curlCommand);
  applyUrlParams(result);
  return result;
};

function extractHeaders(curlCommand: string): { key: string; value: string }[] {
  const headers: { key: string; value: string }[] = [];

  const quotedRegex = /-H\s+['"]([^:]+):\s*([^'"]+)['"]|--header\s+['"]([^:]+):\s*([^'"]+)['"]/g;
  let match: RegExpExecArray | null;
  while ((match = quotedRegex.exec(curlCommand)) !== null) {
    const key = match[1] || match[3];
    const value = match[2] || match[4];
    if (key && value) {
      headers.push({ key: key.trim(), value: value.trim() });
    }
  }

  const noQuoteRegex = /-H\s+([^:\s]+):\s*([^\s]+)|--header\s+([^:\s]+):\s*([^\s]+)/g;
  while ((match = noQuoteRegex.exec(curlCommand)) !== null) {
    const key = match[1] || match[3];
    const value = match[2] || match[4];
    if (key && value && !headers.some((h) => h.key === key.trim())) {
      headers.push({ key: key.trim(), value: value.trim() });
    }
  }

  return headers;
}

function applyBody(result: ParsedCurlResult, curlCommand: string): void {
  const dataMatch = curlCommand.match(/-d\s+['"](.+?)['"]|--data\s+['"](.+?)['"]/);
  const noQuoteDataMatch = curlCommand.match(/-d\s+([^\s'"]+)|--data\s+([^\s'"]+)/);
  const dataRawMatch = curlCommand.match(/--data-raw\s+['"](.+?)['"]/);

  const bodyData = dataMatch?.[1] || dataMatch?.[2] || dataRawMatch?.[1] || noQuoteDataMatch?.[1] || noQuoteDataMatch?.[2];
  if (!bodyData) {
    return;
  }

  result.bodyContent = bodyData;
  const contentType = result.headers.find((h) => h.key.toLowerCase() === 'content-type')?.value.toLowerCase() || '';

  if (contentType.includes('json')) {
    result.bodyType = 'raw';
    try {
      result.bodyContent = JSON.stringify(JSON.parse(bodyData), null, 2);
    } catch {
      // keep original body
    }
    return;
  }

  if (contentType.includes('form-urlencoded')) {
    result.bodyType = 'x-www-form-urlencoded';
    try {
      result.formData = bodyData.split('&').map((item) => {
        const [key, value] = item.split('=').map(decodeURIComponent);
        return { key: key || '', value: value || '', type: 'text' as const };
      });
    } catch {
      result.bodyType = 'raw';
    }
    return;
  }

  if (contentType.includes('form-data')) {
    result.bodyType = 'form-data';
    result.formData = [{ key: '', value: '', type: 'text' }];
    return;
  }

  result.bodyType = 'raw';
}

function applyUrlParams(result: ParsedCurlResult): void {
  try {
    const urlObj = new URL(result.url.startsWith('http') ? result.url : `http://${result.url}`);
    if (!urlObj.search) {
      return;
    }
    const newParams: { key: string; value: string }[] = [];
    urlObj.searchParams.forEach((value, key) => {
      newParams.push({ key, value });
    });
    if (newParams.length > 0) {
      result.params = newParams;
      urlObj.search = '';
      result.url = urlObj.toString().replace(/^http:\/\//, '');
    }
  } catch {
    // ignore url parse errors
  }
}

