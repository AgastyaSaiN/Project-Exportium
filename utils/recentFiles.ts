import { Capacitor, registerPlugin } from '@capacitor/core';
import { exportKeyFor, rememberRecent } from './storage';
import type { RecentExport } from './storage';

/** Records an export the user just opened and returns the key its settings are stored under. */
export const trackExport = (platform: string, file: File): string => {
    const path = window.electronAPI?.pathForFile(file) || undefined;
    rememberRecent({ platform, name: file.name, size: file.size, lastModified: file.lastModified, path });
    return exportKeyFor(platform, file);
};

/**
 * A folder export has no single file to reopen later, but its settings should still be found
 * again, so identify it by its top folder name and how many files it holds.
 */
export const folderExportKey = (platform: string, files: File[]): string => {
    const first = (files[0] as File & { webkitRelativePath?: string } | undefined)?.webkitRelativePath ?? '';
    const folder = first.split('/')[0] || 'folder';
    return `${platform}:folder:${folder}:${files.length}`;
};

/** The Android app keeps its own memory of opened files (see RecentFilesPlugin.java). */
interface RecentFilesNative {
    queueReopen(file: { name: string; size: number }): Promise<{ ok: boolean }>;
    forget(file: { name: string; size: number }): Promise<void>;
}
const AndroidRecents = registerPlugin<RecentFilesNative>('RecentFiles');

export const isAndroidApp = (): boolean => Capacitor.isNativePlatform();

/**
 * Android: the native side holds a permission to the file and hands it to the next file chooser, so
 * a hidden file input is enough to get a normal, lazily read `File` back without showing the picker.
 */
const reopenOnAndroid = async (entry: RecentExport): Promise<File | null> => {
    try {
        const { ok } = await AndroidRecents.queueReopen({ name: entry.name, size: entry.size });
        if (!ok) return null;
    } catch {
        return null;
    }
    return new Promise<File | null>(resolve => {
        const input = document.createElement('input');
        input.type = 'file';
        input.style.display = 'none';
        document.body.appendChild(input);
        const finish = (file: File | null) => { input.remove(); resolve(file); };
        input.addEventListener('change', () => finish(input.files?.[0] ?? null));
        input.addEventListener('cancel', () => finish(null));
        input.click();
    });
};

/** Forgets what the Android app kept about a file (its permission and location). */
export const forgetOnAndroid = (entry: RecentExport): void => {
    if (isAndroidApp()) void AndroidRecents.forget({ name: entry.name, size: entry.size }).catch(() => undefined);
};

/** Reads a recent export back from disk through the desktop app, or from Android's remembered files. Null when it moved or is gone. */
export const reopenRecent = async (entry: RecentExport): Promise<File | null> => {
    if (isAndroidApp()) return reopenOnAndroid(entry);
    if (!entry.path) return null;
    try {
        const response = await fetch(`exportium-file://file/?p=${encodeURIComponent(entry.path)}`);
        if (!response.ok) return null;
        return new File([await response.blob()], entry.name, { lastModified: entry.lastModified });
    } catch {
        return null;
    }
};

/** Desktop app (it knows the file's path) or the Android app (it keeps access to chosen files). */
export const canReopenRecents = (): boolean => isAndroidApp() || (typeof window !== 'undefined' && !!window.electronAPI?.pathForFile);
