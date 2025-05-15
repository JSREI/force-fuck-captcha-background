import React from 'react';
import { Table, Input, Button } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import './ParamsTable.css';

interface Param {
  key: string;
  value: string;
}

interface ParamsTableProps {
  params: Param[];
  onParamsChange: (params: Param[]) => void;
}

const ParamsTable: React.FC<ParamsTableProps> = ({ params, onParamsChange }) => {
  const handleAddParam = () => {
    onParamsChange([...params, { key: '', value: '' }]);
  };

  const handleParamChange = (index: number, field: 'key' | 'value', value: string) => {
    const newParams = [...params];
    newParams[index][field] = value;
    onParamsChange(newParams);
  };

  const handleRemoveParam = (index: number) => {
    const newParams = [...params];
    newParams.splice(index, 1);
    onParamsChange(newParams);
  };

  const columns = [
    {
      title: 'Key',
      dataIndex: 'key',
      key: 'key',
      render: (text: string, record: Param, index: number) => (
        <Input 
          value={text} 
          onChange={(e) => handleParamChange(index, 'key', e.target.value)} 
          placeholder="参数名称"
        />
      ),
    },
    {
      title: 'Value',
      dataIndex: 'value',
      key: 'value',
      render: (text: string, record: Param, index: number) => (
        <Input 
          value={text} 
          onChange={(e) => handleParamChange(index, 'value', e.target.value)} 
          placeholder="参数值"
        />
      ),
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: Param, index: number) => (
        <Button 
          type="text" 
          danger 
          icon={<DeleteOutlined />} 
          onClick={() => handleRemoveParam(index)} 
        />
      ),
    },
  ];

  return (
    <Table 
      className="params-table"
      dataSource={params}
      columns={columns}
      pagination={false}
      rowKey={(record, index) => `param-${index}`}
      size="small"
      footer={() => (
        <Button 
          type="dashed" 
          onClick={handleAddParam} 
          style={{ width: '100%' }} 
          icon={<PlusOutlined />}
          className="add-param-button"
          size="small"
        >
          添加参数
        </Button>
      )}
    />
  );
};

export default ParamsTable; 