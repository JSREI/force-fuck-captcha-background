import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

// 添加调试信息
console.log('App开始加载...');

// 等待DOM完全加载
document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM已加载，准备渲染React应用');
  
  const container = document.getElementById('root');
  
  if (!container) {
    console.error('找不到root元素!');
    return;
  }
  
  const root = createRoot(container);
  
  console.log('开始渲染React应用...');
  
  try {
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
    console.log('React应用渲染完成');
  } catch (error) {
    console.error('React渲染失败:', error);
  }
}); 