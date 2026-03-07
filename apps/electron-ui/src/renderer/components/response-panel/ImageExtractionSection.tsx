import React from 'react';
import { Button, Input, Space } from 'antd';

interface ImageExtractionSectionProps {
  jsonPath: string;
  onJsonPathChange: (value: string) => void;
  onExtract: () => void;
  onExtractBg: () => void;
}

const ImageExtractionSection: React.FC<ImageExtractionSectionProps> = ({
  jsonPath,
  onJsonPathChange,
  onExtract,
  onExtractBg
}) => {
  return (
    <div className="response-data-container">
      <Input
        className="json-path-input"
        addonBefore="JSON Path"
        placeholder="例如: data.bg 或 data.captchaImg"
        value={jsonPath}
        onChange={(e) => onJsonPathChange(e.target.value)}
      />
      <Space>
        <Button type="primary" onClick={onExtract}>提取</Button>
        <Button type="primary" onClick={onExtractBg}>提取背景图片原图</Button>
      </Space>
      <div className="json-path-help">
        <small>常见路径示例: data.bg, data.captchaImg, data.img, data.image</small>
        <br />
        <small>支持数组访问，例如: data.images[0]</small>
      </div>
    </div>
  );
};

export default ImageExtractionSection;

