declare module '*.png';
declare module '*.jpg';
declare module '*.jpeg';
declare module '*.svg';
declare const __APP_VERSION__: string;

interface ElectronAPI {
    pathForFile: (file: File) => string;
    getVersion: () => Promise<string>;
    openLogs: () => void;
    checkForUpdates: () => Promise<{ state: 'unavailable' | 'current' | 'available' | 'error'; version?: string }>;
    installUpdate: () => void;
    onUpdateStatus: (callback: (status: { state: 'downloading' | 'ready'; version: string; notes?: string }) => void) => () => void;
    /** Sends an error to the main process, which writes it to the log file. */
    logError: (message: string, detail?: string) => void;
    windowControls: {
        minimize: () => void;
        maximize: () => void;
        close: () => void;
        onMaximizeChange: (callback: (isMaximized: boolean) => void) => void;
    };
    sendMessage: (channel: string, data: unknown) => void;
    on: (channel: string, func: (...args: unknown[]) => void) => void;
}

interface Window {
    /** Present only when running inside the desktop app. */
    electronAPI?: ElectronAPI;
}
