# Captcha Background SDK (TypeScript)

> TypeScript SDK 通过 Python SDK 作为底层实现，保证能力对齐。

## 依赖

- Node.js >= 18
- Python 3（可执行命令默认为 `python3`）
- 本仓库内的 `python-sdk/`（或已 `pip install captcha-background-sdk`）

如需指定 Python 路径：

```bash
export CAPTCHA_SDK_PYTHON_BIN=python3
export CAPTCHA_SDK_PYTHONPATH=/absolute/path/to/python-sdk
```

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

- `CaptchaVisionSDK`（对齐 Python SDK 的公开方法）
- `CaptchaTextLocator`
- `CaptchaGapLocator`

说明：`CaptchaVisionSDK` 的所有方法会调用 Python SDK，保持行为一致。
