import { Typography, Card, Row, Col, List, Tag, Anchor, Space } from 'antd';
import { BookOutlined, ApiOutlined, CodeOutlined } from '@ant-design/icons';

const { Title, Paragraph, Text } = Typography;

const Docs = () => {
  const quickStartItems = [
    { title: '安装 Python SDK', description: 'pip install captcha-background-sdk', link: '#python-install' },
    { title: '安装 TypeScript SDK', description: 'npm install captcha-background-sdk', link: '#ts-install' },
    { title: '构建背景索引', description: '从背景目录构建 group_id 映射', link: '#background-index' },
    { title: '运行自动识别', description: '使用 recognize_auto_dict 完成类型判断和提取', link: '#auto-recognize' },
  ];

  const apiSections = [
    { title: 'CaptchaVisionSDK', desc: '统一入口类，提供所有识别能力', tags: ['Python', 'TypeScript'] },
    { title: 'CaptchaTextLocator', desc: '文本验证码专用定位器', tags: ['Python', 'TypeScript'] },
    { title: 'CaptchaSliderLocator', desc: '滑块验证码专用定位器', tags: ['Python', 'TypeScript'] },
    { title: 'recognize_auto_dict', desc: '自动类型识别并返回结构化结果', tags: ['Python', 'TypeScript'] },
    { title: 'run_local_restore_dict', desc: '本地批量还原背景图', tags: ['Python', 'TypeScript'] },
    { title: 'analyze_background_texture', desc: '背景纹理特征分析', tags: ['Python'] },
    { title: 'extract_background_deep_features', desc: '深度特征向量提取', tags: ['Python'] },
  ];

  const pythonCode = `# 快速开始示例
from captcha_background_sdk import CaptchaVisionSDK

# 1. 初始化
sdk = CaptchaVisionSDK()

# 2. 构建背景索引
sdk.build_background_index("/path/to/backgrounds")

# 3. 自动识别
result = sdk.recognize_auto_dict(
    captcha_path="/path/to/captcha.png",
    background_dir="/path/to/backgrounds"
)

# 4. 处理结果
if result["detected_type"] == "text":
    regions = result["text_payload"]["locate"]["regions"]
    print(f"发现 {len(regions)} 个文本区域")
elif result["detected_type"] == "slider":
    gap = result["slider_payload"]["locate"]["gap"]
    print(f"缺口位置: ({gap['x']}, {gap['y']})")`;

  return (
    <div style={{ padding: '80px 0' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px' }}>
        <Title level={2} style={{ textAlign: 'center', marginBottom: 24 }}>文档中心</Title>
        <Paragraph style={{ textAlign: 'center', fontSize: 16, color: '#666', marginBottom: 64 }}>
          全面的文档帮助你快速上手 Captcha Background SDK
        </Paragraph>

        <Row gutter={[48, 48]}>
          <Col xs={24} lg={8}>
            <Anchor
              items={[
                { key: 'quickstart', href: '#quickstart', title: '快速开始' },
                { key: 'api', href: '#api', title: 'API 参考' },
                { key: 'examples', href: '#examples', title: '示例代码' },
              ]}
            />
          </Col>

          <Col xs={24} lg={16}>
            <div id="quickstart" style={{ marginBottom: 64 }}>
              <Title level={3}>
                <BookOutlined style={{ marginRight: 12 }} />
                快速开始
              </Title>
              <Paragraph>按照以下步骤快速集成 SDK：</Paragraph>
              <List
                dataSource={quickStartItems}
                renderItem={(item) => (
                  <List.Item>
                    <Card style={{ width: '100%' }}>
                      <Text strong>{item.title}</Text>
                      <Paragraph type="secondary">{item.description}</Paragraph>
                    </Card>
                  </List.Item>
                )}
              />
            </div>

            <div id="api" style={{ marginBottom: 64 }}>
              <Title level={3}>
                <ApiOutlined style={{ marginRight: 12 }} />
                API 参考
              </Title>
              <List
                dataSource={apiSections}
                renderItem={(item) => (
                  <List.Item>
                    <Card style={{ width: '100%' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <Text strong style={{ fontSize: 16 }}>{item.title}</Text>
                          <Paragraph type="secondary">{item.desc}</Paragraph>
                        </div>
                        <Space>
                          {item.tags.map((tag) => (
                            <Tag key={tag} color={tag === 'Python' ? 'blue' : 'green'}>{tag}</Tag>
                          ))}
                        </Space>
                      </div>
                    </Card>
                  </List.Item>
                )}
              />
            </div>

            <div id="examples">
              <Title level={3}>
                <CodeOutlined style={{ marginRight: 12 }} />
                示例代码
              </Title>
              <Card title="Python 快速开始">
                <pre style={{ background: '#f6f8fa', padding: 16, borderRadius: 8, overflow: 'auto' }}>
                  <code>{pythonCode}</code>
                </pre>
              </Card>
            </div>
          </Col>
        </Row>
      </div>
    </div>
  );
};

export default Docs;
