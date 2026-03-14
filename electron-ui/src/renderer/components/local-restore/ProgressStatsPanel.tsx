import React from 'react';
import { Col, Descriptions, Progress, Row, Statistic, Typography } from 'antd';
import type { LocalRestoreStatus } from '../../../shared/local-restore-types';

const { Text } = Typography;

interface ProgressStatsPanelProps {
  status: LocalRestoreStatus;
  progressPercent: number;
  isRunning: boolean;
  durationSeconds: number;
}

const ProgressStatsPanel: React.FC<ProgressStatsPanelProps> = ({
  status,
  progressPercent,
  isRunning,
  durationSeconds
}) => {
  return (
    <>
      <div>
        <Text strong>处理进度</Text>
        <Progress percent={progressPercent} status={isRunning ? 'active' : 'normal'} />
        <Text type="secondary">
          {status.processedFiles}/{status.imageFiles} 张图片
        </Text>
        {status.currentFile && (
          <div>
            <Text type="secondary">当前文件: {status.currentFile}</Text>
          </div>
        )}
      </div>

      <Row gutter={12}>
        <Col span={6}><Statistic title="总文件数" value={status.totalFiles} /></Col>
        <Col span={6}><Statistic title="图片文件" value={status.imageFiles} /></Col>
        <Col span={6}><Statistic title="成功" value={status.succeededFiles} /></Col>
        <Col span={6}><Statistic title="失败" value={status.failedFiles} /></Col>
        <Col span={6}><Statistic title="跳过(非图片)" value={status.skippedFiles} /></Col>
        <Col span={6}><Statistic title="分组数" value={status.bucketCount} /></Col>
        <Col span={6}><Statistic title="已输出分组" value={status.completedBucketCount} /></Col>
        <Col span={6}><Statistic title="速度(张/秒)" value={status.speedPerSecond} precision={2} /></Col>
      </Row>

      <Descriptions bordered size="small" column={1}>
        <Descriptions.Item label="输入目录">{status.inputDir || '-'}</Descriptions.Item>
        <Descriptions.Item label="输出目录">{status.outputDir || '-'}</Descriptions.Item>
        <Descriptions.Item label="运行时长">{durationSeconds} 秒</Descriptions.Item>
        <Descriptions.Item label="汇总文件">{status.summaryPath || '-'}</Descriptions.Item>
      </Descriptions>
    </>
  );
};

export default ProgressStatsPanel;

