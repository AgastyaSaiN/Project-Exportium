import { contextBridge, ipcRenderer, webUtils } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
    // Add any needed IPC methods here
    sendMessage: (channel: string, data: unknown) => {
        const validChannels = ['toMain'];
        if (validChannels.includes(channel)) {
            ipcRenderer.send(channel, data);
        }
    },
    on: (channel: string, func: (...args: unknown[]) => void) => {
        const validChannels = ['fromMain'];
        if (validChannels.includes(channel)) {
            // Deliberately strip event as it includes `sender`
            ipcRenderer.on(channel, (event, ...args) => func(...args));
        }
    },
    /** The path of a file the user picked or dropped, so the app can reopen it from the recent list. */
    pathForFile: (file: File): string => {
        try { return webUtils.getPathForFile(file); } catch { return ''; }
    },
    getVersion: (): Promise<string> => ipcRenderer.invoke('app:version'),
    openLogs: () => ipcRenderer.send('logs:open'),
    checkForUpdates: (): Promise<{ state: 'unavailable' | 'current' | 'available' | 'error'; version?: string }> => ipcRenderer.invoke('update:check'),
    installUpdate: () => ipcRenderer.send('update:install'),
    onUpdateStatus: (callback: (status: { state: 'downloading' | 'ready'; version: string; notes?: string }) => void) => {
        const listener = (_event: unknown, status: { state: 'downloading' | 'ready'; version: string; notes?: string }) => callback(status);
        ipcRenderer.on('update-status', listener);
        return () => ipcRenderer.removeListener('update-status', listener);
    },
    logError: (message: string, detail?: string) => ipcRenderer.send('log-renderer-error', message, detail),
    windowControls: {
        minimize: () => ipcRenderer.send('window-minimize'),
        maximize: () => ipcRenderer.send('window-maximize'),
        close: () => ipcRenderer.send('window-close'),
        onMaximizeChange: (callback: (isMaximized: boolean) => void) => {
            ipcRenderer.on('window-maximized', () => callback(true));
            ipcRenderer.on('window-unmaximized', () => callback(false));
        }
    }
});
