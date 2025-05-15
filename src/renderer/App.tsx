import React, { useState, useEffect } from 'react';
import './App.css';

// 导入布局组件
import AppLayout from './components/AppLayout';
import TabsContainer, { TabItem } from './components/TabsContainer';
import RequestPanel from './components/RequestPanel';
import ParamsTable from './components/ParamsTable';
import HeadersTable from './components/HeadersTable';
import RequestBodyEditor, { BodyType, FormDataItem } from './components/RequestBodyEditor';
import ResponsePanel from './components/ResponsePanel';
import CurlParser, { ParsedCurlResult } from './components/CurlParser';
import { Button, message, Modal } from 'antd';
import { ClearOutlined } from '@ant-design/icons';

// 应用默认状态
const defaultAppState = {
  method: 'GET',
  url: '',
  headers: [{ key: '', value: '' }],
  params: [{ key: '', value: '' }],
  bodyType: 'none' as BodyType,
  bodyContent: '',
  formData: [{ key: '', value: '', type: 'text' as const }],
  activeTabKey: '1',
  binaryFileName: '' // 添加二进制文件名
};

const App: React.FC = () => {
  // 请求相关状态
  const [method, setMethod] = useState<string>(defaultAppState.method);
  const [url, setUrl] = useState<string>(defaultAppState.url);
  const [headers, setHeaders] = useState<{key: string, value: string}[]>(defaultAppState.headers);
  const [params, setParams] = useState<{key: string, value: string}[]>(defaultAppState.params);
  
  // 请求体相关状态
  const [bodyType, setBodyType] = useState<BodyType>(defaultAppState.bodyType);
  const [bodyContent, setBodyContent] = useState<string>(defaultAppState.bodyContent);
  const [formData, setFormData] = useState<FormDataItem[]>(defaultAppState.formData);
  const [binaryFile, setBinaryFile] = useState<File | null>(null);
  const [binaryFileName, setBinaryFileName] = useState<string>(defaultAppState.binaryFileName);
  
  // 响应相关状态
  const [responseData, setResponseData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(false);
  
  // UI相关状态
  const [activeTabKey, setActiveTabKey] = useState<string>(defaultAppState.activeTabKey);
  const [curlModalVisible, setCurlModalVisible] = useState<boolean>(false);

  // 从存储加载状态
  useEffect(() => {
    // 使用IPC通信从主进程加载保存的状态
    console.log('尝试加载应用状态...');
    
    if ((window as any).electronAPI && (window as any).electronAPI.loadAppState) {
      (window as any).electronAPI.loadAppState()
        .then((savedState: any) => {
          if (savedState) {
            console.log('成功加载应用状态:', savedState);
            
            // 恢复所有状态
            setMethod(savedState.method || defaultAppState.method);
            setUrl(savedState.url || defaultAppState.url);
            setHeaders(savedState.headers || defaultAppState.headers);
            setParams(savedState.params || defaultAppState.params);
            setBodyType(savedState.bodyType || defaultAppState.bodyType);
            setBodyContent(savedState.bodyContent || defaultAppState.bodyContent);
            setFormData(savedState.formData || defaultAppState.formData);
            setActiveTabKey(savedState.activeTabKey || defaultAppState.activeTabKey);
            setBinaryFileName(savedState.binaryFileName || defaultAppState.binaryFileName);
            
            message.success('已恢复上次保存的输入状态');
          } else {
            console.log('没有找到保存的状态，使用默认值');
          }
        })
        .catch((error: any) => {
          console.error('加载应用状态失败:', error);
          message.error('恢复状态失败，使用默认值');
        });
    } else {
      console.warn('electronAPI.loadAppState 方法不可用');
    }
  }, []);

  // 保存状态到存储
  useEffect(() => {
    // 避免初始化时触发保存
    if (url === defaultAppState.url && method === defaultAppState.method && 
        headers.length === 1 && headers[0].key === '' && headers[0].value === '' &&
        params.length === 1 && params[0].key === '' && params[0].value === '') {
      return;
    }
    
    // 使用IPC通信保存状态到主进程
    const saveState = () => {
      // 二进制文件不能序列化保存，所以只保存文件名
      const currentBinaryFileName = binaryFile ? binaryFile.name : binaryFileName;
      
      const stateToSave = {
        method,
        url,
        headers,
        params,
        bodyType,
        bodyContent,
        formData,
        activeTabKey,
        binaryFileName: currentBinaryFileName
      };
      
      console.log('保存应用状态:', stateToSave);
      
      if ((window as any).electronAPI && (window as any).electronAPI.saveAppState) {
        (window as any).electronAPI.saveAppState(stateToSave)
          .then(() => {
            console.log('应用状态保存成功');
          })
          .catch((error: any) => {
            console.error('保存应用状态失败:', error);
          });
      } else {
        console.warn('electronAPI.saveAppState 方法不可用');
      }
    };
    
    // 使用防抖，避免频繁保存
    const timeoutId = setTimeout(saveState, 500);
    return () => clearTimeout(timeoutId);
  }, [method, url, headers, params, bodyType, bodyContent, formData, activeTabKey, binaryFile, binaryFileName]);

  // 更新二进制文件状态
  const handleBinaryFileChange = (file: File | null) => {
    setBinaryFile(file);
    if (file) {
      setBinaryFileName(file.name);
    }
  };

  // 重置所有状态
  const handleReset = () => {
    // 直接重置所有状态为默认值
    setMethod(defaultAppState.method);
    setUrl(defaultAppState.url);
    setHeaders(defaultAppState.headers);
    setParams(defaultAppState.params);
    setBodyType(defaultAppState.bodyType);
    setBodyContent(defaultAppState.bodyContent);
    setFormData(defaultAppState.formData);
    setBinaryFile(null);
    setBinaryFileName(defaultAppState.binaryFileName);
    setResponseData(null);
    setActiveTabKey(defaultAppState.activeTabKey);
    
    // 清除保存的状态
    if ((window as any).electronAPI && (window as any).electronAPI.clearAppState) {
      (window as any).electronAPI.clearAppState()
        .then(() => {
          console.log('应用状态已清除');
          message.success('已成功重置所有输入');
        })
        .catch((error: any) => {
          console.error('清除应用状态失败:', error);
          message.error('重置应用状态时出错');
        });
    } else {
      console.warn('electronAPI.clearAppState 方法不可用');
      message.success('已成功重置所有输入');
    }
  };

  const parseUrlWithParams = () => {
    if (!url) return '';
    
    try {
      const urlObj = new URL(url.startsWith('http') ? url : `http://${url}`);
      
      // 添加查询参数
      params.forEach(param => {
        if (param.key && param.value) {
          urlObj.searchParams.append(param.key, param.value);
        }
      });
      
      return urlObj.toString();
    } catch (error) {
      console.error('URL解析错误:', error);
      return url; // 如果URL格式不正确，则返回原始URL
    }
  };

  const handleSendRequest = () => {
    if (!url) {
      return;
    }

    setLoading(true);

    // 构建请求配置
    const headerObj = headers.reduce((acc, h) => {
      if (h.key) acc[h.key] = h.value;
      return acc;
    }, {} as Record<string, string>);

    // 准备请求体数据
    let requestBody = null;
    if (bodyType === 'raw') {
      requestBody = bodyContent;
    } else if (bodyType === 'form-data' || bodyType === 'x-www-form-urlencoded') {
      requestBody = formData;
    } else if (bodyType === 'binary' && binaryFile) {
      // 对于二进制文件，需要传递文件信息
      requestBody = {
        fileName: binaryFile.name,
        fileSize: binaryFile.size,
        contentType: binaryFile.type,
        // 注意：这里只传递文件信息，实际文件数据需要通过IPC单独处理
      };
    }

    const requestConfig = {
      method,
      url: parseUrlWithParams(),
      headers: headerObj,
      bodyType,
      body: requestBody
    };

    console.log('发送请求:', requestConfig);

    // 使用electronAPI发送请求
    (window as any).electronAPI.sendHttpRequest(requestConfig)
      .then((response: any) => {
        console.log('收到响应:', response);
        setResponseData(response);
      })
      .catch((error: any) => {
        console.error('请求失败:', error);
        // 显示错误响应
        setResponseData({
          status: 0,
          statusText: 'Error',
          headers: { 'content-type': 'application/json' },
          data: { error: error.toString() }
        });
      })
      .finally(() => {
        setLoading(false);
      });
  };

  // 处理从Curl导入的数据
  const handleCurlImport = (data: ParsedCurlResult) => {
    setMethod(data.method);
    setUrl(data.url);
    setHeaders(data.headers);
    setParams(data.params);
    setBodyType(data.bodyType);
    setBodyContent(data.bodyContent);
    
    if (data.formData.length > 0) {
      setFormData(data.formData);
    }
  };

  // 定义选项卡内容
  const tabs: TabItem[] = [
    {
      key: '1',
      title: 'Params',
      content: (
        <ParamsTable 
          params={params}
          onParamsChange={setParams}
        />
      )
    },
    {
      key: '2',
      title: 'Headers',
      content: (
        <HeadersTable 
          headers={headers}
          onHeadersChange={setHeaders}
        />
      )
    },
    {
      key: '3',
      title: 'Body',
      content: (
        <RequestBodyEditor 
          bodyType={bodyType}
          onBodyTypeChange={setBodyType}
          bodyContent={bodyContent}
          onBodyContentChange={setBodyContent}
          formData={formData}
          onFormDataChange={setFormData}
          binaryFile={binaryFile}
          onBinaryFileChange={handleBinaryFileChange}
          binaryFileName={binaryFileName}
        />
      )
    }
  ];

  return (
    <AppLayout>
      <div className="main-container">
        {/* 请求区域 */}
        <div className="request-area">
          {/* 请求面板 */}
          <RequestPanel 
            method={method}
            url={url}
            loading={loading}
            onMethodChange={setMethod}
            onUrlChange={setUrl}
            onSendRequest={handleSendRequest}
            onImportCurl={() => setCurlModalVisible(true)}
            onReset={handleReset}
          />
          
          {/* 请求相关选项卡 */}
          <TabsContainer 
            tabs={tabs}
            activeKey={activeTabKey}
            onChange={setActiveTabKey}
          />
        </div>

        {/* 响应区域 - 移到请求区域下方 */}
        <div className="response-area">
          <h3 className="response-title">响应</h3>
          <ResponsePanel responseData={responseData} />
        </div>
      </div>

      {/* Curl命令导入弹窗 */}
      <CurlParser 
        visible={curlModalVisible}
        onClose={() => setCurlModalVisible(false)}
        onImport={handleCurlImport}
      />
    </AppLayout>
  );
};

export default App; 