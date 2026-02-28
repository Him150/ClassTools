'use client';
import React, { useState, useEffect } from 'react';
import { Switch, Slider, Autocomplete, AutocompleteItem, Tooltip } from '@heroui/react';
import { SettingsGroup, SettingsItem } from './SettingsGroup';
import { getConfigSync, setConfigSync } from '@renderer/features/ipc/config';
import { WindowIcon, PaintBrushIcon, CloudIcon, EyeIcon } from '@heroicons/react/24/outline';

export function WindowSettings() {
  const [windowWidth, setWindowWidth] = useState(0.2);
  const [windowHeight, setWindowHeight] = useState(1);

  useEffect(() => {
    (async () => {
      const widthData = await getConfigSync('display.windowWidth');
      widthData && setWindowWidth(Number(widthData));

      const heightData = await getConfigSync('display.windowHeight');
      heightData && setWindowHeight(Number(heightData));
    })();
  }, []);

  return (
    <SettingsGroup title='窗口设置' icon={<WindowIcon className='w-6 h-6'></WindowIcon>}>
      <SettingsItem title='窗口宽度' description={`当前值: ${(windowWidth * 100).toFixed(0)}%`}>
        <div className='w-80'>
          <Slider
            step={0.01}
            maxValue={1}
            minValue={0.05}
            marks={[
              { value: 0.1, label: '10%' },
              { value: 0.2, label: '20%' },
              { value: 0.3, label: '30%' },
              { value: 0.4, label: '40%' },
              { value: 0.5, label: '50%' },
            ]}
            value={windowWidth}
            onChange={(value: number) => {
              setWindowWidth(value);
              setConfigSync('display.windowWidth', value);
            }}
          />
        </div>
      </SettingsItem>

      <SettingsItem title='窗口高度' description={`当前值: ${(windowHeight * 100).toFixed(0)}%`}>
        <div className='w-80'>
          <Slider
            step={0.01}
            maxValue={1}
            minValue={0.05}
            value={windowHeight}
            onChange={(value: number) => {
              setWindowHeight(value);
              setConfigSync('display.windowHeight', value);
            }}
          />
        </div>
      </SettingsItem>
    </SettingsGroup>
  );
}

export function AppearanceSettings() {
  const [fontSize, setFontSize] = useState(1);
  const [slidingPosition, setSlidingPosition] = useState('center');
  const [timeDisplay, setTimeDisplay] = useState('always');
  const [progressDisplay, setProgressDisplay] = useState('always');
  const [useWindowBackgroundMaterial, setUseWindowBackgroundMaterial] = useState(false);

  useEffect(() => {
    (async () => {
      const fontData = await getConfigSync('display.fontSize');
      fontData && setFontSize(Number(fontData));

      const slidingData = await getConfigSync('display.slidingPosition');
      slidingData && setSlidingPosition(String(slidingData));

      const timeData = await getConfigSync('display.timeDisplay');
      timeData && setTimeDisplay(String(timeData));

      const progressData = await getConfigSync('display.progressDisplay');
      progressData && setProgressDisplay(String(progressData));

      const useWindowBackgroundMaterialData = await getConfigSync('display.useWindowBackgroundMaterial');
      useWindowBackgroundMaterialData && setUseWindowBackgroundMaterial(useWindowBackgroundMaterialData);
    })();
  }, []);

  return (
    <SettingsGroup title='外观设置' icon={<PaintBrushIcon className='w-6 h-6'></PaintBrushIcon>}>
      <SettingsItem title='字体大小' description={`当前值: ${fontSize.toFixed(1)}x`}>
        <div className='w-80'>
          <Slider
            step={0.1}
            maxValue={5}
            minValue={0.5}
            showSteps={true}
            value={fontSize}
            onChange={(value: number) => {
              setFontSize(value);
              setConfigSync('display.fontSize', value);
            }}
          />
        </div>
      </SettingsItem>
      <SettingsItem title='滑动位置' description='设置滚动时的对齐方式'>
        <Autocomplete
          selectedKey={slidingPosition}
          onSelectionChange={(value: string) => {
            setSlidingPosition(value);
            setConfigSync('display.slidingPosition', value);
          }}
          defaultItems={[
            { value: 'start', label: '开始' },
            { value: 'center', label: '居中' },
            { value: 'end', label: '结束' },
            { value: 'nearest', label: '最近' },
          ]}>
          {item => <AutocompleteItem key={item.value}>{item.label}</AutocompleteItem>}
        </Autocomplete>
      </SettingsItem>
      <SettingsItem title='时间显示' description='设置课程时间的显示时机'>
        <Autocomplete
          selectedKey={timeDisplay}
          onSelectionChange={(value: string) => {
            setTimeDisplay(value);
            setConfigSync('display.timeDisplay', value);
          }}
          defaultItems={[
            { value: 'always', label: '始终显示' },
            { value: 'active', label: '活动时显示' },
            { value: 'never', label: '从不显示' },
          ]}>
          {item => <AutocompleteItem key={item.value}>{item.label}</AutocompleteItem>}
        </Autocomplete>
      </SettingsItem>
      <SettingsItem title='进度条显示' description='设置进度条的显示时机'>
        <Autocomplete
          selectedKey={progressDisplay}
          onSelectionChange={(value: string) => {
            setProgressDisplay(value);
            setConfigSync('display.progressDisplay', value);
          }}
          defaultItems={[
            { value: 'always', label: '始终显示' },
            { value: 'active', label: '活动时显示' },
            { value: 'never', label: '从不显示' },
          ]}>
          {item => <AutocompleteItem key={item.value}>{item.label}</AutocompleteItem>}
        </Autocomplete>
      </SettingsItem>
      <SettingsItem
        title='使用窗口级背景模糊'
        description={
          <div className='flex items-center gap-2'>{`在 Windows 11 22H2 及更高版本中，窗口可使用亚克力背景，开启时不显示应用背景`}</div>
        }>
        <Switch
          isSelected={useWindowBackgroundMaterial}
          onChange={() => {
            setUseWindowBackgroundMaterial(!useWindowBackgroundMaterial);
            setConfigSync('display.useWindowBackgroundMaterial', !useWindowBackgroundMaterial);
          }}
        />
      </SettingsItem>
    </SettingsGroup>
  );
}

