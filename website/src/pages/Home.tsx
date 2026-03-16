import { Row, Col, Typography, Button, Space, Card, Steps, Badge } from 'antd';
import { ArrowRightOutlined, GithubOutlined, DownloadOutlined, ExperimentOutlined, PictureOutlined, BoxPlotOutlined } from '@ant-design/icons';
import { Link } from 'react-router-dom';

const { Title, Paragraph, Text } = Typography;

const HeroSection = () => {
  return (
    <div style={{ background: 'linear-gradient(135deg, #1677ff 0%, #13c2c2 100%)', padding: '120px 0 80px', color: '#fff' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px', textAlign: 'center' }}>
        <Badge count="v1.0" style={{ backgroundColor: '#52c41a', marginBottom: 24 }}>
          <Title level={1} style={{ color: '#fff', marginBottom: 0, fontSize: 48 }}>
            Captcha Background SDK
          </Title>
        </Badge>
        <Paragraph style={{ fontSize: 24, color: 'rgba(255,255,255,0.9)', margin: '32px 0' }}>
          同一个 Bucket 多图聚合，输出可复用背景图
        </Paragraph>
        <Paragraph style={{ fontSize: 16, color: 'rgba(255,255,255,0.8)', maxWidth: 700, margin: '0 auto 48px' }}>
          自动识别验证码类型，智能还原背景，统一结构化输出。
          <br />
          你给我验证码图和背景目录，SDK 自动完成背景恢复、类型判断与坐标输出。
        </Paragraph>
        <Space size="large">
          <Button type="primary" size="large" icon={<ArrowRightOutlined />} style={{ background: '#fff', color: '#1677ff', borderColor: '#fff' }}>
            <Link to="/docs" style={{ color: 'inherit' }}>快速开始</Link>
          </Button>
          <Button size="large" icon={<DownloadOutlined />} style={{ background: 'transparent', color: '#fff', borderColor: '#fff' }}>
            <Link to="/download" style={{ color: 'inherit' }}>下载 GUI</Link>
          </Button>
          <Button size="large" icon={<GithubOutlined />} style={{ background: 'transparent', color: '#fff', borderColor: '#fff' }}>
            <a href="https://github.com/JSREI/force-fuck-captcha-background" target="_blank" rel="noopener noreferrer" style={{ color: 'inherit' }}>GitHub</a>
          </Button>
        </Space>
      </div>
    </div>
  );
};

const FeatureCard = ({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) => (
  <Card style={{ height: '100%', borderRadius: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}>
    <div style={{ fontSize: 48, color: '#1677ff', marginBottom: 24 }}>{icon}</div>
    <Title level={4} style={{ marginBottom: 16 }}>{title}</Title>
    <Paragraph type="secondary">{description}</Paragraph>
  </Card>
);

const FeaturesSection = () => {
  const features = [
    {
      icon: <ExperimentOutlined />,
      title: '自动类型识别',
      description: '自动判断文本验证码 vs 滑块验证码，无需人工干预，一次调用完成路由，支持置信度输出和阈值调节。',
    },
    {
      icon: <PictureOutlined />,
      title: '智能背景还原',
      description: '同 Bucket 多图聚合去噪，逐像素投票算法恢复原始背景，支持本地批量处理，一键还原完整背景图。',
    },
    {
      icon: <BoxPlotOutlined />,
      title: '统一结构化输出',
      description: '文本验证码返回 bbox / 逐字图 / 位置信息，滑块验证码返回缺口坐标 / 中心点 / Patch 图，标准 JSON 格式直接可用。',
    },
  ];

  return (
    <div style={{ padding: '80px 0', background: '#f5f5f5' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px' }}>
        <Title level={2} style={{ textAlign: 'center', marginBottom: 64 }}>核心特性</Title>
        <Row gutter={[32, 32]}>
          {features.map((f, i) => (
            <Col xs={24} md={8} key={i}>
              <FeatureCard {...f} />
            </Col>
          ))}
        </Row>
      </div>
    </div>
  );
};

const WorkflowSection = () => {
  return (
    <div style={{ padding: '80px 0' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px' }}>
        <Title level={2} style={{ textAlign: 'center', marginBottom: 64 }}>同一个 Bucket 的真实流程</Title>

        <Card style={{ marginBottom: 48, overflow: 'hidden' }}>
          <img
            src="/images/same-bucket-flow.png"
            alt="Same Bucket Flow"
            style={{ width: '100%', height: 'auto', display: 'block' }}
          />
        </Card>

        <Steps
          direction="horizontal"
          current={-1}
          items={[
            { title: '输入', description: '同 bucket 多图输入' },
            { title: '聚合', description: 'SDK 聚合去噪' },
            { title: '输出', description: '1 张可复用背景图' },
            { title: '识别', description: '自动类型判断' },
            { title: '结果', description: '结构化坐标输出' },
          ]}
        />
        <Card style={{ marginTop: 48, background: '#f6ffed', border: '1px solid #b7eb8f' }}>
          <Text strong style={{ fontSize: 18, display: 'block', marginBottom: 16 }}>
            一句话说清楚：
          </Text>
          <Text style={{ fontSize: 16 }}>
            同 bucket 多图输入 -&gt; SDK 聚合去噪 -&gt; 1 张可复用背景图输出
          </Text>
        </Card>
      </div>
    </div>
  );
};

const CodeExampleSection = () => {
  const pythonCode = `from captcha_background_sdk import CaptchaVisionSDK

sdk = CaptchaVisionSDK()
sdk.build_background_index("/path/to/backgrounds")

# 自动识别（推荐）
result = sdk.recognize_auto_dict(
    captcha_path="/path/to/captcha.png",
    background_dir="/path/to/backgrounds"
)
print(result["detected_type"], result["confidence"])`;

  const tsCode = `import { CaptchaVisionSDK } from 'captcha-background-sdk';

const sdk = new CaptchaVisionSDK();

// 本地还原
const summary = await sdk.run_local_restore_dict(
  '/path/to/captchas',
  '/path/to/output',
  true
);

// 自动识别
const auto = await sdk.recognize_auto_dict(
  '/path/to/captcha.png',
  '/path/to/backgrounds'
);`;

  return (
    <div style={{ padding: '80px 0', background: '#f5f5f5' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px' }}>
        <Title level={2} style={{ textAlign: 'center', marginBottom: 64 }}>快速开始</Title>
        <Row gutter={[48, 48]}>
          <Col xs={24} md={12}>
            <Card title="Python SDK" extra={<Text type="secondary">pip install captcha-background-sdk</Text>}>
              <pre style={{ background: '#f6f8fa', padding: 16, borderRadius: 8, overflow: 'auto' }}>
                <code>{pythonCode}</code>
              </pre>
            </Card>
          </Col>
          <Col xs={24} md={12}>
            <Card title="TypeScript SDK" extra={<Text type="secondary">npm install captcha-background-sdk</Text>}>
              <pre style={{ background: '#f6f8fa', padding: 16, borderRadius: 8, overflow: 'auto' }}>
                <code>{tsCode}</code>
              </pre>
            </Card>
          </Col>
        </Row>
        <div style={{ textAlign: 'center', marginTop: 48 }}>
          <Button type="primary" size="large">
            <Link to="/sdk">查看完整 SDK 文档</Link>
          </Button>
        </div>
      </div>
    </div>
  );
};

const Home = () => {
  return (
    <>
      <HeroSection />
      <FeaturesSection />
      <WorkflowSection />
      <CodeExampleSection />
    </>
  );
};

export default Home;
