import React from 'react';
import { Table, Input, Button } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import './HeadersTable.css';

interface Header {
  key: string;
  value: string;
}

interface HeadersTableProps {
  headers: Header[];
  onHeadersChange: (headers: Header[]) => void;
}

const HeadersTable: React.FC<HeadersTableProps> = ({ headers, onHeadersChange }) => {
  const handleAddHeader = () => {
    onHeadersChange([...headers, { key: '', value: '' }]);
  };

  const handleHeaderChange = (index: number, field: 'key' | 'value', value: string) => {
    const newHeaders = [...headers];
    newHeaders[index][field] = value;
    onHeadersChange(newHeaders);
  };

  const handleRemoveHeader = (index: number) => {
    const newHeaders = [...headers];
    newHeaders.splice(index, 1);
    onHeadersChange(newHeaders);
  };

  const columns = [
    {
      title: 'Key',
      dataIndex: 'key',
      key: 'key',
      render: (text: string, record: Header, index: number) => (
        <Input 
          value={text} 
          onChange={(e) => handleHeaderChange(index, 'key', e.target.value)} 
          placeholder="Header名称"
        />
      ),
    },
    {
      title: 'Value',
      dataIndex: 'value',
      key: 'value',
      render: (text: string, record: Header, index: number) => (
        <Input 
          value={text} 
          onChange={(e) => handleHeaderChange(index, 'value', e.target.value)} 
          placeholder="Header值"
        />
      ),
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: Header, index: number) => (
        <Button 
          type="text" 
          danger 
          icon={<DeleteOutlined />} 
          onClick={() => handleRemoveHeader(index)} 
        />
      ),
    },
  ];

  return (
    <Table 
      className="headers-table"
      dataSource={headers}
      columns={columns}
      pagination={false}
      rowKey={(record, index) => `header-${index}`}
      size="small"
      footer={() => (
        <Button 
          type="dashed" 
          onClick={handleAddHeader} 
          style={{ width: '100%' }} 
          icon={<PlusOutlined />}
          className="add-header-button"
          size="small"
        >
          添加请求头
        </Button>
      )}
    />
  );
};

export default HeadersTable; 