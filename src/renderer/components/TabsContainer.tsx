import React from 'react';
import { Tabs, Card } from 'antd';
import './TabsContainer.css';

const { TabPane } = Tabs;

export interface TabItem {
  key: string;
  title: string;
  content: React.ReactNode;
}

interface TabsContainerProps {
  tabs: TabItem[];
  activeKey: string;
  onChange: (activeKey: string) => void;
}

const TabsContainer: React.FC<TabsContainerProps> = ({ 
  tabs, 
  activeKey, 
  onChange 
}) => {
  return (
    <Card className="tabs-container-card" bordered={false}>
      <Tabs
        activeKey={activeKey}
        onChange={onChange}
        className="request-tabs"
      >
        {tabs.map(tab => (
          <TabPane tab={tab.title} key={tab.key}>
            {tab.content}
          </TabPane>
        ))}
      </Tabs>
    </Card>
  );
};

export default TabsContainer; 