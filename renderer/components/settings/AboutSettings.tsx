'use client';
import { useState, useEffect } from 'react';
import { SettingsGroup, SettingsItem } from './SettingsGroup';
import { CodeBracketIcon, InformationCircleIcon, UserCircleIcon } from '@heroicons/react/24/outline';
import { getVersionSync } from '@renderer/features/ipc/functions';
import dayjs from 'dayjs';

export function AboutSettings() {
  const [version, setVersion] = useState('1.0.0');
  const [buildVersion, seBuildVersion] = useState('');
  useEffect(() => {
    (async () => {
      let main_version;
      try {
        main_version = (await getVersionSync()) as string;
      } catch (error) {
        main_version = 'Unknown';
      }
      setVersion(main_version);
      let web_version;
      try {
        web_version = await (await fetch('/buildArtifacts/UIVersion')).text();
        web_version = dayjs(Number(web_version)).format('YYYY.M.D');
      } catch (error) {
        web_version = 'Unknown';
      }
      seBuildVersion(web_version);
    })();
  }, []);
  return (
    <SettingsGroup title='关于应用' icon={<InformationCircleIcon className='w-6 h-6'></InformationCircleIcon>}>
      <div className='bg-blue-50 dark:bg-blue-900/60 border border-blue-200 dark:border-blue-800 rounded-lg p-6 mb-4'>
        <div className='flex items-center gap-4'>
          <div className='w-16 h-16 bg-linear-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center'>
            <CodeBracketIcon className='w-10 h-10 text-white'></CodeBracketIcon>
          </div>
          <div>
            <h3 className='text-xl font-bold'>Class Tools</h3>
            <p className='text-content3-foreground'>课程管理工具</p>
          </div>
        </div>
      </div>

      <SettingsItem title='开发者'>
        <div className='flex items-center gap-3'>
          <UserCircleIcon className='w-10 h-10'></UserCircleIcon>
          <div>
            <div className='font-semibold'>Lukas</div>
            <div className='text-sm text-content3-foreground'>主要开发者</div>
          </div>
        </div>
      </SettingsItem>

      <SettingsItem title='版本'>
        <div className='text-right'>
          <div className='font-mono text-sm'>{version}</div>
          <div className='text-xs text-content3-foreground'>Build {buildVersion}</div>
        </div>
      </SettingsItem>

      <SettingsItem></SettingsItem>
    </SettingsGroup>
  );
}
