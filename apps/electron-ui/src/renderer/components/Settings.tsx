import React, { useState } from 'react';
import { Button, Tooltip } from 'antd';
import { SettingOutlined } from '@ant-design/icons';
import SettingsModal from './settings/SettingsModal';
import { useSettingsState } from './settings/useSettingsState';

interface SettingsProps {
  open: boolean;
  onClose: () => void;
}

export const Settings: React.FC<SettingsProps> = ({ open, onClose }) => {
  const {
    workspacePath,
    setWorkspacePath,
    useSystemProxy,
    setUseSystemProxy,
    customProxy,
    setCustomProxy,
    selectDirectory,
    saveSettings
  } = useSettingsState();

  return (
    <SettingsModal
      open={open}
      onClose={onClose}
      workspacePath={workspacePath}
      setWorkspacePath={setWorkspacePath}
      useSystemProxy={useSystemProxy}
      setUseSystemProxy={setUseSystemProxy}
      customProxy={customProxy}
      setCustomProxy={setCustomProxy}
      onSelectDirectory={selectDirectory}
      onSave={async () => {
        await saveSettings();
        onClose();
      }}
    />
  );
};

export const SettingsButton: React.FC = () => {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Tooltip title="设置">
        <Button type="text" icon={<SettingOutlined />} onClick={() => setOpen(true)} />
      </Tooltip>
      <Settings open={open} onClose={() => setOpen(false)} />
    </>
  );
};

