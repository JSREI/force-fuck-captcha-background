---
layout: home
title: Captcha Background SDK 文档
hero:
  name: "Captcha Background SDK"
  text: "背景识别 + 文本/滑块类型路由"
  tagline: "输入验证码 + 背景目录，自动识别类型并返回对应提取结果。"
  actions:
    - theme: brand
      text: 快速开始
      link: /guide/quickstart
    - theme: alt
      text: 查看主 API
      link: /api/auto
features:
  - title: 自动类型路由
    details: 统一入口 recognize_auto_dict，一次请求内决定 text/slider/unknown。
  - title: 文本验证码处理
    details: 返回文本区域、连通域组件，并可输出文本图层与逐字抠图。
  - title: 滑块验证码处理
    details: 返回缺口 bbox/center，并可导出验证码缺口 patch 和背景对位 patch。
  - title: 背景深度特征
    details: 提供纹理统计与多尺度特征向量，便于对接 deep API。
---

## 适用场景

- 验证码自动化平台中的“背景匹配 + 类型分流”。
- 统一 SDK 输出给上游服务（识别服务、风控服务、训练平台）。
- 作为 Python 端标准能力层，配合 UI 或后端服务调用。
