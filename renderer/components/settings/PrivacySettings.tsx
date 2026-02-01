'use client';
import React, { useState } from 'react';
import { Switch, Button } from '@heroui/react';
import { SettingsGroup, SettingsItem } from './SettingsGroup';
import { getConfigSync } from '@renderer/features/p_function';
import { ShieldCheckIcon, CloudArrowUpIcon } from '@heroicons/react/24/outline';
import axios from 'axios';

export function DataPrivacySettings() {
  const [remoteOverlay, setRemoteOverlay] = useState(true);
  const [cloudBackup, setCloudBackup] = useState(false);

  return (
    <SettingsGroup
      title='数据隐私'
      description='管理您的数据收集和隐私设置'
      icon={<ShieldCheckIcon className='w-6 h-6'></ShieldCheckIcon>}>
      <div className='bg-blue-50 dark:bg-blue-900/60 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-4'>
        <h4 className='font-medium mb-2'>必需诊断数据</h4>
        <p className='text-sm text-content3-foreground'>
          {
            '您的数据将会被发送至 Sentry 及 Cloudflare Web Analytics(仅在开启在线模式时)，以帮助改进软件并使其保持安全、最新并按预期工作'
          }
        </p>
      </div>

      {/* TODO: Remote control */}
      {/* <SettingsItem title='Remote Overlay' description='允许远程覆盖功能' disabled>
        <Switch isDisabled isSelected={remoteOverlay} />
      </SettingsItem> */}

      <SettingsItem title='配置云端备份' description='启用配置文件的云端备份功能'>
        <Switch isSelected={cloudBackup} onChange={() => setCloudBackup(!cloudBackup)} />
      </SettingsItem>
    </SettingsGroup>
  );
}

export function BackupSettings() {
  const [isBackingUp, setIsBackingUp] = useState(false);

  const handleBackup = async (endpoint: string, buttonText: string) => {
    setIsBackingUp(true);
    try {
      const config = await getConfigSync();
      const response = await axios.post(endpoint, JSON.stringify(config));
      alert(`${buttonText}成功: ${response.data}`);
    } catch (error) {
      alert(`${buttonText}失败: ${error}`);
    } finally {
      setIsBackingUp(false);
    }
  };

  return (
    <SettingsGroup
      title='数据备份'
      description='备份和恢复您的应用配置'
      icon={<CloudArrowUpIcon className='w-6 h-6'></CloudArrowUpIcon>}>
      <div className='bg-yellow-50 dark:bg-yellow-900/60 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-4'>
        <h4 className='font-medium  mb-2'>备份说明</h4>
        <p className='text-sm text-content3-foreground'>
          定期备份您的配置可以防止数据丢失。备份将包含您的所有设置和偏好。
        </p>
      </div>

      <SettingsItem title='主要备份' description='备份当前配置到主要备份服务器'>
        <Button
          color='primary'
          variant='flat'
          isLoading={isBackingUp}
          onPress={() => handleBackup('https://web.lukas1.eu.org/pastebin/api.php/edit/backup_class_tools_main', '主要备份')}>
          备份
        </Button>
      </SettingsItem>

      <SettingsItem title='备用备份' description='备份当前配置到备用备份服务器'>
        <Button
          color='secondary'
          variant='flat'
          isLoading={isBackingUp}
          onPress={() => handleBackup('https://web.lukas1.eu.org/pastebin/api.php/edit/backup_class_tools_side', '备用备份')}>
          备份2
        </Button>
      </SettingsItem>
    </SettingsGroup>
  );
}
