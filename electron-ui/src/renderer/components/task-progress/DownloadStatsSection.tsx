import React from 'react';
import { CloudDownloadOutlined } from '@ant-design/icons';
import { Progress, Space, Statistic, Row, Col, Tooltip, Divider } from 'antd';

interface DownloadStatsSectionProps {
  downloadedImages: number;
  downloadPercent: number;
  isCompleted: boolean;
}

export const DownloadStatsSection: React.FC<DownloadStatsSectionProps> = ({
  downloadedImages,
  downloadPercent,
  isCompleted
}) => (
  <div>
    <Divider orientation="left">
      <Space>
        <CloudDownloadOutlined />
        下载统计
      </Space>
    </Divider>
    <Row gutter={16}>
      <Col span={8}>
        <Tooltip title="已下载的验证码图片数量">
          <Statistic
            title="已下载图片"
            value={downloadedImages}
            suffix="张"
          />
        </Tooltip>
      </Col>
      <Col span={16}>
        <div style={{ marginBottom: 8 }}>下载进度</div>
        <Progress
          percent={downloadPercent}
          status={isCompleted ? 'success' : 'active'}
          strokeColor={{
            '0%': '#108ee9',
            '100%': '#87d068'
          }}
        />
      </Col>
    </Row>
  </div>
);
