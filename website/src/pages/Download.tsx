import { Typography, Card, Row, Col, Button, Space, Tag, Table, Alert } from 'antd';
import { WindowsOutlined, AppleOutlined, LinuxOutlined, DownloadOutlined, GithubOutlined } from '@ant-design/icons';

const { Title, Paragraph, Text } = Typography;

const Download = () => {
  const releases = [
    { version: 'v1.0.0', date: '2024-03-15', status: 'latest', windows: '#', mac: '#', linux: '#' },
    { version: 'v0.9.0', date: '2024-02-20', status: 'stable', windows: '#', mac: '#', linux: '#' },
  ];

  const columns = [
    { title: '版本', dataIndex: 'version', key: 'version' },
    { title: '发布日期', dataIndex: 'date', key: 'date' },
    { title: '状态', dataIndex: 'status', key: 'status', render: (status: string) => (
      <Tag color={status === 'latest' ? 'green' : 'blue'}>{status === 'latest' ? '最新版' : '稳定版'}</Tag>
    )},
    { title: 'Windows', key: 'windows', render: () => (
      <Button size="small" icon={<WindowsOutlined />}>下载</Button>
    )},
    { title: 'macOS', key: 'mac', render: () => (
      <Button size="small" icon={<AppleOutlined />}>下载</Button>
    )},
    { title: 'Linux', key: 'linux', render: () => (
      <Button size="small" icon={<LinuxOutlined />}>下载</Button>
    )},
  ];

  return (
    <div style={{ padding: '80px 0' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px' }}>
        <Title level={2} style={{ textAlign: 'center', marginBottom: 24 }}>下载中心</Title>
        <Paragraph style={{ textAlign: 'center', fontSize: 16, color: '#666', marginBottom: 64 }}>
          下载 Captcha Background SDK 桌面端工具
        </Paragraph>

        <Alert
          message="提示"
          description="Electron UI 提供可视化的验证码处理和背景还原功能。SDK 开发者请直接使用 pip 或 npm 安装。"
          type="info"
          showIcon
          style={{ marginBottom: 48 }}
        />

        <Row gutter={[32, 32]} style={{ marginBottom: 64 }}>
          <Col xs={24} md={8}>
            <Card style={{ textAlign: 'center', height: '100%' }}>
              <WindowsOutlined style={{ fontSize: 64, color: '#1677ff', marginBottom: 24 }} />
              <Title level={4}>Windows</Title>
              <Paragraph type="secondary">Windows 10 / 11</Paragraph>
              <Button type="primary" size="large" icon={<DownloadOutlined />} style={{ marginTop: 16 }}>
                下载安装包
              </Button>
            </Card>
          </Col>
          <Col xs={24} md={8}>
            <Card style={{ textAlign: 'center', height: '100%' }}>
              <AppleOutlined style={{ fontSize: 64, color: '#1677ff', marginBottom: 24 }} />
              <Title level={4}>macOS</Title>
              <Paragraph type="secondary">macOS 10.15+ (Intel & Apple Silicon)</Paragraph>
              <Button type="primary" size="large" icon={<DownloadOutlined />} style={{ marginTop: 16 }}>
                下载安装包
              </Button>
            </Card>
          </Col>
          <Col xs={24} md={8}>
            <Card style={{ textAlign: 'center', height: '100%' }}>
              <LinuxOutlined style={{ fontSize: 64, color: '#1677ff', marginBottom: 24 }} />
              <Title level={4}>Linux</Title>
              <Paragraph type="secondary">Ubuntu / Debian / Fedora</Paragraph>
              <Button type="primary" size="large" icon={<DownloadOutlined />} style={{ marginTop: 16 }}>
                下载安装包
              </Button>
            </Card>
          </Col>
        </Row>

        <Title level={3} style={{ marginBottom: 24 }}>版本历史</Title>
        <Table
          columns={columns}
          dataSource={releases}
          rowKey="version"
          pagination={false}
        />

        <Card style={{ marginTop: 48, background: '#f6ffed', border: '1px solid #b7eb8f' }}>
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <Text strong style={{ fontSize: 16 }}>从源码构建</Text>
            <Text>如果你需要从源码构建，请访问 GitHub 仓库：</Text>
            <Button icon={<GithubOutlined />} href="https://github.com/JSREI/force-fuck-captcha-background" target="_blank">
              访问 GitHub 仓库
            </Button>
          </Space>
        </Card>
      </div>
    </div>
  );
};

export default Download;
