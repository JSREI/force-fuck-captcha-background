import React from 'react';
import { Button, Col, Input, Row, Space, Tag, Typography } from 'antd';
import { FolderOpenOutlined, PlayCircleOutlined, StopOutlined } from '@ant-design/icons';

const { Text } = Typography;

interface DirectoryActionPanelProps {
  inputDir: string;
  outputDir: string;
  isRunning: boolean;
  canStart: boolean;
  busy: boolean;
  statusText: string;
  statusColor: string;
  onSelectInputDir: () => void;
  onSelectOutputDir: () => void;
  onStart: () => void;
  onStop: () => void;
  onOpenOutput: () => void;
}

const DirectoryActionPanel: React.FC<DirectoryActionPanelProps> = ({
  inputDir,
  outputDir,
  isRunning,
  canStart,
  busy,
  statusText,
  statusColor,
  onSelectInputDir,
  onSelectOutputDir,
  onStart,
  onStop,
  onOpenOutput
}) => {
  return (
    <>
      <Row gutter={12}>
        <Col span={24}>
          <Text strong>验证码目录</Text>
          <Input
            value={inputDir}
            placeholder="请选择验证码图片目录"
            readOnly
            addonAfter={(
              <Button
                type="link"
                icon={<FolderOpenOutlined />}
                onClick={onSelectInputDir}
                style={{ paddingInline: 4 }}
              >
                选择
              </Button>
            )}
          />
        </Col>
        <Col span={24}>
          <Text strong>输出目录</Text>
          <Input
            value={outputDir}
            placeholder="请选择输出目录"
            readOnly
            addonAfter={(
              <Button
                type="link"
                icon={<FolderOpenOutlined />}
                onClick={onSelectOutputDir}
                style={{ paddingInline: 4 }}
              >
                选择
              </Button>
            )}
          />
        </Col>
      </Row>

      <Space wrap>
        <Button
          type="primary"
          icon={<PlayCircleOutlined />}
          onClick={onStart}
          disabled={!canStart}
          loading={busy && isRunning}
        >
          开始
        </Button>
        <Button
          danger
          icon={<StopOutlined />}
          onClick={onStop}
          disabled={!isRunning}
        >
          停止
        </Button>
        <Button icon={<FolderOpenOutlined />} onClick={onOpenOutput} disabled={!outputDir}>
          打开输出目录
        </Button>
        <Tag color={statusColor}>{statusText}</Tag>
      </Space>
    </>
  );
};

export default DirectoryActionPanel;

