import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import pkg from 'electron-updater';
const { autoUpdater } = pkg;
import { fileURLToPath } from 'url';

// Fix for ES module path resolution
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow: BrowserWindow | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
    icon: app.isPackaged
      ? path.join(__dirname, '../dist/logo keicei.png')
      : path.join(__dirname, '../public/logo keicei.png'),
  });

  // Check if we are in development mode
  const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    // In production, load the local index.html
    // relative to the final built electron-main.js usually in dist-electron or similar
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Auto-Update Logic
  if (!isDev) {
    autoUpdater.checkForUpdatesAndNotify();
  }
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });

  // Auto-updater events
  autoUpdater.on('checking-for-update', () => {
    console.log('Checking for update...');
  });
  autoUpdater.on('update-available', (info) => {
    console.log('Update available.', info);
  });
  autoUpdater.on('update-not-available', (info) => {
    console.log('Update not available.', info);
  });
  autoUpdater.on('error', (err) => {
    console.log('Error in auto-updater. ' + err);
  });
  autoUpdater.on('download-progress', (progressObj) => {
    let log_message = "Download speed: " + progressObj.bytesPerSecond;
    log_message = log_message + ' - Downloaded ' + progressObj.percent + '%';
    log_message = log_message + ' (' + progressObj.transferred + "/" + progressObj.total + ')';
    console.log(log_message);
  });
  autoUpdater.on('update-downloaded', (info) => {
    console.log('Update downloaded');
    // detailed guide: https://www.electron.build/auto-update
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
