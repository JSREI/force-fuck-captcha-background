import React from 'react';
import { FileImageOutlined } from '@ant-design/icons';
import { Progress, Space, Statistic, Row, Col, Tooltip, Divider } from 'antd';

interface BackgroundStatsSectionProps {
  totalBuckets: number;
  completedBuckets: number;
  pendingBuckets: number;
  votingPercent: number;
  isCompleted: boolean;
}

export const BackgroundStatsSection: React.FC<BackgroundStatsSectionProps> = ({
  totalBuckets,
  completedBuckets,
  pendingBuckets,
  votingPercent,
  isCompleted
}) => (
  <div>
    <Divider orientation="left">
      <Space>
        <FileImageOutlined />
        背景识别统计
      </Space>
    </Divider>
    <Row gutter={16}>
      <Col span={8}>
        <Tooltip title="识别到的不同背景图片数量">
          <Statistic
            title="识别到的背景"
            value={totalBuckets}
            suffix="个"
          />
        </Tooltip>
      </Col>
      <Col span={8}>
        <Tooltip title="已完成投票的背景图片数量">
          <Statistic
            title="完成投票的背景"
            value={completedBuckets}
            suffix="个"
          />
        </Tooltip>
      </Col>
      <Col span={8}>
        <Tooltip title="等待完成投票的背景图片数量">
          <Statistic
            title="待完成投票的背景"
            value={pendingBuckets}
            suffix="个"
          />
        </Tooltip>
      </Col>
    </Row>
    <Row style={{ marginTop: 16 }}>
      <Col span={24}>
        <div style={{ marginBottom: 8 }}>投票进度</div>
        <Tooltip title={`已完成 ${votingPercent}% 的背景图片投票`}>
          <Progress
            percent={votingPercent}
            status={isCompleted ? 'success' : 'active'}
            strokeColor={{
              '0%': '#108ee9',
              '100%': '#87d068'
            }}
          />
        </Tooltip>
      </Col>
    </Row>
  </div>
);
