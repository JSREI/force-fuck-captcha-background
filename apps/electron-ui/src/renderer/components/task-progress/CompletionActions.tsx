import React from 'react';
import { CheckCircleOutlined, FolderOpenOutlined } from '@ant-design/icons';
import { Button, Space, Tooltip } from 'antd';
import type { OpenDirectoryType } from './types';

interface CompletionActionsProps {
  onOpenDirectory: (type: OpenDirectoryType) => void;
}

export const CompletionActions: React.FC<CompletionActionsProps> = ({ onOpenDirectory }) => (
  <div style={{ textAlign: 'center', marginTop: 24 }}>
    <CheckCircleOutlined
      style={{ fontSize: 64, color: '#52c41a', marginBottom: 16 }}
    />
    <h2>任务完成！</h2>
    <Space size="middle">
      <Tooltip title="打开还原出的背景图片所在文件夹">
        <Button
          type="primary"
          size="large"
          icon={<FolderOpenOutlined />}
          onClick={() => onOpenDirectory('background')}
        >
          打开背景图片文件夹
        </Button>
      </Tooltip>
      <Tooltip title="打开下载的验证码图片所在文件夹">
        <Button
          size="large"
          icon={<FolderOpenOutlined />}
          onClick={() => onOpenDirectory('captcha')}
        >
          打开验证码图片文件夹
        </Button>
      </Tooltip>
    </Space>
  </div>
);
