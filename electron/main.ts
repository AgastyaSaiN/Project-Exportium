import { app, BrowserWindow, ipcMain, net, protocol, session, shell } from 'electron';
import path from 'path';
import pkg from 'electron-updater';
const { autoUpdater } = pkg;
import { fileURLToPath, pathToFileURL } from 'url';
import { getLogPath, log } from './logger.js';

// Fix for ES module path resolution
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow: BrowserWindow | null = null;

// Lets the app reopen a recent export from its path without asking for the file again. Registered
// before `ready`, as Electron requires for scheme privileges.
protocol.registerSchemesAsPrivileged([
  { scheme: 'exportium-file', privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true, bypassCSP: true } },
]);

const REOPENABLE_EXTENSIONS = new Set(['.zip', '.json', '.txt']);

// The packaged app has no business talking to the internet except to fetch its own updates.
const UPDATE_HOSTS = ['github.com', 'api.github.com', 'githubusercontent.com'];
const isUpdateHost = (hostname: string) => UPDATE_HOSTS.some(host => hostname === host || hostname.endsWith(`.${host}`));

const sendToWindow = (channel: string, payload: unknown) => {
  if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send(channel, payload);
};

process.on('uncaughtException', (error) => log('error', 'Uncaught exception in main process', error));
process.on('unhandledRejection', (reason) => log('error', 'Unhandled rejection in main process', reason));

// Errors caught in the renderer (React error boundary, window.onerror) end up in the same log file.
ipcMain.on('log-renderer-error', (_event, message: unknown, detail: unknown) => {
  log('error', `Renderer: ${String(message)}`, detail);
});

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false, // Fix for "Cannot use import statement outside a module" in preload
      // partition: 'persist:main', 
    },
    icon: app.isPackaged
      ? path.join(__dirname, '../dist/logo.png')
      : path.join(__dirname, '../public/logo.png'),
    // Frameless window Config
    frame: true,
    // transparent: false, 
    // We are simulating transparency in the TitleBar CSS, not the whole window.
    autoHideMenuBar: true,
  });

  // Window Controls IPC
  ipcMain.on('window-minimize', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    win?.minimize();
  });
  ipcMain.on('window-maximize', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win?.isMaximized()) {
      win.unmaximize();
    } else {
      win?.maximize();
    }
  });
  ipcMain.on('window-close', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    win?.close();
  });

  // Recover from a crashed or hung renderer instead of leaving a dead window.
  mainWindow.webContents.on('render-process-gone', (_event, details) => {
    log('error', 'Renderer process gone', details);
    if (details.reason !== 'clean-exit' && details.reason !== 'killed') {
      mainWindow?.reload();
    }
  });
  mainWindow.on('unresponsive', () => log('warn', 'Window became unresponsive'));
  mainWindow.on('responsive', () => log('info', 'Window responsive again'));
  mainWindow.webContents.on('did-fail-load', (_event, code, description, url) => {
    log('error', `Failed to load ${url}`, { code, description });
  });

  // Links open in the system browser; the app itself never navigates away.
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https://') || url.startsWith('http://')) {
      shell.openExternal(url);
      return { action: 'deny' };
    }
    // blob: URLs power "open media fullscreen" and stay inside Electron.
    return { action: 'allow' };
  });

  // Maximize/Unmaximize listeners
  mainWindow.on('maximize', () => mainWindow?.webContents.send('window-maximized'));
  mainWindow.on('unmaximize', () => mainWindow?.webContents.send('window-unmaximized'));

  // Check if we are in development mode
  const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

  if (isDev) {
    mainWindow.loadURL('http://localhost:3000');
    // mainWindow.webContents.openDevTools(); // Commented out to stop auto-opening
  } else {
    // In production, load the local index.html
    // relative to the final built electron-main.js usually in dist-electron or similar
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Auto-Update Logic: the window shows its own "update ready" banner, so no OS notification is needed.
  if (!isDev) {
    autoUpdater.checkForUpdates().catch(error => log('error', 'Update check failed', error));
  }
}

app.whenReady().then(() => {
  protocol.handle('exportium-file', (request) => {
    const requested = new URL(request.url).searchParams.get('p');
    if (!requested || !REOPENABLE_EXTENSIONS.has(path.extname(requested).toLowerCase())) {
      return new Response('Not allowed', { status: 403 });
    }
    return net.fetch(pathToFileURL(requested).toString());
  });

  if (app.isPackaged) {
    session.defaultSession.webRequest.onBeforeRequest({ urls: ['http://*/*', 'https://*/*', 'ws://*/*', 'wss://*/*'] }, (details, callback) => {
      let allowed = false;
      try { allowed = isUpdateHost(new URL(details.url).hostname); } catch { allowed = false; }
      if (!allowed) log('warn', `Blocked network request to ${details.url}`);
      callback({ cancel: !allowed });
    });
  }

  ipcMain.handle('app:version', () => app.getVersion());
  ipcMain.on('logs:open', () => { const file = getLogPath(); if (file) shell.showItemInFolder(file); });
  ipcMain.handle('update:check', async () => {
    if (!app.isPackaged) return { state: 'unavailable' as const };
    try {
      const result = await autoUpdater.checkForUpdates();
      const available = !!result?.updateInfo && result.updateInfo.version !== app.getVersion();
      return { state: available ? 'available' as const : 'current' as const, version: result?.updateInfo.version };
    } catch (error) {
      log('error', 'Manual update check failed', error);
      return { state: 'error' as const };
    }
  });
  ipcMain.on('update:install', () => autoUpdater.quitAndInstall());

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });

  // Auto-updater events
  autoUpdater.on('checking-for-update', () => log('info', 'Checking for update...'));
  autoUpdater.on('update-available', (info) => {
    log('info', 'Update available', info.version);
    sendToWindow('update-status', { state: 'downloading', version: info.version });
  });
  autoUpdater.on('update-not-available', () => log('info', 'Update not available'));
  autoUpdater.on('error', (err) => log('error', 'Auto-updater error', err));
  autoUpdater.on('download-progress', (progress) => {
    log('info', `Update download ${Math.round(progress.percent)}% (${progress.transferred}/${progress.total})`);
  });
  autoUpdater.on('update-downloaded', (info) => {
    log('info', 'Update downloaded', info.version);
    const notes = typeof info.releaseNotes === 'string' ? info.releaseNotes : Array.isArray(info.releaseNotes) ? info.releaseNotes.map(n => n.note ?? '').join(' ') : '';
    sendToWindow('update-status', { state: 'ready', version: info.version, notes });
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
