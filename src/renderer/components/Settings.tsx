import React, { useState, useEffect } from 'react';
import {
  Modal,
  Button,
  Input,
  Checkbox,
  Typography,
  Space,
  Tooltip,
  Form,
  InputNumber,
  Card
} from 'antd';
import { SettingOutlined, FolderOutlined } from '@ant-design/icons';

interface SettingsProps {
  open: boolean;
  onClose: () => void;
}

declare global {
  interface Window {
    electronAPI: {
      ipcRenderer: {
        invoke(channel: string, ...args: any[]): Promise<any>;
      };
    };
  }
}

export interface SettingsFormData {
  requestInterval: number;
  concurrency: number;
}

export const Settings: React.FC<SettingsProps> = ({ open, onClose }) => {
  // 工作目录设置
  const [workspacePath, setWorkspacePath] = useState<string>('');
  
  // 代理设置
  const [useSystemProxy, setUseSystemProxy] = useState<boolean>(false);
  const [customProxy, setCustomProxy] = useState<string>('');
  
  const [form] = Form.useForm<SettingsFormData>();

  useEffect(() => {
    // 从主进程获取当前设置
    window.electronAPI.ipcRenderer.invoke('get-settings').then((settings: any) => {
      setWorkspacePath(settings.workspacePath || '');
      setUseSystemProxy(settings.useSystemProxy || false);
      setCustomProxy(settings.customProxy || '');
    });
  }, []);

  const handleSelectDirectory = async () => {
    const result = await window.electronAPI.ipcRenderer.invoke('select-directory');
    if (result) {
      setWorkspacePath(result);
    }
  };

  const handleSave = async () => {
    await window.electronAPI.ipcRenderer.invoke('save-settings', {
      workspacePath,
      useSystemProxy,
      customProxy
    });
    onClose();
  };

  const handleValuesChange = () => {
    const values = form.getFieldsValue();
    // 这里需要实现将表单数据传递给父组件的逻辑
  };

  return (
    <Modal
      title="设置"
      open={open}
      onCancel={onClose}
      footer={[
        <Button key="cancel" onClick={onClose}>
          取消
        </Button>,
        <Button key="save" type="primary" onClick={handleSave}>
          保存
        </Button>
      ]}
    >
      <Space direction="vertical" style={{ width: '100%' }}>
        {/* 工作目录设置 */}
        <div>
          <Typography.Title level={5}>工作目录设置</Typography.Title>
          <Space.Compact style={{ width: '100%' }}>
            <Input
              value={workspacePath}
              onChange={(e) => setWorkspacePath(e.target.value)}
              placeholder="默认将在程序运行目录下创建 workspace 文件夹"
            />
            <Button icon={<FolderOutlined />} onClick={handleSelectDirectory} />
          </Space.Compact>
          <Typography.Text type="secondary">
            用于存储验证码图片和处理后的背景图
          </Typography.Text>
        </div>

        {/* 代理设置 */}
        <div>
          <Typography.Title level={5}>代理设置</Typography.Title>
          <Checkbox
            checked={useSystemProxy}
            onChange={(e) => setUseSystemProxy(e.target.checked)}
          >
            使用系统代理
          </Checkbox>
          {!useSystemProxy && (
            <div style={{ marginTop: 16 }}>
              <Input
                value={customProxy}
                onChange={(e) => setCustomProxy(e.target.value)}
                placeholder="例如: http://127.0.0.1:7890 或 socks5://127.0.0.1:7891"
              />
              <Typography.Text type="secondary">
                支持 HTTP 和 SOCKS5 代理
              </Typography.Text>
            </div>
          )}
        </div>

        <Card title="下载设置">
          <Form
            form={form}
            layout="vertical"
            initialValues={{
              requestInterval: 3000,  // 默认3秒
              concurrency: 1         // 默认并发数1
            }}
            onValuesChange={handleValuesChange}
          >
            <Form.Item
              label="请求间隔（毫秒）"
              name="requestInterval"
              tooltip="每次请求之间的时间间隔，建议不要太短以避免被封禁"
            >
              <InputNumber
                min={1000}
                max={10000}
                step={100}
                style={{ width: '100%' }}
              />
            </Form.Item>

            <Form.Item
              label="并发请求数"
              name="concurrency"
              tooltip="同时进行的请求数量，建议保持为1以避免被封禁"
            >
              <InputNumber
                min={1}
                max={5}
                style={{ width: '100%' }}
              />
            </Form.Item>
          </Form>
        </Card>
      </Space>
    </Modal>
  );
};

// 设置按钮组件
export const SettingsButton: React.FC = () => {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Tooltip title="设置">
        <Button
          type="text"
          icon={<SettingOutlined />}
          onClick={() => setOpen(true)}
        />
      </Tooltip>
      <Settings open={open} onClose={() => setOpen(false)} />
    </>
  );
}; 