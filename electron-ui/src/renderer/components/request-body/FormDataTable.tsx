import React from 'react';
import { Button, Input, Radio, Table, Upload } from 'antd';
import { DeleteOutlined, PlusOutlined, UploadOutlined } from '@ant-design/icons';
import type { FormDataItem } from './types';

interface FormDataTableProps {
  formData: FormDataItem[];
  onFormDataChange: (data: FormDataItem[]) => void;
}

const FormDataTable: React.FC<FormDataTableProps> = ({ formData, onFormDataChange }) => {
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

  const columns = [
    {
      title: 'Key',
      dataIndex: 'key',
      key: 'key',
      render: (text: string, _record: FormDataItem, index: number) => (
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
      render: (type: 'text' | 'file', _record: FormDataItem, index: number) => (
        <Radio.Group value={type} onChange={(e) => handleFormDataChange(index, 'type', e.target.value)}>
          <Radio value="text">Text</Radio>
          <Radio value="file">File</Radio>
        </Radio.Group>
      ),
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, _record: any, index: number) => (
        <Button
          type="text"
          danger
          icon={<DeleteOutlined />}
          onClick={() => handleRemoveFormDataItem(index)}
        />
      ),
    },
  ];

  return (
    <Table
      className="form-data-table"
      dataSource={formData}
      columns={columns}
      pagination={false}
      rowKey={(_record, index) => `param-${index}`}
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
  );
};

export default FormDataTable;

