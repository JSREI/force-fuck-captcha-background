import React, { useState, useEffect } from 'react';
import { Radio, Input, Typography, Empty, Form, Table, Button, Upload } from 'antd';
import { PlusOutlined, DeleteOutlined, UploadOutlined } from '@ant-design/icons';
import type { UploadProps } from 'antd';
import JsonEditor from './JsonEditor';
import './RequestBodyEditor.css';

const { TextArea } = Input;
const { Text } = Typography;

export type BodyType = 'none' | 'form-data' | 'x-www-form-urlencoded' | 'raw' | 'binary';
export type FormDataItem = { key: string; value: string; type: 'text' | 'file' };

interface RequestBodyEditorProps {
  bodyType: BodyType;
  onBodyTypeChange: (type: BodyType) => void;
  bodyContent: string;
  onBodyContentChange: (content: string) => void;
  formData: FormDataItem[];
  onFormDataChange: (data: FormDataItem[]) => void;
  binaryFile?: File | null;
  onBinaryFileChange: (file: File | null) => void;
  binaryFileName?: string;
}

const RequestBodyEditor: React.FC<RequestBodyEditorProps> = ({
  bodyType,
  onBodyTypeChange,
  bodyContent,
  onBodyContentChange,
  formData,
  onFormDataChange,
  binaryFile,
  onBinaryFileChange,
  binaryFileName
}) => {
  const handleBodyTypeChange = (e: any) => {
    onBodyTypeChange(e.target.value);
  };

  const handleFormDataChange = (index: number, field: keyof FormDataItem, value: string | 'text' | 'file') => {
    const newFormData = [...formData];
    newFormData[index][field] = value as any;
    onFormDataChange(newFormData);
  };

  const handleAddFormDataItem = () => {
    onFormDataChange([...formData, { key: '', value: '', type: 'text' }]);
  };

  const handleRemoveFormDataItem = (index: number) => {
    const newFormData = [...formData];
    newFormData.splice(index, 1);
    onFormDataChange(newFormData);
  };

  const formDataColumns = [
    {
      title: 'Key',
      dataIndex: 'key',
      key: 'key',
      render: (text: string, record: FormDataItem, index: number) => (
        <Input 
          value={text} 
          onChange={(e) => handleFormDataChange(index, 'key', e.target.value)} 
          placeholder="参数名称"
        />
      ),
    },
    {
      title: 'Value',
      dataIndex: 'value',
      key: 'value',
      render: (text: string, record: FormDataItem, index: number) => (
        record.type === 'text' ? (
          <Input 
            value={text} 
            onChange={(e) => handleFormDataChange(index, 'value', e.target.value)} 
            placeholder="参数值"
          />
        ) : (
          <Upload>
            <Button icon={<UploadOutlined />}>选择文件</Button>
          </Upload>
        )
      ),
    },
    {
      title: 'Type',
      dataIndex: 'type',
      key: 'type',
      render: (type: 'text' | 'file', record: FormDataItem, index: number) => (
        <Radio.Group 
          value={type} 
          onChange={(e) => handleFormDataChange(index, 'type', e.target.value)}
        >
          <Radio value="text">Text</Radio>
          <Radio value="file">File</Radio>
        </Radio.Group>
      ),
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: any, index: number) => (
        <Button 
          type="text" 
          danger 
          icon={<DeleteOutlined />} 
          onClick={() => handleRemoveFormDataItem(index)} 
        />
      ),
    },
  ];

  const uploadProps: UploadProps = {
    beforeUpload: (file) => {
      onBinaryFileChange(file);
      return false;
    },
    fileList: binaryFile ? [{ uid: '1', name: binaryFile.name, size: binaryFile.size, status: 'done' as any }] : 
              binaryFileName ? [{ uid: '1', name: binaryFileName, size: 0, status: 'done' as any }] : [],
    onRemove: () => {
      onBinaryFileChange(null);
    },
  };

  return (
    <div className="request-body-editor">
      <div className="body-type-selector">
        <Radio.Group onChange={handleBodyTypeChange} value={bodyType}>
          <Radio value="none">none</Radio>
          <Radio value="form-data">form-data</Radio>
          <Radio value="x-www-form-urlencoded">x-www-form-urlencoded</Radio>
          <Radio value="raw">raw</Radio>
          <Radio value="binary">binary</Radio>
        </Radio.Group>
      </div>

      {bodyType === 'none' && (
        <div className="empty-body-message">
          <Text type="secondary">This request does not have a body</Text>
        </div>
      )}

      {(bodyType === 'form-data' || bodyType === 'x-www-form-urlencoded') && (
        <Table 
          className="form-data-table"
          dataSource={formData}
          columns={formDataColumns}
          pagination={false}
          rowKey={(record, index) => `param-${index}`}
          footer={() => (
            <Button 
              type="dashed" 
              onClick={handleAddFormDataItem} 
              style={{ width: '100%' }} 
              icon={<PlusOutlined />}
            >
              添加参数
            </Button>
          )}
        />
      )}

      {bodyType === 'raw' && (
        <TextArea
          className="body-content-area"
          value={bodyContent}
          onChange={(e) => onBodyContentChange(e.target.value)}
          placeholder="请求体内容，通常是JSON格式"
          autoSize={{ minRows: 6, maxRows: 12 }}
        />
      )}

      {bodyType === 'binary' && (
        <div className="binary-upload-container">
          <Upload {...uploadProps}>
            <Button icon={<UploadOutlined />}>选择文件</Button>
          </Upload>
          {(binaryFile || binaryFileName) && (
            <div className="file-info">
              <Text>已选择文件: {binaryFile ? binaryFile.name : binaryFileName} ({binaryFile ? Math.round(binaryFile.size / 1024) : '?'} KB)</Text>
              {!binaryFile && binaryFileName && (
                <Text type="warning" style={{ marginLeft: '10px' }}>
                  (文件信息已保存，但需要重新选择文件)
                </Text>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default RequestBodyEditor; 