import React, { useEffect, useRef, useState } from 'react';
import { Button, Input, message, Modal } from 'antd';
import { parseCurlCommand } from './curl-parser/parse-curl';
import { ParsedCurlResult } from './curl-parser/types';
import './CurlParser.css';

const { TextArea } = Input;

interface CurlParserProps {
  visible: boolean;
  onClose: () => void;
  onImport: (data: ParsedCurlResult) => void;
}

const CurlParser: React.FC<CurlParserProps> = ({ visible, onClose, onImport }) => {
  const [curlCommand, setCurlCommand] = useState<string>('');
  const inputRef = useRef<any>(null);

  useEffect(() => {
    if (visible && inputRef.current) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [visible]);

  const handleModalImport = () => {
    if (!curlCommand.trim()) {
      message.error('请输入curl命令');
      return;
    }

    try {
      const parsed = parseCurlCommand(curlCommand);
      onImport(parsed);
      setCurlCommand('');
      onClose();
    } catch (error) {
      message.error('解析curl命令失败，请检查格式');
      console.error('解析curl命令失败:', error);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      handleModalImport();
    }
  };

  return (
    <Modal
      className="curl-parser-modal"
      title="导入CURL命令"
      open={visible}
      onCancel={onClose}
      footer={[
        <Button key="cancel" onClick={onClose} className="curl-parser-button">
          取消
        </Button>,
        <Button key="import" type="primary" onClick={handleModalImport} className="curl-parser-button">
          导入
        </Button>,
      ]}
      width={700}
    >
      <TextArea
        className="curl-input"
        value={curlCommand}
        onChange={(e) => setCurlCommand(e.target.value)}
        placeholder="请粘贴curl命令，例如：curl https://example.com/api/v1/captcha -H 'Content-Type: application/json'"
        autoSize={{ minRows: 6, maxRows: 10 }}
        ref={inputRef}
        onKeyPress={handleKeyPress}
      />
      <div className="help-section">
        <p>支持的curl参数：</p>
        <ul>
          <li>-X, --request：指定请求方法（GET, POST等）</li>
          <li>-H, --header：指定请求头</li>
          <li>-d, --data：指定请求体</li>
          <li>--data-raw：指定请求体（通常用于JSON）</li>
        </ul>
        <p className="shortcut-hint">提示：按下 Ctrl+Enter 快速导入</p>
      </div>
    </Modal>
  );
};

export type { ParsedCurlResult };
export default CurlParser;

