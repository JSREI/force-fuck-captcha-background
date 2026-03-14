import React from 'react';
import { Input, Radio, Typography } from 'antd';
import FormDataTable from './request-body/FormDataTable';
import BinaryUpload from './request-body/BinaryUpload';
import type { BodyType, FormDataItem } from './request-body/types';
import './RequestBodyEditor.css';

const { TextArea } = Input;
const { Text } = Typography;

interface RequestBodyEditorProps {
  bodyType: BodyType;
  onBodyTypeChange: (type: BodyType) => void;
  bodyContent: string;
  onBodyContentChange: (content: string) => void;
  formData: FormDataItem[];
  onFormDataChange: (data: FormDataItem[]) => void;
  binaryFile?: File | null;
  onBinaryFileChange: (file: File | null) => void;
  binaryFileName?: string;
}

const RequestBodyEditor: React.FC<RequestBodyEditorProps> = ({
  bodyType,
  onBodyTypeChange,
  bodyContent,
  onBodyContentChange,
  formData,
  onFormDataChange,
  binaryFile,
  onBinaryFileChange,
  binaryFileName
}) => {
  return (
    <div className="request-body-editor">
      <div className="body-type-selector">
        <Radio.Group onChange={(e) => onBodyTypeChange(e.target.value)} value={bodyType}>
          <Radio value="none">none</Radio>
          <Radio value="form-data">form-data</Radio>
          <Radio value="x-www-form-urlencoded">x-www-form-urlencoded</Radio>
          <Radio value="raw">raw</Radio>
          <Radio value="binary">binary</Radio>
        </Radio.Group>
      </div>

      {bodyType === 'none' && (
        <div className="empty-body-message">
          <Text type="secondary">This request does not have a body</Text>
        </div>
      )}

      {(bodyType === 'form-data' || bodyType === 'x-www-form-urlencoded') && (
        <FormDataTable formData={formData} onFormDataChange={onFormDataChange} />
      )}

      {bodyType === 'raw' && (
        <TextArea
          className="body-content-area"
          value={bodyContent}
          onChange={(e) => onBodyContentChange(e.target.value)}
          placeholder="请求体内容，通常是JSON格式"
          autoSize={{ minRows: 6, maxRows: 12 }}
        />
      )}

      {bodyType === 'binary' && (
        <BinaryUpload
          binaryFile={binaryFile}
          onBinaryFileChange={onBinaryFileChange}
          binaryFileName={binaryFileName}
        />
      )}
    </div>
  );
};

export type { BodyType, FormDataItem };
export default RequestBodyEditor;