export function UpgradeSettings() {
  const [online, setOnline] = useState(false);
  const [autoCheckUpdate, setAutoCheckUpdate] = useState(true);
  const [autoDownloadUpdate, setAutoDownloadUpdate] = useState(true);

  useEffect(() => {
    (async () => {
      const data = await getConfigSync('useOnlineVersion');
      data && setOnline(Boolean(data));

      const autoCheckData = await getConfigSync('upgrade.autoCheckUpdate');
      if (typeof autoCheckData === 'boolean') {
        setAutoCheckUpdate(autoCheckData);
      }

      const autoDownloadData = await getConfigSync('upgrade.autoDownloadUpdate');
      if (typeof autoDownloadData === 'boolean') {
        setAutoDownloadUpdate(autoDownloadData);
      }
    })();
  }, []);

  return (
    <SettingsGroup title='更新设置' icon={<CloudIcon className='w-6 h-6'></CloudIcon>}>
      <SettingsItem
        title='在线模式'
        description={
          <div className='flex items-center gap-2'>
            开启此选项后会使用最新的 UI 版本，过旧的版本使用时可能会出现问题
          </div>
        }>
        <Switch
          isSelected={online}
          onChange={() => {
            setOnline(!online);
            setConfigSync('useOnlineVersion', !online);
          }}
        />
      </SettingsItem>

      <SettingsItem title='检查更新' description='自动检查并通知可用的应用更新'>
        <Switch
          isSelected={autoCheckUpdate}
          onChange={() => {
            const newValue = !autoCheckUpdate;
            setAutoCheckUpdate(newValue);
            setConfigSync('upgrade.autoCheckUpdate', newValue);
          }}
        />
      </SettingsItem>

      <SettingsItem title='自动下载更新' description='检测到新版本后在后台自动下载更新包'>
        <Switch
          isSelected={autoDownloadUpdate}
          onChange={() => {
            const newValue = !autoDownloadUpdate;
            setAutoDownloadUpdate(newValue);
            setConfigSync('upgrade.autoDownloadUpdate', newValue);
          }}
        />
      </SettingsItem>
    </SettingsGroup>
  );
}

export function InterfaceSettings() {
  const [hiddenControlBar, setHiddenControlBar] = useState(false);
  const [hiddenRefreshWindow, setHiddenRefreshWindow] = useState(false);

  useEffect(() => {
    (async () => {
      const closeData = await getConfigSync('display.hidden.controlBar');
      closeData && setHiddenControlBar(Boolean(closeData));

      const refreshData = await getConfigSync('display.hidden.refreshWindow');
      refreshData && setHiddenRefreshWindow(Boolean(refreshData));
    })();
  }, []);

  return (
    <SettingsGroup title='交互设置' icon={<EyeIcon className='w-6 h-6'></EyeIcon>}>
      <SettingsItem title='禁用控制栏操作'>
        <Switch
          isSelected={hiddenControlBar}
          onChange={() => {
            setHiddenControlBar(!hiddenControlBar);
            setConfigSync('display.hidden.controlBar', !hiddenControlBar);
          }}
        />
      </SettingsItem>

      <SettingsItem title='隐藏刷新按钮'>
        <Switch
          isSelected={hiddenRefreshWindow}
          onChange={() => {
            setHiddenRefreshWindow(!hiddenRefreshWindow);
            setConfigSync('display.hidden.refreshWindow', !hiddenRefreshWindow);
          }}
        />
      </SettingsItem>
    </SettingsGroup>
  );
}
