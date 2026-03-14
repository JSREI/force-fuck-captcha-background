import React from 'react';
import { Button, Typography, Upload } from 'antd';
import { UploadOutlined } from '@ant-design/icons';
import type { UploadProps } from 'antd';

const { Text } = Typography;

interface BinaryUploadProps {
  binaryFile?: File | null;
  onBinaryFileChange: (file: File | null) => void;
  binaryFileName?: string;
}

const BinaryUpload: React.FC<BinaryUploadProps> = ({
  binaryFile,
  onBinaryFileChange,
  binaryFileName
}) => {
  const uploadProps: UploadProps = {
    beforeUpload: (file) => {
      onBinaryFileChange(file);
      return false;
    },
    fileList: binaryFile
      ? [{ uid: '1', name: binaryFile.name, size: binaryFile.size, status: 'done' as any }]
      : binaryFileName
        ? [{ uid: '1', name: binaryFileName, size: 0, status: 'done' as any }]
        : [],
    onRemove: () => {
      onBinaryFileChange(null);
    },
  };

  return (
    <div className="binary-upload-container">
      <Upload {...uploadProps}>
        <Button icon={<UploadOutlined />}>选择文件</Button>
      </Upload>
      {(binaryFile || binaryFileName) && (
        <div className="file-info">
          <Text>
            已选择文件: {binaryFile ? binaryFile.name : binaryFileName} ({binaryFile ? Math.round(binaryFile.size / 1024) : '?'} KB)
          </Text>
          {!binaryFile && binaryFileName && (
            <Text type="warning" style={{ marginLeft: '10px' }}>
              (文件信息已保存，但需要重新选择文件)
            </Text>
          )}
        </div>
      )}
    </div>
  );
};

export default BinaryUpload;

