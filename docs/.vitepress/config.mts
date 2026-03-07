import { defineConfig } from "vitepress";

const repo = "https://github.com/JSREI/force-fuck-captcha-background";

export default defineConfig({
  title: "Captcha Background SDK",
  description: "验证码背景识别与类型路由 API 文档",
  lang: "zh-CN",
  base: process.env.VITEPRESS_BASE || "/",
  lastUpdated: true,
  themeConfig: {
    siteTitle: "Captcha SDK Docs",
    nav: [
      { text: "指南", link: "/guide/quickstart" },
      { text: "API", link: "/api/overview" },
      { text: "GitHub", link: repo }
    ],
    sidebar: {
      "/guide/": [
        { text: "快速开始", link: "/guide/quickstart" },
        { text: "类型路由策略", link: "/guide/type-routing" },
        { text: "部署到 GitHub Pages", link: "/guide/deploy" }
      ],
      "/api/": [
        { text: "API 总览", link: "/api/overview" },
        { text: "自动识别主 API", link: "/api/auto" },
        { text: "文本验证码 API", link: "/api/text" },
        { text: "滑块验证码 API", link: "/api/slider" },
        { text: "背景分析 API", link: "/api/background" },
        { text: "本地还原 API", link: "/api/local-restore" }
      ]
    },
    socialLinks: [{ icon: "github", link: repo }],
    footer: {
      message: "MIT License",
      copyright: "Copyright © JSREI"
    }
  },
  markdown: {
    lineNumbers: true
  }
});
