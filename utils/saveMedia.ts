import type { MediaSource } from './mediaLoader';

/** The file name to save under: the last path segment, without characters Windows rejects. */
export const fileNameFor = (uri: string, fallback = 'file'): string => {
    const raw = decodeURIComponent(uri.split('/').pop() || fallback);
    // Control characters (code below 32) and the characters Windows reserves cannot appear in a file name.
    const reserved = '<>:"/\\|?*';
    const cleaned = Array.from(raw, ch => (ch.charCodeAt(0) < 32 || reserved.includes(ch) ? '_' : ch)).join('');
    return cleaned || fallback;
};

/** Saves the original file (not a preview) through the browser's download, which Electron turns into a Save dialog. */
export const saveMedia = async (media: MediaSource, uri: string, suggestedName?: string): Promise<boolean> => {
    const url = await media(uri);
    if (!url) return false;
    const link = document.createElement('a');
    link.href = url;
    link.download = suggestedName || fileNameFor(uri);
    document.body.appendChild(link);
    link.click();
    link.remove();
    // The download has its own handle on the data once started; let the loader reclaim the URL later.
    setTimeout(() => media.release(uri), 60_000);
    return true;
};

/** Saves text the app generated (an exported chat, a CSV) as a file. */
export const saveText = (text: string, fileName: string, mime = 'text/plain'): void => {
    const url = URL.createObjectURL(new Blob([text], { type: `${mime};charset=utf-8` }));
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
};
