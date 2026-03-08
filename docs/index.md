---
layout: home
title: Captcha Background SDK 文档
hero:
  name: "Captcha Background SDK"
  text: "同一个 Bucket 多图聚合，输出可复用背景图"
  tagline: "你给我验证码图和背景目录，SDK 自动完成背景恢复、类型判断与坐标输出。"
  actions:
    - theme: brand
      text: 在线官网
      link: https://jsrei.github.io/force-fuck-captcha-background/
    - theme: alt
      text: 3 分钟上手
      link: /guide/quickstart
    - theme: alt
      text: 下载 GUI
      link: https://github.com/JSREI/force-fuck-captcha-background/releases/latest
features:
  - title: 我们解决什么
    details: 解决“验证码类型靠猜、背景难还原、结果字段不好直接用”的问题。
  - title: 我们怎么解决
    details: 用 recognize_auto_dict 一次调用完成背景恢复与 text/slider 类型路由。
  - title: 你最终拿到什么
    details: 统一输出结构，文本拿 bbox/逐字图，滑块拿缺口 bbox/center/patch。
---

## 在线官网地址

- 官网: [https://jsrei.github.io/force-fuck-captcha-background/](https://jsrei.github.io/force-fuck-captcha-background/)

## 同一个 Bucket 的真实流程

一句话先说清楚：**同 bucket 多图输入 -> SDK 聚合去噪 -> 1 张可复用背景图输出**。

![同一个 Bucket 的真实流程示例](/images/same-bucket-flow.png)

## 你应该先看哪页

1. 先看 [快速开始](/guide/quickstart)：3 分钟跑通一个请求。
2. 再看 [自动识别主 API](/api/auto)：这是线上主入口。
3. 如果要调阈值，再看 [类型路由策略](/guide/type-routing)。
