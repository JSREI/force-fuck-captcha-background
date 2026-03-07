# JSREI Workspace

这个仓库已按模块拆分为多目录结构，避免 UI 工具和 Python SDK 混在根目录。

## 目录划分

```text
.
├── apps/
│   └── electron-ui/              # Electron + React 桌面界面工具
├── sdk/
│   └── python/
│       └── captcha-background-sdk/     # Python SDK（背景映射 + 字体定位）
├── LICENSE
└── README.md
```

## 快速使用

### 1) 启动界面工具

```bash
cd apps/electron-ui
npm install
npm run dev
```

### 2) 使用 Python SDK

```bash
cd sdk/python/captcha-background-sdk
pip install -r requirements.txt
python examples/demo.py
```

### 3) 查看与维护 API 文档（VitePress）

```bash
cd docs
npm install
npm run docs:dev
```

构建静态站点：

```bash
cd docs
npm run docs:build
```

文档部署由 GitHub Actions 自动执行：
- 工作流：`.github/workflows/docs-pages.yml`
- 触发：`push main`、`release published`、`workflow_dispatch`
