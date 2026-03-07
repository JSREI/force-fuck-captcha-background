import React from 'react';
import { Button, message } from 'antd';
import { CopyOutlined, EyeOutlined } from '@ant-design/icons';

interface ExtractedImagePreviewProps {
  imageUrl: string;
}

const ExtractedImagePreview: React.FC<ExtractedImagePreviewProps> = ({ imageUrl }) => {
  return (
    <div className="extracted-image-container">
      <img
        className="extracted-image"
        src={imageUrl}
        alt="验证码图片"
        onError={(e) => {
          message.error('图片加载失败');
          console.error('图片加载失败:', e);
        }}
      />
      <div className="image-info">
        <Button type="link" size="small" href={imageUrl} target="_blank" icon={<EyeOutlined />}>
          在新窗口打开
        </Button>
        <Button
          type="link"
          size="small"
          onClick={() => {
            navigator.clipboard.writeText(imageUrl)
              .then(() => message.success('图片URL已复制'))
              .catch(() => message.error('复制失败'));
          }}
          icon={<CopyOutlined />}
        >
          复制URL
        </Button>
      </div>
    </div>
  );
};

export default ExtractedImagePreview;

