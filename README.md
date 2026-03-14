# Captcha Background SDK

在线官网: https://jsrei.github.io/force-fuck-captcha-background/

这个仓库当前分为四部分：

1. Electron UI 桌面端界面（`electron-ui/`）
2. Python SDK（`python-sdk/`，发布到 PyPI）
3. TypeScript SDK（`typescript-sdk/`）
4. 文档网站（`doc-website/`，GitHub Pages 部署）

## 目录划分

```text
.
├── electron-ui/     # Electron + React 桌面端界面
├── python-sdk/      # Python SDK（背景映射 + 字体定位）
├── typescript-sdk/  # TypeScript SDK（本地还原能力）
├── doc-website/     # VitePress 文档站（GitHub Pages）
└── README.md
```

## Electron UI 开发路径

- 前端源码目录：electron-ui/src/renderer
- React 入口：electron-ui/src/renderer/index.tsx
- 页面主组件：electron-ui/src/renderer/App.tsx
- 通用组件目录：electron-ui/src/renderer/components

## 本地开发

### 1) Electron UI 前端开发（仅开 webpack dev server）

- cd electron-ui
- npm install
- npm run dev:webpack
- 默认地址：http://localhost:9000

### 2) 桌面端联调（Electron + 前端）

- cd electron-ui
- npm run dev

### 3) 使用 Python SDK

- cd python-sdk
- pip install -r requirements.txt
- python examples/demo.py

### 4) 使用 TypeScript SDK

- cd typescript-sdk
- npm install
- npm run build

### 5) 文档站（VitePress）

- cd doc-website
- npm install
- npm run docs:dev

构建静态站点：

- cd doc-website
- npm run docs:build

文档部署由 GitHub Actions 自动执行（GitHub Pages）：
- 工作流：`.github/workflows/docs-pages.yml`
- 触发：`push main`、`release published`、`workflow_dispatch`
