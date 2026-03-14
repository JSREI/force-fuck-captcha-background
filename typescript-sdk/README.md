# Captcha Background SDK (TypeScript)

> 纯 TypeScript 实现，功能与 Python SDK 对齐。

## 依赖

- Node.js >= 18
- 本地安装 `sharp` 运行时依赖（已在 package.json 内声明）

## 安装（本地开发）

```bash
cd typescript-sdk
npm install
```

## 使用示例

```ts
import { CaptchaVisionSDK } from './dist';

const sdk = new CaptchaVisionSDK();

// 本地还原
const summary = await sdk.run_local_restore_dict(
  '/path/to/captchas',
  '/path/to/output',
  true
);

// 自动识别
const auto = await sdk.recognize_auto_dict(
  '/path/to/captcha.png',
  '/path/to/backgrounds'
);

console.log(summary, auto);
```

## 已封装 API

- `CaptchaVisionSDK`
- `CaptchaTextLocator`
- `CaptchaGapLocator`

说明：TypeScript SDK 不依赖 Python。功能对齐 Python SDK 的全部公开方法。
