'use client';
import {
  Switch,
  Button,
  Divider,
  Input,
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
  Autocomplete,
  AutocompleteItem,
} from '@heroui/react';
import { useEffect, useState } from 'react';
import { getConfigSync } from '@renderer/features/ipc/config';
import { getAutoLaunchSync } from '@renderer/features/ipc/functions';
import { SettingsPage, SettingsGroup, SettingsItem } from '@renderer/components/settings/SettingsGroup';
import { ClockIcon, PhotoIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import WeatherSettings from '@renderer/components/settings/WeatherSettings';

export default function App() {
  const [autoLaunch, setAutoLaunch] = useState(false);
  const [autoLaunchE, setAutoLaunchE] = useState('Finding');
  const [startAction_openHotspot, setStartAction_openHotspot] = useState(false);
  const [startAction_openHotspotDelay, setStartAction_openHotspotDelay] = useState('0');

  const [useGameBgs, setUseGameBgs] = useState(false);
  const [gameList, setGameList] = useState<{ id: string; name: string }[]>([]);
  const [selectedGame, setSelectedGame] = useState<string | null>(null);
  const [loadingGames, setLoadingGames] = useState(false);
  const [allowGameBgsType, setAllowGameBgsType] = useState('mixed-video-image');

  useEffect(() => {
    (async () => {
      try {
        setAutoLaunch(await getAutoLaunchSync());
        setAutoLaunchE(null);
      } catch (error) {
        setAutoLaunchE('Failed Found');
      }
      const openHotspot = await getConfigSync('main.startAction.openHotspot');
      openHotspot && setStartAction_openHotspot(Boolean(openHotspot));
      const openHotspotDelay = await getConfigSync('main.startAction.openHotspotDelay');
      openHotspotDelay && setStartAction_openHotspotDelay(openHotspotDelay);
    })();
  }, []);
  useEffect(() => {
    (async () => {
      const useBg = await getConfigSync('display.background.useGameBgs');
      setUseGameBgs(Boolean(useBg));

      const gameListRaw = await getConfigSync('display.background.gameList');
      gameListRaw && setGameList(gameListRaw);

      const selected = await getConfigSync('display.background.useGame');
      selected && setSelectedGame(selected);

      const allowTypeValue = await getConfigSync('display.background.useGameBgsAllowType');
      if (allowTypeValue) setAllowGameBgsType(allowTypeValue);
    })();
  }, []);
  const fetchGameList = async () => {
    try {
      setLoadingGames(true);
      const res = await fetch('https://hyp-api.mihoyo.com/hyp/hyp-connect/api/getGames?launcher_id=jGHBHlcOq1');
      const json = await res.json();
      const games = json?.data?.games?.map((g: any) => ({ id: g.id, name: g.display?.name })) ?? [];
      setGameList(games);
      window.ipc?.send('set-config', 'display.background.gameList', games);
    } catch (err) {
      console.error('Failed to fetch game list:', err);
    } finally {
      setLoadingGames(false);
    }
  };

  return (
    <SettingsPage description={<span className='text-red-400'>这些功能可能不稳定</span>}>
      <SettingsGroup title='自动化' icon={<ClockIcon className='w-6 h-6'></ClockIcon>}>
        <SettingsItem title='开机启动' description={`跟随系统启动此应用${autoLaunchE ? ', ' + autoLaunchE : ''}`}>
          <Switch
            isSelected={autoLaunch}
            onChange={async () => {
              window.ipc?.invoke('autoLaunch', 'set', !autoLaunch);
              setAutoLaunch(await getAutoLaunchSync());
            }}
          />
        </SettingsItem>
        <Divider></Divider>
        <SettingsItem title='自动开启热点' description={`在应用启动时开启 Windows 的移动热点`}>
          <Switch
            isSelected={startAction_openHotspot}
            onChange={() => {
              setStartAction_openHotspot(!startAction_openHotspot);
              window.ipc?.send('set-config', 'main.startAction.openHotspot', !startAction_openHotspot);
            }}
          />
        </SettingsItem>
        <SettingsItem title='开启热点延迟' description='应用启动后延迟开启热点（单位：秒）'>
          <Input
            type='number'
            min={0}
            max={600}
            className='w-24'
            value={startAction_openHotspotDelay}
            onChange={e => {
              setStartAction_openHotspotDelay(e.target.value);
              const value = parseInt(e.target.value, 10) || 0;
              if (value >= Number(e.target.min) && value <= Number(e.target.max)) {
                window.ipc?.send('set-config', 'main.startAction.openHotspotDelay', value);
              }
            }}
          />
        </SettingsItem>
      </SettingsGroup>

      <SettingsGroup title='背景' icon={<PhotoIcon className='w-6 h-6'></PhotoIcon>}>
        <SettingsItem title='使用 米哈游 游戏背景' description='从 米哈游启动器API 获取背景'>
          <Switch
            isSelected={useGameBgs}
            onChange={() => {
              const newValue = !useGameBgs;
              setUseGameBgs(newValue);
              window.ipc?.send('set-config', 'display.background.useGameBgs', newValue);
            }}
          />
        </SettingsItem>

        {useGameBgs && (
          <>
            <SettingsItem title='选择游戏' description='选择作为背景的游戏'>
              <div className='flex items-center space-x-2'>
                <Dropdown>
                  <DropdownTrigger>
                    <Button variant='flat' className='min-w-40 justify-start'>
                      {selectedGame ? gameList.find(g => g.id === selectedGame)?.name || '已选择未知游戏' : '选择游戏'}
                    </Button>
                  </DropdownTrigger>
                  <DropdownMenu
                    disallowEmptySelection
                    selectionMode='single'
                    onAction={key => {
                      setSelectedGame(String(key));
                      window.ipc?.send('set-config', 'display.background.useGame', String(key));
                    }}>
                    {gameList.length > 0 ? (
                      gameList.map(game => <DropdownItem key={game.id}>{game.name}</DropdownItem>)
                    ) : (
                      <DropdownItem key=''>请点击右侧按钮获取列表</DropdownItem>
                    )}
                  </DropdownMenu>
                </Dropdown>
                <Button isIconOnly variant='light' isLoading={loadingGames} onPress={fetchGameList} title='刷新列表'>
                  <ArrowPathIcon className='w-6 h-6'></ArrowPathIcon>
                </Button>
              </div>
            </SettingsItem>
            <SettingsItem title='允许类型' description='选择背景允许的展示形式，仅限于游戏背景'>
              <Autocomplete
                defaultItems={[
                  { key: 'video-image', label: '视频与图片' },
                  { key: 'mixed-video-image', label: '可停止的视频与图片' },
                  { key: 'image-only', label: '仅图片' },
                ]}
                selectedKey={allowGameBgsType}
                onSelectionChange={(value: string) => {
                  setAllowGameBgsType(value);
                  window.ipc?.send('set-config', 'display.background.useGameBgsAllowType', value);
                }}>
                {item => <AutocompleteItem key={item.key}>{item.label}</AutocompleteItem>}
              </Autocomplete>
            </SettingsItem>
          </>
        )}
      </SettingsGroup>

      <WeatherSettings></WeatherSettings>
    </SettingsPage>
  );
}
