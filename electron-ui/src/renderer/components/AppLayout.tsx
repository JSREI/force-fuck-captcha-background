import React from 'react';
import { Layout, Typography } from 'antd';
import './AppLayout.css';
import GitHubStar from './GitHubStar';
import { SettingsButton } from './Settings';

const { Header, Content, Footer } = Layout;
const { Title } = Typography;

interface AppLayoutProps {
  children: React.ReactNode;
  navContent?: React.ReactNode;
  headerContent?: React.ReactNode;
}

const AppLayout: React.FC<AppLayoutProps> = ({ children, navContent, headerContent }) => {
  return (
    <Layout className="app-layout">
      <Header className="app-header">
        <Title level={3} className="header-title">
          验证码辅助工具
        </Title>
        {navContent && <div className="header-nav">{navContent}</div>}
        <div className="header-right">
          <SettingsButton />
          <GitHubStar />
          {headerContent}
        </div>
      </Header>
      <Content className="app-content">
        <div className="content-container">
          {children}
        </div>
      </Content>
      <Footer className="app-footer">
        ©{new Date().getFullYear()} 验证码辅助工具
      </Footer>
    </Layout>
  );
};

export default AppLayout; 
