import React, { useState } from 'react';
import { Alert, Button, Col, Divider, List, Menu, Row, Space, Steps, Tag, Typography } from 'antd';
import './App.css';
import AppLayout from './components/AppLayout';
import DirectoryActionPanel from './components/local-restore/DirectoryActionPanel';
import ProgressStatsPanel from './components/local-restore/ProgressStatsPanel';
import RunSummaryPanel from './components/local-restore/RunSummaryPanel';
import RunHistoryPanel from './components/local-restore/RunHistoryPanel';
import { statusColorMap } from './modules/local-restore/constants';
import { useLocalRestoreController } from './modules/local-restore/useLocalRestoreController';
const bucketFlowImage = require('./assets/same-bucket-flow.png') as string;
const restoreFlowImage = require('./assets/background-restore-flow.svg') as string;

const { Title, Text, Paragraph } = Typography;
const { Step } = Steps;

const App: React.FC = () => {
  const [activeView, setActiveView] = useState<'home' | 'workspace'>('workspace');

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

  const deliverables = [
    { title: '背景图集合', desc: '每组背景图与投票结果统计' },
    { title: '运行汇总', desc: '耗时、样本数量与成功率指标' },
    { title: '映射关系', desc: '保留样本来源与分组结构' }
  ];

  const featureCards = [
    {
      title: '样本聚类',
      desc: '递归扫描目录，按四角像素快速归并验证码样本。'
    },
    {
      title: '背景还原',
      desc: '逐像素投票生成纯净背景图，保留可复现的输出路径。'
    },
    {
      title: '统计汇总',
      desc: '自动输出样本分布、耗时与进度，方便评估效果。'
    },
    {
      title: 'SDK 集成',
      desc: 'Python SDK 覆盖背景映射、字体定位与批量任务。'
    }
  ];

  const quickStartSteps = [
    {
      title: '准备样本目录',
      desc: '整理验证码图片，建议按业务或渠道分层存放。'
    },
    {
      title: '运行本地还原工具',
      desc: '选择输入/输出目录并启动任务，实时查看进度。'
    },
    {
      title: '核查输出结果',
      desc: '检查背景图合集与汇总统计，定位异常分组。'
    },
    {
      title: '接入 SDK 批处理',
      desc: '将稳定模板与定位流程接入你的数据管线。'
    }
  ];

  const sdkHighlights = [
    '背景映射与模板归并，快速得到可复用的背景集合。',
    '字体定位与区域裁剪，为训练/识别提供稳定输入。',
    '批量任务执行与历史记录追踪，便于复跑与对比。',
    '本地离线运行，数据不出机，满足安全与合规要求。'
  ];

  const scenarioTags = [
    '验证码背景分析',
    '批量数据清洗',
    '模型数据准备',
    '反向工程调试',
    '离线安全处理'
  ];

  const principles = [
    {
      title: '同类样本归并',
      desc: '通过四角像素快速分桶，确保相同背景进入同一组，减少噪声干扰。',
      image: bucketFlowImage,
      alt: '同类样本归并示意图'
    },
    {
      title: '像素投票还原',
      desc: '对每组样本做逐像素投票，生成可复用的纯净背景图。',
      image: restoreFlowImage,
      alt: '背景还原流程示意图'
    }
  ];

  const renderHome = () => (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      <section className="hero" id="overview">
        <div className="hero-content">
          <Tag color="blue">SDK + 本地工具</Tag>
          <Title level={2} className="hero-title">Captcha Background SDK 文档中心</Title>
          <Paragraph className="hero-subtitle">
            面向验证码背景还原与字体定位的本地优先工具链。通过可复现算法与可解释统计，
            帮助你快速搭建批量处理与模板复用流程。
          </Paragraph>
          <Text type="secondary">支持 Python SDK 调用，可直接接入你的数据处理流水线。</Text>
          <Space wrap className="hero-actions">
            <Button type="primary" size="large" href="#quick-start">快速开始</Button>
            <Button size="large" href="#sdk">SDK 能力</Button>
            <Button size="large" onClick={() => setActiveView('workspace')}>进入工作区</Button>
          </Space>
          <div className="hero-meta">
            <Tag color="geekblue">离线优先</Tag>
            <Tag color="green">可追溯</Tag>
            <Tag color="gold">批量处理</Tag>
            <Tag>TypeScript + React + Ant Design</Tag>
          </div>
        </div>
      </section>

      <section id="principles" className="section">
        <div className="section-header">
          <Title level={3} className="section-title">工作原理</Title>
          <Text type="secondary">从归并到还原，核心流程清晰可解释。</Text>
        </div>
        <Row gutter={[16, 16]}>
          {principles.map((item) => (
            <Col xs={24} key={item.title}>
              <div className="flat-card principle-card">
                <div className="principle-media">
                  <img src={item.image} alt={item.alt} className="principle-image" />
                </div>
                <div className="principle-body">
                  <Title level={5} className="feature-title">{item.title}</Title>
                  <Text className="feature-desc">{item.desc}</Text>
                </div>
              </div>
            </Col>
          ))}
        </Row>
      </section>

      <section id="deliverables" className="section">
        <div className="section-header">
          <Title level={3} className="section-title">关键产出</Title>
          <Text type="secondary">每次任务都会生成可追踪的结果与指标。</Text>
        </div>
        <Row gutter={[12, 12]}>
          {deliverables.map((item) => (
            <Col xs={24} md={8} key={item.title}>
              <div className="flat-card">
                <Title level={5} className="feature-title">{item.title}</Title>
                <Text className="feature-desc">{item.desc}</Text>
              </div>
            </Col>
          ))}
        </Row>
      </section>

      <section id="features" className="section">
        <div className="section-header">
          <Title level={3} className="section-title">核心能力</Title>
          <Text type="secondary">覆盖样本采集、背景还原、统计汇总到 SDK 集成的完整链路。</Text>
        </div>
        <Row gutter={[16, 16]}>
          {featureCards.map((item) => (
            <Col xs={24} sm={12} lg={6} key={item.title}>
              <div className="flat-card feature-card">
                <Title level={5} className="feature-title">{item.title}</Title>
                <Text className="feature-desc">{item.desc}</Text>
              </div>
            </Col>
          ))}
        </Row>
      </section>

      <section id="quick-start" className="section">
        <div className="section-header">
          <Title level={3} className="section-title">快速开始</Title>
          <Text type="secondary">按照最短路径完成样本准备、背景还原与结果校验。</Text>
        </div>
        <Row gutter={[16, 16]}>
          <Col xs={24} lg={12}>
            <div className="flat-card process-card">
              <Title level={4} className="card-title">推荐流程</Title>
              <Steps direction="vertical" size="small">
                {quickStartSteps.map((step) => (
                  <Step key={step.title} title={step.title} description={step.desc} />
                ))}
              </Steps>
            </div>
          </Col>
          <Col xs={24} lg={12}>
            <div className="flat-card highlight-card">
              <Title level={4} className="card-title">本地开发提示</Title>
              <Space direction="vertical" size="small">
                <Text>前端入口：<Text code>electron-ui/src/renderer/App.tsx</Text></Text>
                <Text>开发命令：<Text code>npm run dev:webpack</Text>（默认 http://localhost:9000）</Text>
                <Text>桌面端联调：<Text code>npm run dev</Text></Text>
                <Text type="secondary">更多细节可在项目 README 中查看。</Text>
              </Space>
            </div>
          </Col>
        </Row>
      </section>

      <section id="sdk" className="section">
        <div className="section-header">
          <Title level={3} className="section-title">SDK 能力速览</Title>
          <Text type="secondary">面向批量处理与复用模板的 Python 工具链。</Text>
        </div>
        <Row gutter={[16, 16]}>
          <Col xs={24} lg={14}>
            <div className="flat-card feature-card">
              <Title level={4} className="card-title">你会获得什么</Title>
              <List
                className="plain-list"
                dataSource={sdkHighlights}
                renderItem={(item) => (
                  <List.Item>
                    <Text>{item}</Text>
                  </List.Item>
                )}
              />
            </div>
          </Col>
          <Col xs={24} lg={10}>
            <div className="flat-card feature-card">
              <Title level={4} className="card-title">适用场景</Title>
              <div className="section-tags">
                {scenarioTags.map((tag) => (
                  <Tag key={tag} color="blue">{tag}</Tag>
                ))}
              </div>
              <Divider />
              <Text type="secondary">
                需要更细粒度的接口说明时，可在源码目录中查阅 SDK README 与示例脚本。
              </Text>
            </div>
          </Col>
        </Row>
      </section>
    </Space>
  );

  const renderWorkspace = () => (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      <section id="workspace" className="section">
        <div className="section-header">
          <Title level={3} className="section-title">工作区</Title>
          <Text type="secondary">选择输入与输出目录，直接开始本地合并与还原。</Text>
        </div>
        <div className="flat-card local-restore-card">
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
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
        </div>
      </section>
    </Space>
  );

  const navMenu = (
    <Menu
      mode="horizontal"
      className="header-menu"
      selectedKeys={[activeView]}
      onClick={(e) => setActiveView(e.key as 'home' | 'workspace')}
      items={[
        { key: 'home', label: '首页' },
        { key: 'workspace', label: '工作区' }
      ]}
    />
  );

  return (
    <AppLayout navContent={navMenu}>
      <div className="page home-page">
        {activeView === 'home' ? renderHome() : renderWorkspace()}
      </div>
    </AppLayout>
  );
};

export default App;
