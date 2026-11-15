import { Capacitor, registerPlugin } from '@capacitor/core';
import type { MediaSource } from './mediaLoader';

/** The file name to save under: the last path segment, without characters Windows rejects. */
export const fileNameFor = (uri: string, fallback = 'file'): string => {
    const raw = decodeURIComponent(uri.split('/').pop() || fallback);
    // Control characters (code below 32) and the characters Windows reserves cannot appear in a file name.
    const reserved = '<>:"/\\|?*';
    const cleaned = Array.from(raw, ch => (ch.charCodeAt(0) < 32 || reserved.includes(ch) ? '_' : ch)).join('');
    return cleaned || fallback;
};

// ----------------------------------------------------------------------------- Android: save / share

interface FileOutApi {
    begin(options: { name: string }): Promise<{ id: string }>;
    chunk(options: { id: string; data: string }): Promise<void>;
    finish(options: { id: string; mime: string; mode: 'save' | 'share' }): Promise<{ ok: boolean; where?: string; reason?: string }>;
}
const FileOut = registerPlugin<FileOutApi>('FileOut');

const MIME_BY_EXTENSION: Record<string, string> = {
    jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif', webp: 'image/webp', heic: 'image/heic',
    mp4: 'video/mp4', mov: 'video/quicktime', webm: 'video/webm', '3gp': 'video/3gpp', mkv: 'video/x-matroska',
    mp3: 'audio/mpeg', m4a: 'audio/mp4', ogg: 'audio/ogg', opus: 'audio/ogg', wav: 'audio/wav', aac: 'audio/aac',
    pdf: 'application/pdf', txt: 'text/plain', zip: 'application/zip',
};
const mimeFor = (blob: Blob, name: string): string => {
    if (blob.type) return blob.type;
    return MIME_BY_EXTENSION[name.split('.').pop()?.toLowerCase() ?? ''] ?? 'application/octet-stream';
};

const CHUNK_BYTES = 768 * 1024; // a multiple of 3, so every chunk is clean base64
const toBase64 = (part: Blob): Promise<string> => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1] ?? '');
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(part);
});

export const isAndroidShell = (): boolean => Capacitor.isNativePlatform();

export interface NativeResult { ok: boolean; message: string }

/** Android: copies a chat file to the phone (Pictures / Movies / Downloads, in an "Exportium" folder) or opens the share sheet. */
const sendToPhone = async (media: MediaSource, uri: string, mode: 'save' | 'share', suggestedName?: string): Promise<NativeResult> => {
    const url = await media(uri);
    if (!url) return { ok: false, message: 'This file is not in the export' };
    try {
        const blob = await (await fetch(url)).blob();
        const name = suggestedName || fileNameFor(uri);
        const { id } = await FileOut.begin({ name });
        for (let at = 0; at < blob.size; at += CHUNK_BYTES) {
            await FileOut.chunk({ id, data: await toBase64(blob.slice(at, at + CHUNK_BYTES)) });
        }
        const done = await FileOut.finish({ id, mime: mimeFor(blob, name), mode });
        if (!done.ok) return { ok: false, message: 'Saving is not supported on this Android version. Use Share instead.' };
        return { ok: true, message: mode === 'save' ? `Saved to ${done.where ?? 'your phone'}` : '' };
    } catch {
        return { ok: false, message: mode === 'save' ? 'Could not save this file' : 'Could not share this file' };
    } finally {
        media.release(uri);
    }
};

export const saveToPhone = (media: MediaSource, uri: string, suggestedName?: string) => sendToPhone(media, uri, 'save', suggestedName);
export const shareFromPhone = (media: MediaSource, uri: string, suggestedName?: string) => sendToPhone(media, uri, 'share', suggestedName);

/** Saves the original file (not a preview) through the browser's download, which Electron turns into a Save dialog. */
export const saveMedia = async (media: MediaSource, uri: string, suggestedName?: string): Promise<boolean> => {
    if (isAndroidShell()) return (await saveToPhone(media, uri, suggestedName)).ok;
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
