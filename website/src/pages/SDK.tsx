import { Typography, Card, Row, Col, Space, Tag, Button, Divider } from 'antd';
import { PythonOutlined, CodeOutlined, CopyOutlined, CheckOutlined } from '@ant-design/icons';
import { useState } from 'react';

const { Title, Paragraph, Text } = Typography;

const SDK = () => {
  const [copied, setCopied] = useState<string | null>(null);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  const pythonInstall = 'pip install captcha-background-sdk';
  const tsInstall = 'npm install captcha-background-sdk';

  const pythonExample = `from captcha_background_sdk import CaptchaVisionSDK, CaptchaType, GlyphRenderMode

# 初始化 SDK
sdk = CaptchaVisionSDK(
    diff_threshold=18,
    font_min_component_pixels=8,
    slider_min_gap_pixels=20,
)

# 构建背景索引
sdk.build_background_index("/path/to/backgrounds")

# 自动识别（推荐）
result = sdk.recognize_auto_dict(
    captcha_path="/path/to/captcha.png",
    background_dir="/path/to/backgrounds"
)
print(f"类型: {result['detected_type']}, 置信度: {result['confidence']}")

# 本地批量还原
summary = sdk.run_local_restore_dict(
    input_dir="/path/to/captchas",
    output_dir="/path/to/output",
    clear_output_before_run=True
)`;

  const tsExample = `import { CaptchaVisionSDK } from 'captcha-background-sdk';

// 初始化 SDK
const sdk = new CaptchaVisionSDK({
  diffThreshold: 18,
  fontMinComponentPixels: 8,
  sliderMinGapPixels: 20,
});

// 本地还原
const summary = await sdk.runLocalRestoreDict({
  inputDir: '/path/to/captchas',
  outputDir: '/path/to/output',
  clearOutputBeforeRun: true,
});

// 自动识别
const result = await sdk.recognizeAutoDict({
  captchaPath: '/path/to/captcha.png',
  backgroundDir: '/path/to/backgrounds',
});
console.log('类型:', result.detectedType, '置信度:', result.confidence);`;

  return (
    <div style={{ padding: '80px 0' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px' }}>
        <Title level={2} style={{ textAlign: 'center', marginBottom: 24 }}>SDK 文档</Title>
        <Paragraph style={{ textAlign: 'center', fontSize: 16, color: '#666', marginBottom: 64 }}>
          选择适合你的 SDK，开始集成验证码识别能力
        </Paragraph>

        <Row gutter={[48, 48]}>
          <Col xs={24} md={12}>
            <Card
              title={
                <Space>
                  <PythonOutlined style={{ fontSize: 24, color: '#1677ff' }} />
                  <span>Python SDK</span>
                  <Tag color="blue">PyPI</Tag>
                </Space>
              }
            >
              <Paragraph>
                <Text strong>安装</Text>
                <div style={{ background: '#f6f8fa', padding: 12, borderRadius: 6, marginTop: 8, position: 'relative' }}>
                  <code>{pythonInstall}</code>
                  <Button
                    size="small"
                    icon={copied === 'py-install' ? <CheckOutlined /> : <CopyOutlined />}
                    style={{ position: 'absolute', right: 8, top: 8 }}
                    onClick={() => handleCopy(pythonInstall, 'py-install')}
                  />
                </div>
              </Paragraph>
              <Divider />
              <Paragraph>
                <Text strong>快速示例</Text>
                <pre style={{ background: '#f6f8fa', padding: 12, borderRadius: 6, overflow: 'auto', marginTop: 8 }}>
                  <code>{pythonExample}</code>
                </pre>
              </Paragraph>
              <Button type="primary" href="https://pypi.org/project/captcha-background-sdk/" target="_blank">
                查看 PyPI 页面
              </Button>
            </Card>
          </Col>

          <Col xs={24} md={12}>
            <Card
              title={
                <Space>
                  <CodeOutlined style={{ fontSize: 24, color: '#13c2c2' }} />
                  <span>TypeScript SDK</span>
                  <Tag color="green">npm</Tag>
                </Space>
              }
            >
              <Paragraph>
                <Text strong>安装</Text>
                <div style={{ background: '#f6f8fa', padding: 12, borderRadius: 6, marginTop: 8, position: 'relative' }}>
                  <code>{tsInstall}</code>
                  <Button
                    size="small"
                    icon={copied === 'ts-install' ? <CheckOutlined /> : <CopyOutlined />}
                    style={{ position: 'absolute', right: 8, top: 8 }}
                    onClick={() => handleCopy(tsInstall, 'ts-install')}
                  />
                </div>
              </Paragraph>
              <Divider />
              <Paragraph>
                <Text strong>快速示例</Text>
                <pre style={{ background: '#f6f8fa', padding: 12, borderRadius: 6, overflow: 'auto', marginTop: 8 }}>
                  <code>{tsExample}</code>
                </pre>
              </Paragraph>
              <Button type="primary" href="https://github.com/JSREI/force-fuck-captcha-background/tree/main/typescript-sdk" target="_blank">
                查看 GitHub
              </Button>
            </Card>
          </Col>
        </Row>
      </div>
    </div>
  );
};

export default SDK;
