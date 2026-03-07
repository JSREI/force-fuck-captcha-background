import React, { useMemo } from 'react';
import { Divider, Table, Typography } from 'antd';
import type { LocalRestoreSummary } from '../../../shared/local-restore-types';

const { Title } = Typography;

interface RunSummaryPanelProps {
  summary: LocalRestoreSummary;
}

const RunSummaryPanel: React.FC<RunSummaryPanelProps> = ({ summary }) => {
  const summaryColumns = useMemo(() => ([
    {
      title: '分组ID',
      dataIndex: 'id',
      key: 'id',
      sorter: (a: any, b: any) => String(a.id).localeCompare(String(b.id)),
      sortDirections: ['ascend', 'descend'] as ('ascend' | 'descend')[]
    },
    {
      title: '尺寸',
      key: 'size',
      render: (_: any, row: any) => `${row.width}x${row.height}`,
      sorter: (a: any, b: any) => (a.width - b.width) || (a.height - b.height),
      sortDirections: ['ascend', 'descend'] as ('ascend' | 'descend')[]
    },
    {
      title: '像素总数',
      key: 'pixelCount',
      render: (_: any, row: any) => row.width * row.height,
      sorter: (a: any, b: any) => (a.width * a.height) - (b.width * b.height),
      sortDirections: ['ascend', 'descend'] as ('ascend' | 'descend')[]
    },
    {
      title: '样本数',
      dataIndex: 'imageCount',
      key: 'imageCount',
      defaultSortOrder: 'descend' as const,
      sorter: (a: any, b: any) => a.imageCount - b.imageCount,
      sortDirections: ['descend', 'ascend'] as ('ascend' | 'descend')[]
    },
    {
      title: '输出文件',
      dataIndex: 'outputFile',
      key: 'outputFile',
      sorter: (a: any, b: any) => String(a.outputFile).localeCompare(String(b.outputFile)),
      sortDirections: ['ascend', 'descend'] as ('ascend' | 'descend')[]
    }
  ]), []);

  const errorColumns = useMemo(() => ([
    {
      title: '文件',
      dataIndex: 'file',
      key: 'file',
      sorter: (a: any, b: any) => String(a.file).localeCompare(String(b.file)),
      sortDirections: ['ascend', 'descend'] as ('ascend' | 'descend')[]
    },
    {
      title: '原因',
      dataIndex: 'reason',
      key: 'reason',
      sorter: (a: any, b: any) => String(a.reason).localeCompare(String(b.reason)),
      sortDirections: ['ascend', 'descend'] as ('ascend' | 'descend')[]
    }
  ]), []);

  return (
    <>
      <Divider />
      <Title level={4}>运行汇总</Title>
      <Table
        rowKey="id"
        dataSource={summary.buckets}
        size="small"
        pagination={{ pageSize: 10 }}
        showSorterTooltip={{ target: 'sorter-icon' }}
        columns={summaryColumns}
      />
      {summary.errors.length > 0 && (
        <>
          <Title level={5}>错误摘要（最多 200 条）</Title>
          <Table
            rowKey={(row) => `${row.file}-${row.reason}`}
            dataSource={summary.errors}
            size="small"
            pagination={{ pageSize: 10 }}
            showSorterTooltip={{ target: 'sorter-icon' }}
            columns={errorColumns}
          />
        </>
      )}
    </>
  );
};

export default RunSummaryPanel;

