# Captcha Background SDK (TypeScript)

> 目前优先提供本地还原（Local Restore）能力，后续会继续补齐与 Python SDK 对齐的 API 面。

## 安装（本地开发）

```bash
cd typescript-sdk
npm install
```

## 使用示例

```ts
import { CaptchaVisionSDK } from './dist';

const sdk = new CaptchaVisionSDK();

const summary = await sdk.runLocalRestore(
  '/path/to/captchas',
  '/path/to/output',
  {
    clearOutputBeforeRun: true,
    onProgress: (status) => {
      console.log('progress', status.processedFiles, '/', status.imageFiles);
    }
  }
);

console.log(summary);
```

## 已支持能力

- 本地还原（runLocalRestore / runLocalRestoreDict）

## 计划补齐

- 与 Python SDK 对齐的 background index / text / slider 等能力
