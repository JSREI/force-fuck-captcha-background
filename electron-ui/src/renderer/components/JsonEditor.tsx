import React, { useState, useEffect } from 'react';
import { Input, message } from 'antd';

const { TextArea } = Input;

interface JsonEditorProps {
  value: any;
  onChange: (value: any) => void;
}

const JsonEditor: React.FC<JsonEditorProps> = ({ value, onChange }) => {
  const [textValue, setTextValue] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const jsonString = JSON.stringify(value, null, 2);
      setTextValue(jsonString);
      setError(null);
    } catch (e) {
      setTextValue('');
      setError('无效的JSON数据');
    }
  }, [value]);

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newText = e.target.value;
    setTextValue(newText);
    
    try {
      // 尝试解析JSON
      if (newText.trim() === '') {
        onChange({});
        setError(null);
      } else {
        const parsedJson = JSON.parse(newText);
        onChange(parsedJson);
        setError(null);
      }
    } catch (e) {
      // 记录错误但不更新值
      setError('无效的JSON格式');
    }
  };

  return (
    <div className="json-editor">
      <TextArea
        value={textValue}
        onChange={handleTextChange}
        placeholder="请输入有效的JSON内容"
        autoSize={{ minRows: 4, maxRows: 10 }}
        status={error ? 'error' : ''}
      />
      {error && (
        <div style={{ color: '#ff4d4f', fontSize: 12, marginTop: 4 }}>
          {error}
        </div>
      )}
    </div>
  );
};

export default JsonEditor; 