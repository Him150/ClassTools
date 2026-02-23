import path from 'path';
import { app, ipcMain, screen, BrowserWindow, Menu, nativeTheme } from 'electron';
import serve from 'electron-serve';
import { createWindow } from './helpers';
import Store from 'electron-store';
import AutoLaunch from 'auto-launch';
import systeminformation from 'systeminformation';
import contextMenu from 'electron-context-menu';
import os from 'os';
import { autoUpdater } from 'electron-updater';
import dns from 'dns';
import * as Sentry from '@sentry/electron/main';
import { runHotspotScript } from './features/hotspot';

const isProd = process.env.NODE_ENV === 'production';
if (!isProd) {
  app.setPath('userData', path.join(process.cwd(), '.data'));
}

Sentry.init({
  dsn: 'https://6dca168d15f311911a41313d88e9ecd7@o4509214755782657.ingest.us.sentry.io/4510573802291200',
  // Enable logs to be sent to Sentry
  enableLogs: true,
});

if (isProd) {
  serve({ directory: 'build/app' });
}

let mainWindow_g: BrowserWindow;
let settingsWindow_g: BrowserWindow;
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.exit();
} else {
  app.on('second-instance', (event, commandLine, workingDirectory) => {
    if (mainWindow_g) {
      if (mainWindow_g.isMinimized()) mainWindow_g.restore();
      mainWindow_g.focus();
    }
  });
}
const store = new Store();
Menu.setApplicationMenu(null);
contextMenu({
  showSearchWithGoogle: false,
  showCopyLink: true,
  showLearnSpelling: false,
  showLookUpSelection: false,
  showInspectElement: true,
  labels: {
    cut: '剪切',
    copy: '复制',
    paste: '粘贴',
    selectAll: '全选',
    copyImage: '复制图像',
    inspect: '检查',
  },
});

// autoUpdater Debug
autoUpdater.logger = console;
autoUpdater.autoDownload = false;
autoUpdater.autoInstallOnAppQuit = true;

function isAutoCheckUpdateEnabled() {
  const config = store.get('upgrade.autoCheckUpdate');
  if (typeof config === 'boolean') return config;
  return true;
}
function isAutoDownloadUpdateEnabled() {
  const config = store.get('upgrade.autoDownloadUpdate');
  if (typeof config === 'boolean') return config;
  return true;
}

function getProviderPath(params: string) {
  if (isProd) {
    if (store.get('online')) return `https://class-tools.mise.run.place${params}`;
    return `app://-${params}`;
  } else {
    const port = process.argv[2];
    return `http://localhost:${port}${params}`;
  }
}
function getOverlayStyle() {
  const isDark = nativeTheme.shouldUseDarkColors;
  return {
    color: '#0000',
    symbolColor: isDark ? '#fff' : '#000',
    height: 24,
  };
}
function isWindows11() {
  const platform = os.platform();
  const release = os.release();

  // Windows 11 的版本号通常是 10.0.22000 或更高
  if (platform === 'win32' && parseInt(release.split('.')[2], 10) >= 22000) {
    return true;
  }
  return false;
}

