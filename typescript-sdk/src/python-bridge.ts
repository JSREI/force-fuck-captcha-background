import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

export interface PythonBridgePayload {
  class: string;
  method: string;
  args?: any[];
  kwargs?: Record<string, any>;
  init?: Record<string, any>;
  background_dir?: string | null;
}

export interface PythonBridgeOptions {
  pythonBin?: string;
  pythonPath?: string;
  cwd?: string;
}

function resolvePythonBin(): string {
  return process.env.CAPTCHA_SDK_PYTHON_BIN || process.env.PYTHON || 'python3';
}

function findLocalPythonSdkPath(): string | undefined {
  if (process.env.CAPTCHA_SDK_PYTHONPATH) {
    return process.env.CAPTCHA_SDK_PYTHONPATH;
  }

  const candidates = [
    path.resolve(process.cwd(), 'python-sdk'),
    path.resolve(__dirname, '..', '..', 'python-sdk'),
    path.resolve(__dirname, '..', '..', '..', 'python-sdk')
  ];

  for (const candidate of candidates) {
    const marker = path.join(candidate, 'captcha_background_sdk', '__init__.py');
    if (fs.existsSync(marker)) {
      return candidate;
    }
  }

  return undefined;
}

export class PythonBridge {
  private pythonBin: string;
  private pythonPath?: string;
  private cwd?: string;

  constructor(options: PythonBridgeOptions = {}) {
    this.pythonBin = options.pythonBin || resolvePythonBin();
    this.pythonPath = options.pythonPath || findLocalPythonSdkPath();
    this.cwd = options.cwd;
  }

  call(payload: PythonBridgePayload): Promise<any> {
    return new Promise((resolve, reject) => {
      const args = ['-m', 'captcha_background_sdk.ts_bridge'];
      const env = { ...process.env } as Record<string, string>;
      if (this.pythonPath) {
        env.PYTHONPATH = this.pythonPath + (env.PYTHONPATH ? path.delimiter + env.PYTHONPATH : '');
      }

      const child = spawn(this.pythonBin, args, {
        cwd: this.cwd,
        env,
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (chunk) => {
        stdout += chunk.toString();
      });
      child.stderr.on('data', (chunk) => {
        stderr += chunk.toString();
      });

      child.on('error', (error) => {
        reject(error);
      });

      child.on('close', (code) => {
        const trimmed = stdout.trim();
        if (!trimmed) {
          reject(new Error(stderr || 'python bridge returned empty output'));
          return;
        }
        let parsed: any;
        try {
          parsed = JSON.parse(trimmed);
        } catch (error) {
          reject(new Error(`python bridge returned invalid json: ${stderr || trimmed}`));
          return;
        }

        if (parsed.type === 'error') {
          reject(new Error(parsed.error || stderr || 'python bridge error'));
          return;
        }

        resolve(parsed.data);
      });

      child.stdin.write(JSON.stringify(payload));
      child.stdin.end();
    });
  }
}
