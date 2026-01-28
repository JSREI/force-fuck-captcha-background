import React from 'react';
import { CheckCircleOutlined, FolderOpenOutlined, CloudDownloadOutlined, FileImageOutlined } from '@ant-design/icons';
import { Progress, Card, Space, Button, Statistic, Row, Col, Tooltip, Divider } from 'antd';
import { TaskInfo } from '../../main/modules/task-manager';

interface TaskProgressProps {
  task: TaskInfo | null;
  onOpenDirectory: (type: 'task' | 'captcha' | 'background') => void;
}

const TaskProgress: React.FC<TaskProgressProps> = ({ task, onOpenDirectory }) => {
  if (!task) {
    return null;
  }

  const { progress, status } = task;
  const isCompleted = status === 'completed';
  const pendingBuckets = progress.totalBuckets - progress.completedBuckets;
  const votingCompletionRate = progress.totalBuckets > 0 
    ? (progress.completedBuckets / progress.totalBuckets * 100).toFixed(1)
    : '0.0';

  return (
    <Card title="任务进度" className="task-progress">
      <Space direction="vertical" style={{ width: '100%' }} size="large">
        {/* 下载统计 */}
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
                  value={progress.downloadedImages}
                  suffix="张"
                />
              </Tooltip>
            </Col>
            <Col span={16}>
              <div style={{ marginBottom: 8 }}>下载进度</div>
              <Progress
                percent={Math.round(progress.downloadProgress * 100)}
                status={isCompleted ? 'success' : 'active'}
                strokeColor={{
                  '0%': '#108ee9',
                  '100%': '#87d068',
                }}
              />
            </Col>
          </Row>
        </div>

        {/* 背景识别统计 */}
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
                  value={progress.totalBuckets}
                  suffix="个"
                />
              </Tooltip>
            </Col>
            <Col span={8}>
              <Tooltip title="已完成投票的背景图片数量">
                <Statistic
                  title="完成投票的背景"
                  value={progress.completedBuckets}
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
              <Tooltip title={`已完成 ${votingCompletionRate}% 的背景图片投票`}>
                <Progress
                  percent={parseFloat(votingCompletionRate)}
                  status={isCompleted ? 'success' : 'active'}
                  strokeColor={{
                    '0%': '#108ee9',
                    '100%': '#87d068',
                  }}
                />
              </Tooltip>
            </Col>
          </Row>
        </div>

        {/* 完成状态 */}
        {isCompleted && (
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
        )}
      </Space>
    </Card>
  );
};

export default TaskProgress; 