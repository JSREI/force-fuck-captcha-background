# 验证码辅助工具

这是一个基于Electron、React、TypeScript和Ant Design开发的验证码辅助工具。

## 功能特点

- 基于Electron实现跨平台支持
- 使用React+TypeScript开发前端界面
- 采用Ant Design组件库提供美观的UI界面

## 开发环境

- Node.js v14.0.0+
- npm v6.0.0+

## 安装与运行

### 安装依赖

```bash
# 使用cnpm安装依赖（推荐）
cnpm install

# 或使用npm安装依赖
npm install
```

### 开发模式

```bash
# 启动开发服务器和Electron应用
npm run dev
```

### 构建应用

```bash
# 构建Web资源和Electron应用
npm run build

# 仅构建Web资源
npm run build:webpack

# 仅构建Electron应用
npm run build:electron
```

## 项目结构

```
force-fuck-captcha-background/
├── src/                       # 源代码目录
│   ├── main/                  # Electron主进程代码
│   │   ├── main.ts            # 主进程入口文件
│   │   └── preload.ts         # 预加载脚本
│   └── renderer/              # 渲染进程代码
│       ├── components/        # React组件
│       ├── App.tsx            # 应用主组件
│       ├── App.css            # 应用样式
│       ├── index.html         # HTML模板
│       ├── index.tsx          # 渲染进程入口
│       └── index.css          # 全局样式
├── dist/                      # 构建输出目录
├── package.json               # 项目配置
├── tsconfig.json              # TypeScript配置
├── webpack.config.js          # Webpack配置
└── README.md                  # 项目说明
```

## 许可证

MIT 