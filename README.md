# Captcha Background SDK

这个仓库当前以两条主线为主：

1. TypeScript + React + Ant Design 前端（位于 apps/electron-ui）
2. Python SDK（位于 sdk/python/captcha-background-sdk）

## 目录划分

- apps/electron-ui
  - TypeScript + React + Ant Design（当前官网前端基础版本）
  - 前端源码在 apps/electron-ui/src/renderer
- sdk/python/captcha-background-sdk
  - Python SDK（背景映射 + 字体定位）

## 你要继续开发的官网前端路径

- 前端源码目录：apps/electron-ui/src/renderer
- React 入口：apps/electron-ui/src/renderer/index.tsx
- 页面主组件：apps/electron-ui/src/renderer/App.tsx
- 通用组件目录：apps/electron-ui/src/renderer/components

## 本地开发

### 1) 前端开发（仅开 webpack dev server）

- cd apps/electron-ui
- npm install
- npm run dev:webpack
- 默认地址：http://localhost:9000

### 2) 桌面端联调（Electron + 前端）

- cd apps/electron-ui
- npm run dev

### 3) 使用 Python SDK

- cd sdk/python/captcha-background-sdk
- pip install -r requirements.txt
- python examples/demo.py