(async () => {
  await app.whenReady();
  const mainWindowDefaultWidthPercent = 0.2;
  const mainWindowDefaultHeightPercent = 1;
  let mainWindowWidth = (() => {
    let base = screen.getPrimaryDisplay().size.width * mainWindowDefaultWidthPercent;
    if (base < 200) base = 200;
    base = Math.floor(base);
    return base;
  })();
  let mainWindowHeight = (() => {
    let base = screen.getPrimaryDisplay().workArea.height * mainWindowDefaultHeightPercent;
    base = Math.floor(base);
    return base;
  })();

  const mainWindow = new BrowserWindow({
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      webSecurity: false,
    },
    title: 'Class Tools',
    titleBarStyle: 'hidden',
    titleBarOverlay: getOverlayStyle(),
    width: mainWindowWidth,
    height: mainWindowHeight,
    x: screen.getPrimaryDisplay().workArea.width - mainWindowWidth,
    y: 0,
    skipTaskbar: true,
    resizable: !isProd,
    minimizable: false,
  });
  mainWindow_g = mainWindow;
  if (isWindows11() && store.get('display.useWindowBackgroundMaterial') == true) {
    mainWindow.setBackgroundMaterial('acrylic');
  }
  setControlBarHidden();
  nativeTheme.on('updated', () => {
    mainWindow?.setTitleBarOverlay(getOverlayStyle());
  });
  mainWindow.on('close', () => {
    mainWindow_g = undefined;
    app.exit();
  });
  resizeWindow();
  ipcMain.on('set-config', async (event, name, ...arg) => {
    if (name === 'display.windowWidth' || name === 'display.windowHeight') resizeWindow();
    if (name === 'display.hidden.controlBar') setControlBarHidden();
  });
  screen.addListener('display-metrics-changed', () => {
    resizeWindow();
  });
  function resizeWindow() {
    const widthP = store.get('display.windowWidth');
    const heightP = store.get('display.windowHeight');
    if (widthP || heightP) {
      try {
        mainWindowWidth = (() => {
          let base = screen.getPrimaryDisplay().size.width * Number(widthP || mainWindowDefaultWidthPercent);
          if (base < 300) base = 300;
          base = Math.floor(base);
          return base;
        })();
        mainWindowHeight = (() => {
          let base = screen.getPrimaryDisplay().workArea.height * Number(heightP || mainWindowDefaultHeightPercent);
          base = Math.floor(base);
          return base;
        })();
        mainWindow.setResizable(true);
        mainWindow.setSize(mainWindowWidth, mainWindowHeight);
        isProd && mainWindow.setResizable(false);
        mainWindow.setPosition(screen.getPrimaryDisplay().workArea.width - mainWindowWidth, 0);
        mainWindow.unmaximize();
      } catch (error) {
        console.error(error);
      }
    }
  }
  function setControlBarHidden(value: boolean | undefined = undefined) {
    if (typeof value === 'undefined') {
      const hidden = store.get('display.hidden.controlBar');
      mainWindow_g.setMaximizable(Boolean(!hidden));
      mainWindow_g.setClosable(Boolean(!hidden));
    } else {
      mainWindow_g.setMaximizable(value);
      mainWindow_g.setClosable(value);
    }
  }

  if (isProd) {
    await mainWindow.loadURL(getProviderPath('/home'));
    if (isAutoCheckUpdateEnabled()) {
      autoUpdater.checkForUpdates();
    }
  } else {
    await mainWindow.loadURL(getProviderPath('/home'));
  }
  ipcMain.on('close-window', async (event, arg) => {
    app.exit();
  });
  ipcMain.on('resize-window', async (event, arg) => {
    resizeWindow();
  });

  // App Custom Start Action
  try {
    if (store.get('main.startAction.openHotspot')) {
      if (os.platform() === 'win32' && parseInt(os.release().split('.')[0]) >= 10) {
        const delaySec = Number(store.get('main.startAction.openHotspotDelay') || 0);
        setTimeout(() => {
          runHotspotScript();
        }, delaySec * 1000);
      }
    }
  } catch (error) {
    console.error(error);
  }
})();

app.on('window-all-closed', () => {
  app.exit();
});

