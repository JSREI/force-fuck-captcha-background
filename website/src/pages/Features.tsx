import { Typography, Card, Row, Col, List, Tag, Space } from 'antd';
import { CheckCircleOutlined, RocketOutlined, ToolOutlined, SafetyOutlined } from '@ant-design/icons';

const { Title, Paragraph, Text } = Typography;

const Features = () => {
  const capabilities = [
    {
      title: '背景索引构建',
      description: '从背景目录构建 group_id -> 完整背景图 的映射',
      tags: ['Python', 'TypeScript'],
    },
    {
      title: '自动类型识别',
      description: '自动判断是文本验证码还是滑块验证码，返回置信度',
      tags: ['Python', 'TypeScript'],
    },
    {
      title: '文本验证码识别',
      description: '提取连通组件和文本区域框，支持逐字图提取',
      tags: ['Python', 'TypeScript'],
    },
    {
      title: '滑块验证码识别',
      description: '定位最大缺口区域，返回 bbox/center/patch',
      tags: ['Python', 'TypeScript'],
    },
    {
      title: '背景纹理分析',
      description: '直方图、熵、边缘密度、网格能量等多维度纹理特征',
      tags: ['Python'],
    },
    {
      title: '深度特征提取',
      description: '多尺度深度风格特征向量，支持下游模型服务',
      tags: ['Python'],
    },
    {
      title: '前景倾斜估计',
      description: '估计前景倾斜角度，支持可选的预校正流程',
      tags: ['Python'],
    },
    {
      title: '本地批量还原',
      description: '递归扫描验证码目录，逐像素投票还原背景',
      tags: ['Python', 'TypeScript'],
    },
  ];

  const highlights = [
    { icon: <RocketOutlined />, title: '高性能', desc: 'C++ 底层优化，毫秒级响应' },
    { icon: <ToolOutlined />, title: '易用性', desc: '一行代码调用，统一 API 设计' },
    { icon: <SafetyOutlined />, title: '可靠性', desc: '生产环境验证，稳定性保证' },
    { icon: <CheckCircleOutlined />, title: '完整性', desc: 'Python + TypeScript 双端支持' },
  ];

  return (
    <div style={{ padding: '80px 0' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px' }}>
        <Title level={2} style={{ textAlign: 'center', marginBottom: 24 }}>功能特性</Title>
        <Paragraph style={{ textAlign: 'center', fontSize: 16, color: '#666', marginBottom: 64 }}>
          Captcha Background SDK 提供完整的验证码识别与背景还原能力
        </Paragraph>

        <Row gutter={[32, 32]} style={{ marginBottom: 80 }}>
          {highlights.map((item, index) => (
            <Col xs={24} sm={12} md={6} key={index}>
              <Card style={{ textAlign: 'center', height: '100%' }}>
                <div style={{ fontSize: 48, color: '#1677ff', marginBottom: 16 }}>{item.icon}</div>
                <Title level={4}>{item.title}</Title>
                <Text type="secondary">{item.desc}</Text>
              </Card>
            </Col>
          ))}
        </Row>

        <Title level={3} style={{ marginBottom: 32 }}>API 能力清单</Title>
        <List
          grid={{ gutter: 24, xs: 1, sm: 1, md: 2 }}
          dataSource={capabilities}
          renderItem={(item) => (
            <List.Item>
              <Card
                title={item.title}
                extra={
                  <Space>
                    {item.tags.map((tag) => (
                      <Tag key={tag} color={tag === 'Python' ? 'blue' : 'green'}>
                        {tag}
                      </Tag>
                    ))}
                  </Space>
                }
              >
                {item.description}
              </Card>
            </List.Item>
          )}
        />
      </div>
    </div>
  );
};

export default Features;
