import React from 'react';
import { Button, Divider, Space, Table, Tag, Tooltip, Typography } from 'antd';
import { statusColorMap } from '../../modules/local-restore/constants';
import type { RunHistoryItem } from '../../modules/local-restore/types';

const { Title, Text } = Typography;

interface RunHistoryPanelProps {
  history: RunHistoryItem[];
  onRestore: (item: RunHistoryItem) => void;
  onOpenOutput: (item: RunHistoryItem) => void;
}

const RunHistoryPanel: React.FC<RunHistoryPanelProps> = ({
  history,
  onRestore,
  onOpenOutput
}) => {
  const renderPathCell = (value: string) => (
    <Tooltip title={value || '-'}>
      <Text
        style={{ maxWidth: 260, display: 'inline-block' }}
        ellipsis
      >
        {value || '-'}
      </Text>
    </Tooltip>
  );

  return (
    <>
      <Divider />
      <Title level={4}>最近 10 次运行记录</Title>
      <Table
        rowKey="id"
        dataSource={history}
        size="small"
        pagination={{ pageSize: 10 }}
        locale={{ emptyText: '暂无运行记录' }}
        tableLayout="fixed"
        scroll={{ x: 1200, y: 420 }}
        columns={[
          {
            title: '开始时间',
            dataIndex: 'startedAt',
            key: 'startedAt',
            width: 180,
            defaultSortOrder: 'descend',
            sorter: (a: RunHistoryItem, b: RunHistoryItem) => a.startedAt - b.startedAt,
            render: (value: number) => new Date(value).toLocaleString()
          },
          {
            title: '状态',
            dataIndex: 'status',
            key: 'status',
            width: 100,
            sorter: (a: RunHistoryItem, b: RunHistoryItem) => String(a.status).localeCompare(String(b.status)),
            render: (value: string) => (
              <Tag color={statusColorMap[value] || 'default'}>{value.toUpperCase()}</Tag>
            )
          },
          {
            title: '输入目录',
            dataIndex: 'inputDir',
            key: 'inputDir',
            width: 280,
            ellipsis: true,
            sorter: (a: RunHistoryItem, b: RunHistoryItem) => String(a.inputDir).localeCompare(String(b.inputDir)),
            render: (value: string) => renderPathCell(value)
          },
          {
            title: '输出目录',
            dataIndex: 'outputDir',
            key: 'outputDir',
            width: 280,
            ellipsis: true,
            sorter: (a: RunHistoryItem, b: RunHistoryItem) => String(a.outputDir).localeCompare(String(b.outputDir)),
            render: (value: string) => renderPathCell(value)
          },
          {
            title: '进度',
            key: 'progress',
            width: 90,
            sorter: (a: RunHistoryItem, b: RunHistoryItem) => a.processedFiles - b.processedFiles,
            render: (_: unknown, row: RunHistoryItem) => `${row.processedFiles}/${row.imageFiles}`
          },
          {
            title: '分组数',
            dataIndex: 'bucketCount',
            key: 'bucketCount',
            width: 90,
            sorter: (a: RunHistoryItem, b: RunHistoryItem) => a.bucketCount - b.bucketCount
          },
          {
            title: '耗时',
            dataIndex: 'durationMs',
            key: 'durationMs',
            width: 90,
            sorter: (a: RunHistoryItem, b: RunHistoryItem) => a.durationMs - b.durationMs,
            render: (value: number) => `${Math.round(value / 1000)}s`
          },
          {
            title: '操作',
            key: 'actions',
            width: 190,
            render: (_: unknown, row: RunHistoryItem) => (
              <Space>
                <Button size="small" onClick={() => onRestore(row)}>恢复配置</Button>
                <Button size="small" onClick={() => onOpenOutput(row)}>打开输出目录</Button>
              </Space>
            )
          }
        ]}
      />
    </>
  );
};

export default RunHistoryPanel;
