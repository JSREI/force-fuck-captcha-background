import React from 'react';
import { Layout, Typography } from 'antd';
import './AppLayout.css';
import GitHubStar from './GitHubStar';

const { Header, Content, Footer } = Layout;
const { Title } = Typography;

interface AppLayoutProps {
  children: React.ReactNode;
}

const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  return (
    <Layout className="app-layout">
      <Header className="app-header">
        <Title level={3} className="header-title">
          验证码辅助工具
        </Title>
        <div className="header-right">
          <GitHubStar />
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