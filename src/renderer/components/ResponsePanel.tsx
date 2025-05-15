import React, { useState, useEffect } from 'react';
import { Descriptions, Divider, Input, Button, message, Empty, Space } from 'antd';
import './ResponsePanel.css';
import { EyeOutlined, CopyOutlined } from '@ant-design/icons';

interface ResponsePanelProps {
  responseData: any;
}

const ResponsePanel: React.FC<ResponsePanelProps> = ({ responseData }) => {
  const [jsonPath, setJsonPath] = useState<string>('');
  const [extractedImage, setExtractedImage] = useState<string | null>(null);
  const [formattedData, setFormattedData] = useState<string>('');

  // 当响应数据改变时，格式化JSON并重置提取的图片
  useEffect(() => {
    setExtractedImage(null);
    
    if (responseData) {
      try {
        // 检查是否为JSONP格式
        if (typeof responseData.data === 'string' && isJsonpString(responseData.data)) {
          const jsonData = parseJsonp(responseData.data);
          setFormattedData(syntaxHighlight(JSON.stringify(jsonData, null, 2)));
        } else {
          // 普通JSON数据
          setFormattedData(syntaxHighlight(JSON.stringify(responseData.data, null, 2)));
        }
      } catch (error) {
        // 如果不是有效的JSON/JSONP，则以普通文本显示
        setFormattedData(String(responseData.data));
      }
    }
  }, [responseData]);

  // 检查是否为JSONP字符串
  const isJsonpString = (str: string): boolean => {
    str = str.trim();
    // 匹配常见的JSONP格式: functionName({...}) 或 functionName([...])
    return /^[a-zA-Z0-9_$]+\s*\(\s*(\{|\[).+(\}|\])\s*\)$/.test(str);
  };

  // 解析JSONP字符串为JSON对象
  const parseJsonp = (jsonpStr: string): any => {
    try {
      // 提取JSONP中的JSON部分
      const jsonMatch = jsonpStr.match(/\((.+)\)/s);
      if (jsonMatch && jsonMatch[1]) {
        return JSON.parse(jsonMatch[1]);
      }
      return jsonpStr; // 如果无法解析，返回原始字符串
    } catch (error) {
      console.error('解析JSONP失败:', error);
      return jsonpStr;
    }
  };

  // 对JSON字符串进行语法高亮
  const syntaxHighlight = (json: string): string => {
    // 使用正则表达式添加HTML标签进行高亮
    return json
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, 
        (match) => {
          let cls = 'json-number'; // 默认为数字
          if (/^"/.test(match)) {
            if (/:$/.test(match)) {
              cls = 'json-key'; // 键名
            } else {
              cls = 'json-string'; // 字符串
            }
          } else if (/true|false/.test(match)) {
            cls = 'json-boolean'; // 布尔值
          } else if (/null/.test(match)) {
            cls = 'json-null'; // null值
          }
          return `<span class="${cls}">${match}</span>`;
        }
      );
  };

  // 图片提取功能
  const handleExtractImage = () => {
    if (!responseData || !jsonPath.trim()) {
      message.error('请输入有效的JSON路径');
      return;
    }

    try {
      console.log('尝试提取图片，路径:', jsonPath);
      console.log('响应数据:', responseData);
      
      // 获取实际数据，考虑JSONP情况
      let data = responseData.data;
      if (typeof data === 'string' && isJsonpString(data)) {
        data = parseJsonp(data);
        console.log('解析后的JSONP数据:', data);
      }
      
      // 增强的JSON路径解析逻辑
      const pathSegments = jsonPath.split('.');
      let current = data;
      
      // 详细记录每一步解析过程
      console.log('开始路径解析，原始数据类型:', typeof current);
      
      for (const segment of pathSegments) {
        console.log(`处理路径段: "${segment}", 当前数据类型:`, typeof current);
        
        // 处理数组索引，例如 items[0]
        if (segment.includes('[') && segment.includes(']')) {
          const arrayName = segment.substring(0, segment.indexOf('['));
          const indexStr = segment.substring(segment.indexOf('[') + 1, segment.indexOf(']'));
          const index = parseInt(indexStr);
          
          console.log(`检测到数组访问: ${arrayName}[${index}]`);
          
          if (!current[arrayName]) {
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
          // 处理普通属性访问
          if (current[segment] === undefined) {
            // 找不到属性，尝试列出可用的属性名
            const availableProps = typeof current === 'object' && current !== null
              ? Object.keys(current).join(', ')
              : '无可用属性';
            
            throw new Error(`路径 "${segment}" 不存在。可用的属性: ${availableProps}`);
          }
          
          current = current[segment];
        }
        
        console.log(`解析后的值:`, current);
      }

      // 验证提取的值是否为字符串
      if (typeof current !== 'string') {
        // 如果不是字符串但是对象或数组，尝试转换为字符串显示
        if (typeof current === 'object' && current !== null) {
          throw new Error(`提取的值不是字符串，而是一个 ${Array.isArray(current) ? '数组' : '对象'}。请指定更具体的路径。`);
        } else {
          throw new Error(`提取的值是 ${typeof current} 类型，而不是字符串。`);
        }
      }

      // 处理不同类型的图片数据
      let imageUrl = current;
      
      // 检查是否是有效的图片URL或Base64编码
      if (current.startsWith('data:image')) {
        // 已经是base64编码的图片，直接使用
        console.log('检测到base64编码的图片');
      } else if (current.match(/^(http|https)/)) {
        // 是完整的URL，直接使用
        console.log('检测到图片URL');
      } else if (/^[A-Za-z0-9+/=]+$/.test(current)) {
        // 可能是纯base64编码（不带前缀），尝试添加前缀
        console.log('检测到可能是纯base64编码，尝试添加前缀');
        imageUrl = `data:image/png;base64,${current}`;
      } else {
        // 其他情况，可能是相对路径或其他格式
        console.log('未知格式的图片数据，将尝试直接显示');
        message.warning('提取的数据不是标准的图片URL格式，但将尝试显示');
      }

      setExtractedImage(imageUrl);
      message.success('成功提取图片');
    } catch (error: any) {
      console.error('提取图片失败:', error);
      message.error(`提取图片失败: ${error.message}`);
    }
  };

  // 提取背景图片功能
  const handleExtractBackgroundImage = () => {
    if (!responseData) {
      message.error('没有响应数据');
      return;
    }

    try {
      console.log('尝试自动提取背景图片');
      console.log('响应数据:', responseData);
      
      // 获取实际数据，考虑JSONP情况
      let data = responseData.data;
      if (typeof data === 'string' && isJsonpString(data)) {
        data = parseJsonp(data);
        console.log('解析后的JSONP数据:', data);
      }
      
      // 常见的背景图片字段名列表
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
      
      let extractedBg = null;
      let successPath = '';
      
      // 尝试提取背景图片
      for (const path of possibleBgPaths) {
        try {
          console.log(`尝试路径: ${path}`);
          const pathSegments = path.split('.');
          let current = data;
          
          // 逐段解析路径
          for (const segment of pathSegments) {
            if (current && current[segment] !== undefined) {
              current = current[segment];
            } else {
              throw new Error(`路径 "${segment}" 不存在`);
            }
          }
          
          // 如果找到字符串值，可能是图片
          if (typeof current === 'string') {
            // 处理不同类型的图片数据
            let imageUrl = current;
            
            if (current.startsWith('data:image')) {
              console.log('检测到base64编码的图片');
            } else if (current.match(/^(http|https)/)) {
              console.log('检测到图片URL');
            } else if (/^[A-Za-z0-9+/=]+$/.test(current)) {
              console.log('检测到可能是纯base64编码，尝试添加前缀');
              imageUrl = `data:image/png;base64,${current}`;
            }
            
            extractedBg = imageUrl;
            successPath = path;
            console.log(`在路径 ${path} 找到可能的背景图片`);
            break;
          }
        } catch (error) {
          console.log(`路径 ${path} 查找失败:`, error);
          continue;
        }
      }
      
      if (extractedBg) {
        setJsonPath(successPath);
        setExtractedImage(extractedBg);
        message.success(`成功提取背景图片 (路径: ${successPath})`);
      } else {
        message.error('未找到背景图片，请尝试手动提取');
      }
    } catch (error: any) {
      console.error('提取背景图片失败:', error);
      message.error(`提取背景图片失败: ${error.message}`);
    }
  };

  // 复制响应数据到剪贴板
  const copyResponseToClipboard = () => {
    try {
      let textToCopy = '';
      
      // 考虑JSONP的情况
      if (typeof responseData.data === 'string' && isJsonpString(responseData.data)) {
        const jsonData = parseJsonp(responseData.data);
        textToCopy = JSON.stringify(jsonData, null, 2);
      } else {
        textToCopy = JSON.stringify(responseData.data, null, 2);
      }
      
      navigator.clipboard.writeText(textToCopy)
        .then(() => {
          message.success('已复制到剪贴板');
        })
        .catch((err) => {
          console.error('复制失败:', err);
          message.error('复制失败');
        });
    } catch (error) {
      console.error('准备复制内容时出错:', error);
      message.error('复制失败');
    }
  };

  if (!responseData) {
    return (
      <Empty 
        className="empty-response"
        description="发送请求后将在此处显示响应结果" 
        image={Empty.PRESENTED_IMAGE_SIMPLE}
      />
    );
  }

  return (
    <div className="response-panel">
      <Descriptions bordered column={1} size="small">
        <Descriptions.Item label="状态">
          <span className={responseData.status >= 200 && responseData.status < 300 ? 'response-status-success' : 'response-status-error'}>
            {responseData.status} {responseData.statusText}
          </span>
        </Descriptions.Item>
        <Descriptions.Item label="内容类型">
          {responseData.headers['content-type']}
        </Descriptions.Item>
      </Descriptions>
      
      <Divider orientation="left" className="response-divider">
        响应数据
        <Button 
          type="link" 
          size="small" 
          onClick={copyResponseToClipboard}
          style={{ marginLeft: 8 }}
        >
          复制
        </Button>
      </Divider>
      
      {/* 使用dangerouslySetInnerHTML显示格式化的JSON */}
      <pre 
        className="response-pre json-formatted" 
        dangerouslySetInnerHTML={{ __html: formattedData }}
      ></pre>
      
      <Divider orientation="left" className="response-divider">图片提取</Divider>
      <div className="response-data-container">
        <Input 
          className="json-path-input"
          addonBefore="JSON Path"
          placeholder="例如: data.bg 或 data.captchaImg" 
          value={jsonPath}
          onChange={(e) => setJsonPath(e.target.value)}
        />
        <Space>
          <Button 
            type="primary" 
            onClick={handleExtractImage}
          >
            提取
          </Button>
          <Button 
            type="primary"
            onClick={handleExtractBackgroundImage}
          >
            提取背景图片原图
          </Button>
        </Space>
        <div className="json-path-help">
          <small>常见路径示例: data.bg, data.captchaImg, data.img, data.image</small>
          <br/>
          <small>支持数组访问，例如: data.images[0]</small>
        </div>
      </div>
      
      {extractedImage && (
        <div className="extracted-image-container">
          <img 
            className="extracted-image"
            src={extractedImage} 
            alt="验证码图片"
            onError={(e) => {
              message.error('图片加载失败');
              console.error('图片加载失败:', e);
            }}
          />
          <div className="image-info">
            <Button 
              type="link" 
              size="small" 
              href={extractedImage} 
              target="_blank"
              icon={<EyeOutlined />}
            >
              在新窗口打开
            </Button>
            <Button 
              type="link" 
              size="small" 
              onClick={() => {
                navigator.clipboard.writeText(extractedImage)
                  .then(() => message.success('图片URL已复制'))
                  .catch(() => message.error('复制失败'));
              }}
              icon={<CopyOutlined />}
            >
              复制URL
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ResponsePanel; 