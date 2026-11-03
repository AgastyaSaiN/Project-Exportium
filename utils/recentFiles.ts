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

/** Reads a recent export back from disk through the desktop app. Null when it moved or is gone. */
export const reopenRecent = async (entry: RecentExport): Promise<File | null> => {
    if (!entry.path) return null;
    try {
        const response = await fetch(`exportium-file://file/?p=${encodeURIComponent(entry.path)}`);
        if (!response.ok) return null;
        return new File([await response.blob()], entry.name, { lastModified: entry.lastModified });
    } catch {
        return null;
    }
};

/** Desktop app only: reopening needs the file's path, which the browser never reveals. */
export const canReopenRecents = (): boolean => typeof window !== 'undefined' && !!window.electronAPI?.pathForFile;
