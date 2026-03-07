import { CaptchaRequestConfig } from '../../types';

export function setupRequestBody(request: Electron.ClientRequest, config: CaptchaRequestConfig): void {
  if (!config.bodyType || !config.body) {
    return;
  }

  switch (config.bodyType) {
    case 'raw':
      request.write(config.body);
      break;
    case 'x-www-form-urlencoded':
      setupFormUrlEncodedBody(request, config.body);
      break;
    case 'form-data':
      setupFormDataBody(request, config.body);
      break;
  }
}

function setupFormUrlEncodedBody(request: Electron.ClientRequest, body: any[]): void {
  const formParams = new URLSearchParams();
  body.forEach((item: any) => {
    if (item.key) {
      formParams.append(item.key, item.value || '');
    }
  });
  request.setHeader('Content-Type', 'application/x-www-form-urlencoded');
  request.write(formParams.toString());
}

function setupFormDataBody(request: Electron.ClientRequest, body: any[]): void {
  const boundary = `----WebKitFormBoundary${Math.random().toString(16).slice(2)}`;
  let formData = '';

  body.forEach((item: any) => {
    if (item.key) {
      formData += `--${boundary}\r\n`;
      formData += `Content-Disposition: form-data; name="${item.key}"\r\n\r\n`;
      formData += `${item.value || ''}\r\n`;
    }
  });

  formData += `--${boundary}--\r\n`;
  request.setHeader('Content-Type', `multipart/form-data; boundary=${boundary}`);
  request.write(formData);
}

