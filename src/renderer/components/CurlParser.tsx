import React, { useState, useRef, useEffect } from 'react';
import { Modal, Button, Input, message } from 'antd';
import { BodyType, FormDataItem } from './RequestBodyEditor';
import './CurlParser.css';

const { TextArea } = Input;

interface CurlParserProps {
  visible: boolean;
  onClose: () => void;
  onImport: (data: ParsedCurlResult) => void;
}

export interface ParsedCurlResult {
  method: string;
  url: string;
  headers: { key: string; value: string }[];
  params: { key: string; value: string }[];
  bodyType: BodyType;
  bodyContent: string;
  formData: FormDataItem[];
}

const CurlParser: React.FC<CurlParserProps> = ({ visible, onClose, onImport }) => {
  const [curlCommand, setCurlCommand] = useState<string>('');
  // 创建一个ref用于自动聚焦
  const inputRef = useRef<any>(null);
  
  // 当弹窗显示时自动聚焦到输入框
  useEffect(() => {
    if (visible && inputRef.current) {
      // 使用setTimeout确保Modal完全渲染后再聚焦
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [visible]);

  const handleModalImport = () => {
    if (!curlCommand.trim()) {
      message.error('请输入curl命令');
      return;
    }

    try {
      const result = parseAndSetCurlData(curlCommand);
      onImport(result);
      setCurlCommand(''); // 清空
      onClose(); // 关闭弹窗
    } catch (error) {
      message.error('解析curl命令失败，请检查格式');
      console.error('解析curl命令失败:', error);
    }
  };

  // 解析curl命令
  const parseAndSetCurlData = (curlCommand: string): ParsedCurlResult => {
    console.log('正在解析CURL命令:', curlCommand);
    
    const result: ParsedCurlResult = {
      method: 'GET',
      url: '',
      headers: [],
      params: [],
      bodyType: 'none',
      bodyContent: '',
      formData: []
    };
    
    // 提取URL - 改进正则表达式以匹配更多格式
    const urlMatch = curlCommand.match(/curl\s+(?:--location\s+)?['"]?(https?:\/\/[^'"\s]+)['"]?/) ||
                    curlCommand.match(/curl\s+(?:--location\s+)?['"]?([^'"\s]+)['"]?/);
                    
    if (urlMatch && urlMatch[1]) {
      console.log('提取到URL:', urlMatch[1]);
      result.url = urlMatch[1];
    } else {
      console.error('无法提取URL');
      throw new Error('无法从curl命令中提取URL，请检查命令格式');
    }
    
    // 提取方法 - 支持更多的表示方式
    let methodExtracted = false;
    if (curlCommand.includes('-X') || curlCommand.includes('--request')) {
      const methodMatch = curlCommand.match(/-X\s+['"]?([^'"\s]+)['"]?/) || 
                        curlCommand.match(/--request\s+['"]?([^'"\s]+)['"]?/);
      if (methodMatch && methodMatch[1]) {
        const extractedMethod = methodMatch[1].toUpperCase();
        console.log('提取到请求方法:', extractedMethod);
        result.method = extractedMethod;
        methodExtracted = true;
      }
    }
    
    // 如果没有明确指定方法，但有-d或--data参数，则默认为POST
    if (!methodExtracted && (curlCommand.includes('-d') || curlCommand.includes('--data'))) {
      console.log('未指定请求方法但发现请求体，默认使用POST');
      result.method = 'POST';
    }
    
    // 提取请求头 - 处理单引号、双引号以及无引号的情况
    const newHeaders: {key: string, value: string}[] = [];
    
    // 处理常规的header格式 -H "Key: Value" 或 --header "Key: Value"
    const headerRegex = /-H\s+['"]([^:]+):\s*([^'"]+)['"]|--header\s+['"]([^:]+):\s*([^'"]+)['"]/g;
    let headerMatch;
    while ((headerMatch = headerRegex.exec(curlCommand)) !== null) {
      const key = headerMatch[1] || headerMatch[3];
      const value = headerMatch[2] || headerMatch[4];
      if (key && value) {
        newHeaders.push({ key: key.trim(), value: value.trim() });
        console.log('提取到请求头:', key.trim(), value.trim());
      }
    }
    
    // 处理无引号的header格式 -H Key:Value
    const noQuoteHeaderRegex = /-H\s+([^:\s]+):\s*([^\s]+)|--header\s+([^:\s]+):\s*([^\s]+)/g;
    while ((headerMatch = noQuoteHeaderRegex.exec(curlCommand)) !== null) {
      const key = headerMatch[1] || headerMatch[3];
      const value = headerMatch[2] || headerMatch[4];
      if (key && value) {
        // 避免重复添加已经匹配过的header
        if (!newHeaders.some(h => h.key === key.trim())) {
          newHeaders.push({ key: key.trim(), value: value.trim() });
          console.log('提取到无引号请求头:', key.trim(), value.trim());
        }
      }
    }
    
    result.headers = newHeaders;
    
    // 提取请求体 - 支持多种格式
    // 匹配 -d 'data' 或 --data 'data' 格式
    const dataMatch = curlCommand.match(/-d\s+['"](.+?)['"]|--data\s+['"](.+?)['"]/);
    // 匹配 -d data 或 --data data 格式（无引号）
    const noQuoteDataMatch = curlCommand.match(/-d\s+([^\s'"]+)|--data\s+([^\s'"]+)/);
    // 匹配 --data-raw 'data' 格式（常用于POST JSON）
    const dataRawMatch = curlCommand.match(/--data-raw\s+['"](.+?)['"]/);
    
    let bodyData = null;
    
    if (dataMatch) {
      bodyData = dataMatch[1] || dataMatch[2];
    } else if (dataRawMatch) {
      bodyData = dataRawMatch[1];
    } else if (noQuoteDataMatch) {
      bodyData = noQuoteDataMatch[1] || noQuoteDataMatch[2];
    }
    
    if (bodyData) {
      console.log('提取到请求体:', bodyData);
      result.bodyContent = bodyData;
      
      // 确定bodyType
      const contentType = newHeaders.find(h => h.key.toLowerCase() === 'content-type')?.value.toLowerCase() || '';
      
      if (contentType.includes('json')) {
        result.bodyType = 'raw';
        try {
          // 尝试美化JSON
          const parsedJson = JSON.parse(bodyData);
          result.bodyContent = JSON.stringify(parsedJson, null, 2);
        } catch(e) {
          // 如果不是有效的JSON，保持原样
        }
      } else if (contentType.includes('form-urlencoded')) {
        result.bodyType = 'x-www-form-urlencoded';
        try {
          // 尝试解析表单数据
          const formItems = bodyData.split('&');
          result.formData = formItems.map(item => {
            const [key, value] = item.split('=').map(decodeURIComponent);
            return { key: key || '', value: value || '', type: 'text' };
          });
        } catch(e) {
          result.bodyType = 'raw';
        }
      } else if (contentType.includes('form-data')) {
        result.bodyType = 'form-data';
        // 表单数据在curl中通常比较复杂，这里不做具体解析
        result.formData = [{ key: '', value: '', type: 'text' }];
      } else {
        result.bodyType = 'raw';
      }
    }
    
    // 检查URL中的查询参数
    try {
      const urlObj = new URL(result.url.startsWith('http') ? result.url : `http://${result.url}`);
      if (urlObj.search) {
        const searchParams = new URLSearchParams(urlObj.search);
        const newParams: {key: string, value: string}[] = [];
        
        searchParams.forEach((value, key) => {
          newParams.push({ key, value });
        });
        
        if (newParams.length > 0) {
          result.params = newParams;
          console.log('从URL提取到查询参数:', newParams);
          
          // 更新URL，移除查询参数部分
          urlObj.search = '';
          result.url = urlObj.toString().replace(/^http:\/\//, '');
        }
      }
    } catch(e) {
      console.error('解析URL查询参数失败:', e);
    }
    
    return result;
  };

  // 添加键盘事件处理，按下Enter时导入
  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      handleModalImport();
    }
  };

  return (
    <Modal
      className="curl-parser-modal"
      title="导入CURL命令"
      open={visible}
      onCancel={onClose}
      footer={[
        <Button key="cancel" onClick={onClose} className="curl-parser-button">
          取消
        </Button>,
        <Button key="import" type="primary" onClick={handleModalImport} className="curl-parser-button">
          导入
        </Button>,
      ]}
      width={700}
    >
      <TextArea
        className="curl-input"
        value={curlCommand}
        onChange={(e) => setCurlCommand(e.target.value)}
        placeholder="请粘贴curl命令，例如：curl https://example.com/api/v1/captcha -H 'Content-Type: application/json'"
        autoSize={{ minRows: 6, maxRows: 10 }}
        ref={inputRef}
        onKeyPress={handleKeyPress}
      />
      <div className="help-section">
        <p>支持的curl参数：</p>
        <ul>
          <li>-X, --request：指定请求方法（GET, POST等）</li>
          <li>-H, --header：指定请求头</li>
          <li>-d, --data：指定请求体</li>
          <li>--data-raw：指定请求体（通常用于JSON）</li>
        </ul>
        <p className="shortcut-hint">提示：按下 Ctrl+Enter 快速导入</p>
      </div>
    </Modal>
  );
};

export default CurlParser; 