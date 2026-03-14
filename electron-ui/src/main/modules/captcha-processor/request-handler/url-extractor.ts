import { CaptchaRequestConfig } from '../types';
import { logger } from '../../logger';

/**
 * URL提取工具类
 * 负责从响应中提取验证码图片URL
 */
export class UrlExtractor {
  /**
   * 从响应中提取验证码URL
   * @param response 响应数据
   * @param extractor 提取器配置
   * @param baseUrl 基础URL
   */
  public static extractUrl(
    response: any,
    extractor: CaptchaRequestConfig['captchaUrlExtractor'],
    baseUrl?: string
  ): string | null {
    try {
      const captchaUrl = extractor.type === 'json-path'
        ? this.extractFromJsonPath(response, extractor.pattern)
        : this.extractFromRegex(
            typeof response === 'string' ? response : JSON.stringify(response),
            extractor.pattern,
            extractor.groupIndex || 0
          );

      return this.normalizeUrl(captchaUrl, extractor.baseUrl || baseUrl);
    } catch (error) {
      logger.error('提取验证码URL失败:', error);
      return null;
    }
  }

  /**
   * 规范化URL，将相对路径转换为完整URL
   */
  private static normalizeUrl(url: string | null, baseUrl?: string): string | null {
    if (!url || url.startsWith('http')) return url;

    try {
      return new URL(url, baseUrl).toString();
    } catch (error) {
      logger.error('URL规范化失败:', error);
      return null;
    }
  }

  /**
   * 从JSON路径提取值
   */
  private static extractFromJsonPath(obj: any, path: string): string | null {
    const keys = path.split('.');
    let current = obj;
    
    for (const key of keys) {
      if (current === null || current === undefined) {
        return null;
      }
      current = current[key];
    }
    
    return typeof current === 'string' ? current : null;
  }

  /**
   * 使用正则表达式提取值
   */
  private static extractFromRegex(text: string, pattern: string, groupIndex: number): string | null {
    const regex = new RegExp(pattern);
    const match = text.match(regex);
    return match && match[groupIndex] !== undefined ? match[groupIndex] : null;
  }
} 