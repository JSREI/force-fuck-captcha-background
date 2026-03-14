import React from 'react';
import { Button, Card, Checkbox, Form, Input, InputNumber, Modal, Space, Typography } from 'antd';
import { FolderOutlined } from '@ant-design/icons';
import { SettingsFormData } from './types';

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
  workspacePath: string;
  setWorkspacePath: (value: string) => void;
  useSystemProxy: boolean;
  setUseSystemProxy: (value: boolean) => void;
  customProxy: string;
  setCustomProxy: (value: string) => void;
  onSelectDirectory: () => void;
  onSave: () => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({
  open,
  onClose,
  workspacePath,
  setWorkspacePath,
  useSystemProxy,
  setUseSystemProxy,
  customProxy,
  setCustomProxy,
  onSelectDirectory,
  onSave
}) => {
  const [form] = Form.useForm<SettingsFormData>();

  return (
    <Modal
      title="设置"
      open={open}
      onCancel={onClose}
      footer={[
        <Button key="cancel" onClick={onClose}>取消</Button>,
        <Button key="save" type="primary" onClick={onSave}>保存</Button>
      ]}
    >
      <Space direction="vertical" style={{ width: '100%' }}>
        <div>
          <Typography.Title level={5}>工作目录设置</Typography.Title>
          <Space.Compact style={{ width: '100%' }}>
            <Input
              value={workspacePath}
              onChange={(e) => setWorkspacePath(e.target.value)}
              placeholder="默认将在程序运行目录下创建 workspace 文件夹"
            />
            <Button icon={<FolderOutlined />} onClick={onSelectDirectory} />
          </Space.Compact>
          <Typography.Text type="secondary">用于存储验证码图片和处理后的背景图</Typography.Text>
        </div>

        <div>
          <Typography.Title level={5}>代理设置</Typography.Title>
          <Checkbox checked={useSystemProxy} onChange={(e) => setUseSystemProxy(e.target.checked)}>
            使用系统代理
          </Checkbox>
          {!useSystemProxy && (
            <div style={{ marginTop: 16 }}>
              <Input
                value={customProxy}
                onChange={(e) => setCustomProxy(e.target.value)}
                placeholder="例如: http://127.0.0.1:7890 或 socks5://127.0.0.1:7891"
              />
              <Typography.Text type="secondary">支持 HTTP 和 SOCKS5 代理</Typography.Text>
            </div>
          )}
        </div>

        <Card title="下载设置">
          <Form
            form={form}
            layout="vertical"
            initialValues={{
              requestInterval: 3000,
              concurrency: 1
            }}
          >
            <Form.Item
              label="请求间隔（毫秒）"
              name="requestInterval"
              tooltip="每次请求之间的时间间隔，建议不要太短以避免被封禁"
            >
              <InputNumber min={1000} max={10000} step={100} style={{ width: '100%' }} />
            </Form.Item>

            <Form.Item
              label="并发请求数"
              name="concurrency"
              tooltip="同时进行的请求数量，建议保持为1以避免被封禁"
            >
              <InputNumber min={1} max={5} style={{ width: '100%' }} />
            </Form.Item>
          </Form>
        </Card>
      </Space>
    </Modal>
  );
};

export default SettingsModal;