// IPC Updater
ipcMain.on('autoUpdater/checkForUpdates', () => {
  autoUpdater.checkForUpdates();
});
ipcMain.on('autoUpdater/debugMockUpdate', () => {
  if (!mainWindow_g || mainWindow_g.isDestroyed()) return;
  mainWindow_g.webContents.send('autoUpdater/update-available', {
    version: `debug-${Date.now()}`,
    files: [{ url: 'debug-mock-installer.exe', size: 42 * 1024 * 1024, sha512: 'debug-mock-sha512' }],
  });
});
autoUpdater.on('update-available', info => {
  mainWindow_g.webContents.send('autoUpdater/update-available', info);
  if (isAutoDownloadUpdateEnabled()) {
    autoUpdater.downloadUpdate();
  }
});
ipcMain.on('autoUpdater/downloadUpdate', () => {
  autoUpdater.downloadUpdate();
});
autoUpdater.on('download-progress', progress => {
  mainWindow_g.webContents.send('autoUpdater/download-progress', progress);
});
autoUpdater.on('update-downloaded', () => {
  mainWindow_g.webContents.send('autoUpdater/update-downloaded');
});
ipcMain.on('autoUpdater/quitAndInstall', () => {
  autoUpdater.quitAndInstall(true, true);
});

// IPC Config
ipcMain.handle('get-config', async (event, name: string) => {
  return store.get(name);
});
ipcMain.on('set-config', async (event, name: string, value: any) => {
  store.set(name, value);
  mainWindow_g.webContents.send('sync-config', name);

  switch (name) {
    case 'upgrade.autoCheckUpdate':
      if (isProd && value === true) {
        autoUpdater.checkForUpdates();
      }
      break;

    case 'display.useWindowBackgroundMaterial':
      if (!isWindows11()) return;
      if (value === true) {
        mainWindow_g.setBackgroundMaterial('acrylic');
      } else {
        mainWindow_g.setBackgroundMaterial('none');
      }
      break;

    default:
      break;
  }
});
ipcMain.handle('get-version', async event => {
  return app.getVersion();
});

// IPC Auto Launch
ipcMain.handle('autoLaunch', async (event, actionName: 'get' | 'set', value?: boolean) => {
  return new Promise(resolve => {
    var AutoLauncher = new AutoLaunch({
      name: app.getName(),
    });
    if (actionName === 'get') {
      AutoLauncher.isEnabled().then(isEnabled => {
        resolve(isEnabled);
      });
    } else if (actionName === 'set') {
      if (value) {
        AutoLauncher.enable();
      } else {
        AutoLauncher.disable();
      }
      resolve(undefined);
    }
  });
});

// Define a type for the possible DNS record types
type DnsRecordType = 'A' | 'AAAA' | 'MX' | 'TXT' | 'CNAME' | 'NS' | 'PTR' | 'SOA';

// Add an IPC handler for resolving DNS records with a specified record type
ipcMain.handle('resolveDns', async (event, domain: string, recordType: DnsRecordType): Promise<any> => {
  return new Promise((resolve, reject) => {
    dns.resolve(domain, recordType, (err, addresses) => {
      if (err) {
        reject(`Error resolving DNS for ${domain} with record type ${recordType}: ${err.message}`);
      } else {
        resolve(addresses); // Resolves to an array of DNS records (strings)
      }
    });
  });
});

ipcMain.handle('systeminformation', async (event, action: any) => {
  return new Promise(resolve => {
    systeminformation.get(action).then(data => {
      resolve(data);
    });
  });
});

ipcMain.on('sys-shutdown', async (event, arg) => {
  if (!isProd) return;
  const cp = require('child_process');
  cp.execSync('shutdown -s -t 0');
});

ipcMain.on('settings-window', async (event, arg) => {
  if (settingsWindow_g) {
    settingsWindow_g.show();
    return;
  }
  const settingsWindow = createWindow('settingsWindow', {
    title: 'Class Tools',
    width: 1000,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      webSecurity: false,
    },
    maximizable: true,
    resizable: true,
  });
  settingsWindow.on('close', () => {
    settingsWindow_g = undefined;
  });
  settingsWindow_g = settingsWindow;

  arg && arg[0] && settingsWindow.webContents.openDevTools();

  await settingsWindow.loadURL(getProviderPath('/settings'));
});

ipcMain.handle('runHotspotScript', async (event, action: any) => {
  return new Promise(async resolve => {
    resolve(await runHotspotScript(true));
  });
});
