import { BlobReader, BlobWriter, TextWriter, ZipReader, configure } from '@zip.js/zip.js';
import type { Entry, FileEntry } from '@zip.js/zip.js';

// Decompression uses the browser's native streams on the main thread's behalf; no extra
// worker scripts (which would need to be loadable from file:// in the packaged app).
configure({ useWebWorkers: false });

/**
 * A ZIP archive that is read lazily: only the central directory is loaded up front and each
 * entry is decompressed on demand straight from the `File`, so archive size is not limited
 * by memory.
 */
export interface ZipEntry {
    name: string;
    dir: boolean;
    date: Date;
    async(type: 'string'): Promise<string>;
    async(type: 'blob'): Promise<Blob>;
}

export interface ZipArchive {
    files: Record<string, ZipEntry>;
    /** Exact path lookup. */
    file(path: string): ZipEntry | null;
    /** All file entries whose path matches. */
    file(pattern: RegExp): ZipEntry[];
    close(): Promise<void>;
}

const MIME_BY_EXTENSION: Record<string, string> = {
    jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif', webp: 'image/webp',
    mp4: 'video/mp4', mov: 'video/quicktime', webm: 'video/webm', mkv: 'video/x-matroska', avi: 'video/x-msvideo',
    mp3: 'audio/mpeg', m4a: 'audio/mp4', ogg: 'audio/ogg', opus: 'audio/ogg', wav: 'audio/wav', aac: 'audio/aac', amr: 'audio/amr',
};

const mimeFor = (name: string): string => MIME_BY_EXTENSION[name.split('.').pop()?.toLowerCase() ?? ''] ?? '';

const wrapEntry = (entry: Entry): ZipEntry => {
    const getData = async (writer: TextWriter | BlobWriter) => {
        if (entry.directory) throw new Error(`"${entry.filename}" is a folder`);
        return (entry as FileEntry).getData(writer);
    };
    return {
        name: entry.filename,
        dir: entry.directory,
        date: entry.lastModDate,
        async(type: 'string' | 'blob'): Promise<string & Blob> {
            return (type === 'string' ? getData(new TextWriter()) : getData(new BlobWriter(mimeFor(entry.filename)))) as Promise<string & Blob>;
        },
    };
};

export const openZip = async (source: File | Blob): Promise<ZipArchive> => {
    const reader = new ZipReader(new BlobReader(source));
    let entries: Entry[];
    try {
        entries = await reader.getEntries();
    } catch (error) {
        await reader.close().catch(() => {});
        throw error;
    }

    const files: Record<string, ZipEntry> = {};
    for (const entry of entries) files[entry.filename] = wrapEntry(entry);
    const fileList = Object.values(files).filter(entry => !entry.dir);

    function file(path: string): ZipEntry | null;
    function file(pattern: RegExp): ZipEntry[];
    function file(query: string | RegExp): ZipEntry | null | ZipEntry[] {
        if (typeof query === 'string') {
            const entry = files[query];
            return entry && !entry.dir ? entry : null;
        }
        return fileList.filter(entry => query.test(entry.name));
    }

    return { files, file, close: () => reader.close() };
};
