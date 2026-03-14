# 部署到 GitHub Pages

本仓库已提供自动部署工作流：

- 工作流文件：`.github/workflows/docs-pages.yml`
- 触发条件：
  - `push` 到 `main`
  - `release` 发布
  - 手动触发 `workflow_dispatch`

## 一次性配置

1. 打开 GitHub 仓库设置。
2. 进入 `Settings -> Pages`。
3. `Build and deployment -> Source` 选择 `GitHub Actions`。

## Base 路径说明

工作流默认设置：

- `VITEPRESS_BASE=/force-fuck-captcha-background/`

如果你将来改仓库名或使用自定义域名，需要同步调整这个值。
