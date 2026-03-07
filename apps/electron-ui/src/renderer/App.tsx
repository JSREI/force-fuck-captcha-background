import React from 'react';
import { Alert, Card, Space, Typography } from 'antd';
import './App.css';
import DirectoryActionPanel from './components/local-restore/DirectoryActionPanel';
import ProgressStatsPanel from './components/local-restore/ProgressStatsPanel';
import RunSummaryPanel from './components/local-restore/RunSummaryPanel';
import RunHistoryPanel from './components/local-restore/RunHistoryPanel';
import { statusColorMap } from './modules/local-restore/constants';
import { useLocalRestoreController } from './modules/local-restore/useLocalRestoreController';

const { Title, Text } = Typography;

const App: React.FC = () => {
  const {
    inputDir,
    outputDir,
    status,
    summary,
    history,
    busy,
    isRunning,
    canStart,
    progressPercent,
    durationSeconds,
    handleSelectInputDir,
    handleSelectOutputDir,
    handleStart,
    handleStop,
    handleOpenOutput,
    handleRestoreHistory,
    handleOpenHistoryOutput
  } = useLocalRestoreController();

  return (
    <div className="page">
      <Card>
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <div>
            <Title level={3} style={{ margin: 0 }}>验证码背景本地还原</Title>
            <Text type="secondary">
              递归读取验证码图片目录，按四角像素分组并进行逐像素投票，输出每组背景图和运行汇总。
            </Text>
          </div>

          <DirectoryActionPanel
            inputDir={inputDir}
            outputDir={outputDir}
            isRunning={isRunning}
            canStart={canStart}
            busy={busy}
            statusText={status.status.toUpperCase()}
            statusColor={statusColorMap[status.status] || 'default'}
            onSelectInputDir={handleSelectInputDir}
            onSelectOutputDir={handleSelectOutputDir}
            onStart={handleStart}
            onStop={handleStop}
            onOpenOutput={handleOpenOutput}
          />

          {status.errorMessage && <Alert type="error" message={status.errorMessage} />}

          <ProgressStatsPanel
            status={status}
            progressPercent={progressPercent}
            isRunning={isRunning}
            durationSeconds={durationSeconds}
          />

          {summary && <RunSummaryPanel summary={summary} />}

          <RunHistoryPanel
            history={history}
            onRestore={handleRestoreHistory}
            onOpenOutput={handleOpenHistoryOutput}
          />
        </Space>
      </Card>
    </div>
  );
};

export default App;

