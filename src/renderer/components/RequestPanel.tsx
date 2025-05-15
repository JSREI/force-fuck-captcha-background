import React from 'react';
import { Form, Input, Select, Button, Space, Row, Col, Tooltip } from 'antd';
import { ClearOutlined } from '@ant-design/icons';
import './RequestPanel.css';

const { Option } = Select;

interface RequestPanelProps {
  method: string;
  url: string;
  loading: boolean;
  onMethodChange: (method: string) => void;
  onUrlChange: (url: string) => void;
  onSendRequest: () => void;
  onImportCurl: () => void;
  onReset: () => void;
}

const RequestPanel: React.FC<RequestPanelProps> = ({ 
  method,
  url,
  loading,
  onMethodChange,
  onUrlChange,
  onSendRequest,
  onImportCurl,
  onReset
}) => {
  const [form] = Form.useForm();

  const handleReset = () => {
    // 先重置表单状态
    form.resetFields();
    // 然后调用父组件传入的onReset回调
    onReset();
  };

  return (
    <div className="request-panel">
      <Row gutter={8} className="request-panel-row">
        <Col span={3}>
          <Select 
            value={method} 
            onChange={(value) => {
              onMethodChange(value);
              form.setFieldsValue({ method: value });
            }} 
            className="method-select"
            dropdownMatchSelectWidth={false}
          >
            <Option value="GET">GET</Option>
            <Option value="POST">POST</Option>
            <Option value="PUT">PUT</Option>
            <Option value="DELETE">DELETE</Option>
            <Option value="PATCH">PATCH</Option>
            <Option value="HEAD">HEAD</Option>
          </Select>
        </Col>
        <Col span={16}>
          <Input 
            value={url} 
            onChange={(e) => {
              onUrlChange(e.target.value);
              form.setFieldsValue({ url: e.target.value });
            }} 
            placeholder="输入请求URL，例如：https://example.com/api/v1/captcha" 
            className="url-input"
          />
        </Col>
        <Col span={5}>
          <Space className="button-group">
            <Button 
              type="primary" 
              onClick={onSendRequest} 
              loading={loading}
              className="send-button"
            >
              发送
            </Button>
            <Button 
              onClick={onImportCurl}
              className="import-curl-button"
            >
              导入CURL
            </Button>
            <Tooltip title="重置所有输入">
              <Button 
                icon={<ClearOutlined />} 
                onClick={handleReset}
                className="reset-button"
                danger
              />
            </Tooltip>
          </Space>
        </Col>
      </Row>
    </div>
  );
};

export default RequestPanel; 