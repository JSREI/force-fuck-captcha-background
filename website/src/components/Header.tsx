import { Layout, Menu, Button, Space } from 'antd';
import { GithubOutlined, DownloadOutlined } from '@ant-design/icons';
import { Link, useLocation } from 'react-router-dom';

const { Header: AntHeader } = Layout;

const Header = () => {
  const location = useLocation();

  const menuItems = [
    { key: '/', label: <Link to="/">首页</Link> },
    { key: '/features', label: <Link to="/features">功能</Link> },
    { key: '/sdk', label: <Link to="/sdk">SDK</Link> },
    { key: '/docs', label: <Link to="/docs">文档</Link> },
    { key: '/download', label: <Link to="/download">下载</Link> },
  ];

  return (
    <AntHeader style={{ background: '#fff', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <Link to="/" style={{ fontSize: 20, fontWeight: 700, marginRight: 48, color: '#1677ff' }}>
            Captcha SDK
          </Link>
          <Menu
            mode="horizontal"
            selectedKeys={[location.pathname]}
            items={menuItems}
            style={{ border: 'none', minWidth: 400 }}
          />
        </div>
        <Space>
          <Button
            type="primary"
            icon={<DownloadOutlined />}
            href="https://github.com/JSREI/force-fuck-captcha-background/releases/latest"
            target="_blank"
          >
            下载 GUI
          </Button>
          <Button
            icon={<GithubOutlined />}
            href="https://github.com/JSREI/force-fuck-captcha-background"
            target="_blank"
          >
            GitHub
          </Button>
        </Space>
      </div>
    </AntHeader>
  );
};

export default Header;
