import React, { useEffect, useState } from 'react';
import { Button, Descriptions, Divider, Empty, message } from 'antd';
import './ResponsePanel.css';
import { autoExtractBackgroundImage, extractImageByPath, normalizeImageUrl } from './response-panel/image-utils';
import { formatResponseData, isJsonpString, parseJsonp } from './response-panel/json-utils';
import ImageExtractionSection from './response-panel/ImageExtractionSection';
import ExtractedImagePreview from './response-panel/ExtractedImagePreview';

interface ResponsePanelProps {
  responseData: any;
}

const ResponsePanel: React.FC<ResponsePanelProps> = ({ responseData }) => {
  const [jsonPath, setJsonPath] = useState<string>('');
  const [extractedImage, setExtractedImage] = useState<string | null>(null);
  const [formattedData, setFormattedData] = useState<string>('');

  useEffect(() => {
    setExtractedImage(null);
    if (!responseData) {
      setFormattedData('');
      return;
    }
    setFormattedData(formatResponseData(responseData));
  }, [responseData]);

  const handleExtractImage = () => {
    if (!responseData || !jsonPath.trim()) {
      message.error('请输入有效的JSON路径');
      return;
    }

    try {
      const { imageUrl } = extractImageByPath(responseData, jsonPath);
      const normalized = normalizeImageUrl(imageUrl);
      if (normalized.isUnknownFormat) {
        message.warning('提取的数据不是标准的图片URL格式，但将尝试显示');
      }
      setExtractedImage(normalized.imageUrl);
      message.success('成功提取图片');
    } catch (error: any) {
      console.error('提取图片失败:', error);
      message.error(`提取图片失败: ${error.message}`);
    }
  };

  const handleExtractBackgroundImage = () => {
    if (!responseData) {
      message.error('没有响应数据');
      return;
    }

    try {
      const extracted = autoExtractBackgroundImage(responseData);
      if (!extracted) {
        message.error('未找到背景图片，请尝试手动提取');
        return;
      }
      setJsonPath(extracted.jsonPath);
      setExtractedImage(extracted.imageUrl);
      if (extracted.unknownFormat) {
        message.warning('提取到非标准图片URL格式，将尝试显示');
      }
      message.success(`成功提取背景图片 (路径: ${extracted.jsonPath})`);
    } catch (error: any) {
      console.error('提取背景图片失败:', error);
      message.error(`提取背景图片失败: ${error.message}`);
    }
  };

  const copyResponseToClipboard = () => {
    try {
      let textToCopy = '';
      if (typeof responseData.data === 'string' && isJsonpString(responseData.data)) {
        const jsonData = parseJsonp(responseData.data);
        textToCopy = JSON.stringify(jsonData, null, 2);
      } else {
        textToCopy = JSON.stringify(responseData.data, null, 2);
      }

      navigator.clipboard.writeText(textToCopy)
        .then(() => message.success('已复制到剪贴板'))
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
        <Button type="link" size="small" onClick={copyResponseToClipboard} style={{ marginLeft: 8 }}>
          复制
        </Button>
      </Divider>

      <pre
        className="response-pre json-formatted"
        dangerouslySetInnerHTML={{ __html: formattedData }}
      />

      <Divider orientation="left" className="response-divider">图片提取</Divider>
      <ImageExtractionSection
        jsonPath={jsonPath}
        onJsonPathChange={setJsonPath}
        onExtract={handleExtractImage}
        onExtractBg={handleExtractBackgroundImage}
      />

      {extractedImage && <ExtractedImagePreview imageUrl={extractedImage} />}
    </div>
  );
};

export default ResponsePanel;

