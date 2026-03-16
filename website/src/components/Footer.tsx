import { Layout, Row, Col, Space, Typography } from 'antd';
import { GithubOutlined } from '@ant-design/icons';

const { Footer: AntFooter } = Layout;
const { Text, Link } = Typography;

const Footer = () => {
  return (
    <AntFooter style={{ background: '#f5f5f5', padding: '48px 0 24px' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px' }}>
        <Row gutter={[48, 24]}>
          <Col xs={24} md={8}>
            <Text strong style={{ fontSize: 16, display: 'block', marginBottom: 16 }}>
              Captcha Background SDK
            </Text>
            <Text type="secondary">
              验证码背景识别与还原 SDK，自动识别验证码类型，智能还原背景，统一结构化输出。
            </Text>
          </Col>
          <Col xs={24} md={8}>
            <Text strong style={{ fontSize: 16, display: 'block', marginBottom: 16 }}>
              链接
            </Text>
            <Space direction="vertical">
              <Link href="https://github.com/JSREI/force-fuck-captcha-background" target="_blank">
                <GithubOutlined /> GitHub
              </Link>
              <Link href="https://github.com/JSREI/force-fuck-captcha-background/releases" target="_blank">
                下载页面
              </Link>
              <Link href="https://pypi.org/project/captcha-background-sdk/" target="_blank">
                PyPI
              </Link>
            </Space>
          </Col>
          <Col xs={24} md={8}>
            <Text strong style={{ fontSize: 16, display: 'block', marginBottom: 16 }}>
              许可证
            </Text>
            <Text type="secondary">
              MIT License<br />
              Copyright © JSREI
            </Text>
          </Col>
        </Row>
        <div style={{ textAlign: 'center', marginTop: 48, paddingTop: 24, borderTop: '1px solid #e8e8e8' }}>
          <Text type="secondary">Copyright © {new Date().getFullYear()} JSREI. All rights reserved.</Text>
        </div>
      </div>
    </AntFooter>
  );
};

export default Footer;
