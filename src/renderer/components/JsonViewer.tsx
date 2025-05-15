import React from 'react';
import { Card } from 'antd';

interface JsonViewerProps {
  data: any;
}

const JsonViewer: React.FC<JsonViewerProps> = ({ data }) => {
  const jsonString = JSON.stringify(data, null, 2);

  return (
    <Card className="json-viewer" size="small">
      <pre
        style={{
          fontSize: '14px',
          margin: 0,
          overflow: 'auto',
          maxHeight: '400px',
          backgroundColor: '#f5f5f5',
          padding: '8px',
          borderRadius: '4px',
        }}
      >
        {jsonString}
      </pre>
    </Card>
  );
};

export default JsonViewer; 