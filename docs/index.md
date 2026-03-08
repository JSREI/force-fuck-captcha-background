---
layout: home
title: Captcha Background SDK 文档
hero:
  name: "Captcha Background SDK"
  text: "先判断类型，再提取结果"
  tagline: "一句话：你给我验证码图，我自动判断是文本还是滑块，并直接返回可用坐标和图块。"
  actions:
    - theme: brand
      text: 3 分钟上手
      link: /guide/quickstart
    - theme: alt
      text: 看核心 API
      link: /api/auto
features:
  - title: 我们解决什么
    details: 解决“验证码类型靠猜、坐标字段不统一、产出不可直接用”的问题。
  - title: 我们怎么解决
    details: 用 recognize_auto_dict 一次调用并行判断 text/slider，统一输出结构。
  - title: 你最终拿到什么
    details: 文本拿 bbox/逐字图，滑块拿缺口 bbox/center/patch，可直接进入业务链路。
---

## 首页先说人话

我们解决的问题是：**你不需要再人工猜验证码类型，也不用自己拼识别链路。**

我们的做法是：**输入验证码图（和可选背景目录），SDK 自动完成背景匹配、类型判定、坐标提取，并输出可直接消费的字段和图块文件。**

## 背景还原图（流程示意）

![背景还原流程示意图](/images/background-restore-flow.svg)

## 你应该先看哪页

1. 先看 [快速开始](/guide/quickstart)：3 分钟跑通一个请求。
2. 再看 [自动识别主 API](/api/auto)：这是线上主入口。
3. 如果要调阈值，再看 [类型路由策略](/guide/type-routing)。
