'use client';
import { useEffect, useState, useRef, useLayoutEffect, useReducer } from 'react';
import {
  Button,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useDisclosure,
  Image,
  Skeleton,
} from '@heroui/react';
import {
  Cog6ToothIcon,
  ArrowPathIcon,
  XMarkIcon,
  CheckIcon,
  PowerIcon,
  PlayIcon,
  PauseIcon,
  ArrowUturnLeftIcon,
} from '@heroicons/react/24/outline';
import UpdateModal from './updateModal';
import ClassList from './classList';
import { Weather } from '@renderer/components/weather';
import { getConfigSync } from '@renderer/features/ipc/config';
import { generateConfig } from '@renderer/features/p_function';
import { reducer, initialState as reducerInitialState } from './reducer';

export default function HomePage() {
  const { isOpen, onOpen, onOpenChange } = useDisclosure();

  useEffect(() => {
    const serviceWorkerScope = `/workbox-sw.js`;
    navigator.serviceWorker &&
      location.protocol === 'https:' &&
      navigator.serviceWorker
        .register(serviceWorkerScope)
        .then(() => {
          // console.info(`Service worker registered at ${serviceWorkerScope}`);
        })
        .catch(error => {
          console.error('Error in serviceWorker registration: ', error);
        });
  }, []);

  return (
    <>
      <title>Class Tools</title>
      <Modal isOpen={isOpen} placement={'bottom'} onOpenChange={onOpenChange}>
        <ModalContent>
          {onClose => (
            <>
              <ModalHeader className='flex flex-col gap-1'>确认关机</ModalHeader>
              <ModalBody>
                <p className='text-content3-foreground text-sm'>关闭所有应用，然后关闭电脑。</p>
              </ModalBody>
              <ModalFooter>
                <Button
                  color='default'
                  variant='light'
                  onPress={onClose}
                  className='min-w-1'
                  radius='full'
                  fullWidth={true}>
                  <XMarkIcon className='w-5 h-5'></XMarkIcon>取消
                </Button>
                <Button
                  color='danger'
                  className='min-w-1'
                  radius='full'
                  fullWidth={true}
                  onPress={() => {
                    window.ipc?.send('sys-shutdown');
                  }}>
                  <CheckIcon className='w-5 h-5'></CheckIcon>确认
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
      <MainContent onShutdownModalOpen={onOpen}></MainContent>
      <UpdateModal></UpdateModal>
    </>
  );
}
function MainContent({ onShutdownModalOpen }) {
  const [wallpapers, setWallpapers] = useState([]);
  const [wallpapersLoading, setWallpapersLoading] = useState(true);
  const [currentWallpaper, setCurrentWallpaper] = useState<string | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const wallpaperListRef = useRef<HTMLDivElement>(null);
  const [fontSize, setFontSize] = useState(1);
  const [windowFocused, setWindowFocused] = useState(true);

  useLayoutEffect(() => {
    const loadFontSize = async () => {
      const size = await getConfigSync('display.fontSize');
      setFontSize(Number(size) || 1);
    };
    loadFontSize();
    const handler = (name: string) => {
      if (name === 'display.fontSize') loadFontSize();
    };

    window.ipc?.on('sync-config', handler);
    return () => {
      window.ipc?.removeListener?.('sync-config', handler);
    };
  }, []);
  useLayoutEffect(() => {
    const savedIndex = localStorage.getItem('default_wallpaper_select');
    if (savedIndex) {
      setSelectedIndex(parseInt(savedIndex, 10));
    }
  }, []);
  useEffect(() => {
    const handleFocus = () => setWindowFocused(true);
    const handleBlur = () => setWindowFocused(false);

    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);

    return () => {
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('blur', handleBlur);
    };
  }, []);
  const updateWallpaper = (newWallpaper: string, index: number) => {
    localStorage.setItem('default_wallpaper_select', index.toString());
    setSelectedIndex(index);
    setCurrentWallpaper(newWallpaper ?? '');

    // 使用 requestAnimationFrame 确保在 DOM 更新后再滚动
    requestAnimationFrame(() => {
      const container = wallpaperListRef.current;
      if (container) {
        const imageElement = container.children[index] as HTMLElement;
        if (imageElement) {
          imageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }
    });
  };

  useEffect(() => {
    const CACHE_KEY = 'default_wallpaper';
    const EXPIRES_KEY = 'default_wallpaper_expires';
    const CACHE_DURATION = 5 * 60 * 1000; // 5 mins
    const DISABLE_CACHE = false;

    const now = Date.now();
    const cached = localStorage.getItem(CACHE_KEY);
    const expires = parseInt(localStorage.getItem(EXPIRES_KEY) || '0', 10);

    interface WallpaperItem {
      type: 'image' | 'video' | 'mixed';
      video_url?: string;
      image_url?: string;
    }

    (async () => {
      setWallpapersLoading(true);
      const useGameBgs = await getConfigSync('display.background.useGameBgs');
      const useGame = await getConfigSync('display.background.useGame');
      const useAllowType = await getConfigSync('display.background.useGameBgsAllowType');
      let gameBg_object: any = { type: 'image' };
      // 尝试拉取游戏背景，如果失败则回退为不使用游戏背景（不把 gameBg_object 加到列表前置）
      let useGameBgsEffective = useGameBgs && useGame;
      if (useGameBgs && useGame) {
        try {
          const res = await fetch(
            `https://hyp-api.mihoyo.com/hyp/hyp-connect/api/getAllGameBasicInfo?launcher_id=jGHBHlcOq1&game_id=${useGame}`,
          );
          const data = await res.json();
          const info = data?.data?.game_info_list?.[0];
          if (info && info.backgrounds?.length > 0) {
            const bg = info.backgrounds[0];
            if (bg.video?.url) {
              gameBg_object.video_url = bg.video.url;
              if (useAllowType === 'video-image') {
                gameBg_object.type = 'video';
              } else if (useAllowType !== 'image-only') {
                gameBg_object.type = 'mixed';
              }
            }
            if (bg.background?.url) gameBg_object.image_url = bg.background.url;
          }
          // 如果没有拿到有效的 image/video，则认为拉取无效
          if (!gameBg_object.video_url && !gameBg_object.image_url) {
            useGameBgsEffective = false;
          }
        } catch (err) {
          console.error('Failed to fetch game backgrounds, disabling useGameBgs:', err);
          // 拉取失败则不使用游戏背景
          useGameBgsEffective = false;
        }
      }

      // 缓存读取
      if (!DISABLE_CACHE && cached && now < expires) {
        try {
          const cachedData: WallpaperItem[] = JSON.parse(cached);
          let wallpaperList: WallpaperItem[] = useGameBgsEffective ? [gameBg_object, ...cachedData] : cachedData;
          setWallpapers(wallpaperList);
          setWallpapersLoading(false);
          const savedIndex = parseInt(localStorage.getItem('default_wallpaper_select') || '0', 10);
          const validIndex = savedIndex < wallpaperList.length ? savedIndex : 0;
          updateWallpaper(wallpaperList[validIndex].image_url, validIndex);
        } catch (err) {
          console.error('Failed to parse json for wallpaper:', err);
        }
        return;
      }

      fetchDnsWallpaper(useGameBgsEffective ? [gameBg_object] : []);
    })();

    // 优先使用 alidns，再回退到 cloudflare DoH，最后回退到原有的 window.ipc 解析方式
    async function fetchDnsWallpaper(addBefore?: WallpaperItem[]) {
      const domain = 'default-bgs.class-tools.app.lukas1.eu.org';

      // 封装：尝试通过一个 DoH 提供者获取 TXT 记录，返回字符串数组或 null
      async function tryDoH(url: string, headers?: Record<string, string>) {
        try {
          const res = await fetch(url, { headers: headers || {}, cache: 'no-store' });
          if (!res.ok) {
            throw new Error(`HTTP ${res.status} from ${url}`);
          }
          const json = await res.json();
          // 常见 JSON 结构：{ Answer: [ { data: "..." }, ... ] }
          if (json && Array.isArray(json.Answer) && json.Answer.length > 0) {
            const joined = json.Answer.map((a: any) => {
              // TXT 记录通常以引号包裹，如: "\"BASE64...\"" 或 "BASE64..."
              let d = a.data;
              if (typeof d === 'string') {
                // 移除外层引号
                d = d.replace(/"| /g, '');
              }
              return d;
            });
            return joined;
          }
          // 某些服务可能返回 { Answer: "..." } 或其他形式，尝试宽松处理
          if (json && json.Answer && typeof json.Answer === 'string') {
            return [json.Answer.replace(/"| /g, '')];
          }
          return null;
        } catch (err) {
          console.warn('tryDoH failed for', url, err);
          return null;
        }
      }

      let base64String = '';

      // 1) alidns
      if (!base64String) {
        try {
          const url = `https://dns.alidns.com/resolve?name=${encodeURIComponent(domain)}&type=TXT`;
          const ans = await tryDoH(url);
          if (ans && ans.length > 0) {
            base64String = ans[0].replace(/^"|"$/g, '');
          }
        } catch (err) {
          console.warn('alidns attempt failed', err);
        }
      }

      // 2) cloudflare DoH (application/dns-json)
      if (!base64String) {
        try {
          const url = `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(domain)}&type=TXT`;
          const ans = await tryDoH(url, { Accept: 'application/dns-json' });
          if (ans && ans.length > 0) {
            base64String = ans[0].replace(/"| /g, '');
          }
        } catch (err) {
          console.warn('cloudflare doh attempt failed', err);
        }
      }

      // 3) 最后回退到 window.ipc 原有解析方式
      if (!base64String) {
        try {
          const txtRecords: string[][] = await window.ipc?.invoke('resolveDns', domain, 'TXT');
          base64String = Array.isArray(txtRecords) ? txtRecords[0].join('') : '';
        } catch (err) {
          console.error('ipc resolveDns fallback failed', err);
        }
      }

      if (!base64String) {
        console.error('No valid TXT record found from any DNS provider');
        return;
      }

      try {
        const decodedUrls_json = atob(base64String);
        const rawList = JSON.parse(decodedUrls_json);

        // 清洗列表，兼容旧列表格式
        const normalizedList = rawList.map((data: string | any) => {
          if (typeof data === 'object') {
            if (
              (data.type === 'image' || data.type === 'video' || data.type === 'mixed') &&
              (data.video_url || data.image_url)
            ) {
              return data;
            }
          }
          return { type: 'image', image_url: data };
        });

        localStorage.setItem(CACHE_KEY, JSON.stringify(normalizedList));
        localStorage.setItem(EXPIRES_KEY, (now + CACHE_DURATION).toString());

        let wallpaperList: WallpaperItem[] = [...(addBefore || []), ...normalizedList];

        setWallpapers(wallpaperList);
        const savedIndex = parseInt(localStorage.getItem('default_wallpaper_select') || '0', 10);
        const validIndex = savedIndex < wallpaperList.length ? savedIndex : 0;
        updateWallpaper(wallpaperList[validIndex].image_url, validIndex);
      } catch (err) {
        console.error('Failed to decode/parse wallpaper TXT record payload:', err);
      } finally {
        setWallpapersLoading(false);
      }
    }
  }, []);

  // 处理初始滚动到选中的壁纸
  useEffect(() => {
    if (wallpapers.length > 0) {
      const container = wallpaperListRef.current;
      if (container) {
        const imageElement = container.children[selectedIndex] as HTMLElement;
        if (imageElement) {
          imageElement.scrollIntoView({ behavior: 'instant', block: 'center' });
        }
      }
    }
  }, [wallpapers]);

  const [state, dispatch] = useReducer(reducer, reducerInitialState);

  useEffect(() => {
    const loadConfig = async () => {
      const config = await generateConfig();

      const display = {
        slidingPosition: ((await getConfigSync('display.slidingPosition')) as any) ?? 'center',
        timeDisplay: ((await getConfigSync('display.timeDisplay')) as any) ?? 'always',
        progressDisplay: ((await getConfigSync('display.progressDisplay')) as any) ?? 'always',
        hiddenControlBar: ((await getConfigSync('display.hidden.controlBar')) as any) ?? false,
        hiddenRefreshWindow: ((await getConfigSync('display.hidden.refreshWindow')) as any) ?? false,
        useWindowBackgroundMaterial: ((await getConfigSync('display.useWindowBackgroundMaterial')) as any) ?? false,
      };

      dispatch({
        type: 'UPDATE',
        payload: {
          classSchedule: config,
          display,
        },
      });
    };

    loadConfig();

    const handler = (name: string) => {
      if (name.startsWith('display.') || name.startsWith('lessonsList.')) {
        loadConfig();
      }
    };

    window.ipc?.on('sync-config', handler);
    return () => {
      window.ipc?.removeListener?.('sync-config', handler);
    };
  }, []);

  return (
    <div
      className={`flex flex-col gap-0 p-0 h-full transition-background ${
        (currentWallpaper && !state.display.useWindowBackgroundMaterial) ||
        (state.display.useWindowBackgroundMaterial && windowFocused)
          ? ''
          : 'bg-neutral-100 dark:bg-neutral-800'
      }`}
      style={{
        fontSize: fontSize + 'em',
      }}>
      {/* Toolbar */}
      <div className={`flex gap-2 items-center bg-white/40 dark:bg-black/20 h-6`}>
        <Button
          isIconOnly
          variant='light'
          radius='none'
          onPress={() => {
            window.ipc?.send('resize-window');
          }}
          className='h-6 w-6 flex items-center justify-center'>
          <ArrowUturnLeftIcon className='w-4 h-4 text-gray-900 dark:text-gray-100'></ArrowUturnLeftIcon>
        </Button>
        <span className={`text-sm w-full select-none ${state.display.hiddenControlBar || '[app-region:drag]'}`}>
          Class Tools
        </span>
      </div>

      {/* Main Content */}
      <div className='flex flex-col gap-2 py-0 grow overflow-y-auto scrollbar-hide'>
        <ClassList
          schedule={state.classSchedule}
          slidingPosition={state.display.slidingPosition}
          timeDisplay={state.display.timeDisplay}
          progressDisplay={state.display.progressDisplay}></ClassList>
        {/* Background Picture List */}
        <div className='w-full flex justify-center px-2'>
          <div
            ref={wallpaperListRef}
            className='flex flex-col gap-4 overflow-auto max-h-[40vh] aspect-video scrollbar-hide rounded-lg shadow-md snap-y snap-proximity'>
            {wallpapersLoading ? (
              <div className='w-screen grow max-w-full snap-center object-contain'>
                <Skeleton className='w-full aspect-video rounded-lg'></Skeleton>
              </div>
            ) : (
              wallpapers.map((wallpaper, index) => {
                const { type, image_url, video_url } = wallpaper;
                const key = `wallpaper-${index}`;
                const handleClick = () => updateWallpaper(image_url, index);

                return (
                  <div
                    key={key}
                    className='relative w-full aspect-video rounded-lg snap-center object-contain'
                    onClick={handleClick}>
                    {type === 'mixed' ? (
                      <>
                        {state.playingMixed ? (
                          <video
                            src={video_url}
                            className='w-full h-full rounded-lg object-contain'
                            muted
                            loop
                            autoPlay
                            playsInline
                          />
                        ) : (
                          <Image
                            src={image_url}
                            className='w-full h-full rounded-lg object-contain'
                            referrerPolicy='no-referrer'
                          />
                        )}
                        <button
                          onClick={() => {
                            dispatch({
                              type: 'SET_PLAYING_MIXED',
                              payload: !state.playingMixed,
                            });
                          }}
                          className='z-20 absolute bottom-1 left-1 bg-black/30 text-white/60 text-sm p-1 rounded-full hover:bg-black/40 hover:text-white/80 transition-colors'>
                          {state.playingMixed ? (
                            <PauseIcon className='w-4 h-4'></PauseIcon>
                          ) : (
                            <PlayIcon className='w-4 h-4'></PlayIcon>
                          )}
                        </button>
                      </>
                    ) : type === 'video' ? (
                      <video
                        key={key}
                        src={video_url}
                        className='max-w-full aspect-video rounded-lg snap-center select-none object-contain'
                        onClick={handleClick}
                        muted
                        loop
                        autoPlay
                        playsInline
                      />
                    ) : (
                      <Image
                        key={key}
                        src={image_url || null}
                        className='max-w-full aspect-video rounded-lg snap-center select-none object-contain'
                        onClick={handleClick}
                        referrerPolicy='no-referrer'
                      />
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className='flex gap-1 items-center bg-white/40 dark:bg-black/10 p-1 rounded-lg shrink-0 overflow-x-auto'>
        <Button
          isIconOnly
          onPress={() => {
            if (window.ipc) {
              window.ipc?.send('settings-window');
            } else {
              window.location.href = '/settings';
            }
          }}
          aria-label='Settings'>
          <Cog6ToothIcon className='w-5 h-5'></Cog6ToothIcon>
        </Button>
        {!state.display.hiddenRefreshWindow && (
          <Button
            isIconOnly
            onPress={() => {
              window.location.reload();
            }}
            aria-label='Refresh'>
            <ArrowPathIcon className='w-5 h-5'></ArrowPathIcon>
          </Button>
        )}
        <div className='flex-1'></div>
        <Button className='font-bold' onPress={onShutdownModalOpen} isIconOnly={true}>
          <PowerIcon className='w-5 h-5'></PowerIcon>
        </Button>
        <Weather />
      </div>
      {/* Background */}
      <div
        className={
          'absolute top-0 z-[-1] w-full h-full ' + (state.display.useWindowBackgroundMaterial ? 'hidden' : '')
        }>
        <Image
          className={`object-cover select-none w-full h-full svg-blur-filter`}
          radius='none'
          removeWrapper={true}
          referrerPolicy='no-referrer'
          draggable='false'
          src={currentWallpaper || null}
        />
      </div>
    </div>
  );
}
