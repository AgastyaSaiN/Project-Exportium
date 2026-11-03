import { useEffect, useMemo } from 'react';

/** Returns the bytes of one attachment, or undefined when the export does not contain it. */
export type BlobSource = (uri: string) => Promise<Blob | undefined>;

export interface LoadOptions {
    /** For images: decode and keep a downscaled copy of at most this many px wide instead of the original. */
    thumbnail?: number;
}

/**
 * What the viewers use to show attachments. `acquire` hands out a blob URL and counts the
 * caller as a user of it; `release` must be called when the caller stops showing it.
 */
export interface MediaSource {
    (uri: string, options?: LoadOptions): Promise<string | undefined>;
    release: (uri: string, options?: LoadOptions) => void;
}

export interface MediaLoader {
    source: MediaSource;
    /** Revokes every blob URL created so far and clears the cache. */
    dispose: () => void;
}

export interface MediaLoaderOptions {
    /** Extractions running at once (default 4). */
    concurrency?: number;
    /** URLs kept alive after nothing is showing them, most recently used first (default 120). */
    maxIdleEntries?: number;
}

interface Entry {
    pending: Promise<string | undefined>;
    url?: string;
    refs: number;
    lastUsed: number;
}

/** Width, in px, that photos in chat bubbles and galleries are decoded at. Enlarging opens the original. */
export const INLINE_THUMBNAIL_WIDTH = 800;

const THUMBNAIL_QUALITY = 0.82;

/** Downscales an image in the browser's own decoder; resolves undefined when it can't (not an image, no API). */
export const makeThumbnail = async (blob: Blob, maxWidth: number): Promise<Blob | undefined> => {
    if (typeof createImageBitmap !== 'function' || !blob.type.startsWith('image/') || blob.type === 'image/gif') return undefined;
    let bitmap: ImageBitmap | undefined;
    try {
        bitmap = await createImageBitmap(blob);
        if (bitmap.width <= maxWidth) return undefined; // already small enough: use the original as-is
        const width = maxWidth;
        const height = Math.max(1, Math.round(bitmap.height * (maxWidth / bitmap.width)));
        if (typeof OffscreenCanvas === 'undefined') return undefined;
        const canvas = new OffscreenCanvas(width, height);
        const context = canvas.getContext('2d');
        if (!context) return undefined;
        context.drawImage(bitmap, 0, 0, width, height);
        return await canvas.convertToBlob({ type: 'image/jpeg', quality: THUMBNAIL_QUALITY });
    } catch {
        return undefined;
    } finally {
        bitmap?.close();
    }
};

/**
 * Turns attachments into blob URLs with the memory behaviour a long chat needs:
 *  - results are cached and shared between simultaneous requests
 *  - at most `concurrency` files are extracted/decoded at once
 *  - image thumbnails are decoded once at display size, so a 12 MP photo costs ~1 MB, not ~48 MB
 *  - URLs nobody is showing any more are revoked least-recently-used first, so scrolling through
 *    thousands of photos does not grow memory without bound
 */
export const createMediaLoader = (getBlob: BlobSource, options: MediaLoaderOptions = {}): MediaLoader => {
    const { concurrency = 4, maxIdleEntries = 120 } = options;
    const entries = new Map<string, Entry>();
    // Each queued job can also be cancelled, so a disposed loader never leaves a caller waiting forever.
    const queue: Array<{ run: () => void; cancel: () => void }> = [];
    let active = 0;
    let clock = 0;

    const pump = () => {
        while (active < concurrency && queue.length > 0) {
            active++;
            queue.shift()!.run();
        }
    };

    const schedule = <T,>(job: () => Promise<T>): Promise<T> =>
        new Promise<T>((resolve, reject) => {
            queue.push({
                run: () => { job().then(resolve, reject).finally(() => { active--; pump(); }); },
                cancel: () => resolve(undefined as T),
            });
            pump();
        });

    const keyOf = (uri: string, opts?: LoadOptions) => (opts?.thumbnail ? `${uri}\u0000thumb:${opts.thumbnail}` : uri);

    const evictIdle = () => {
        const idle = [...entries.entries()].filter(([, e]) => e.refs === 0 && e.url);
        if (idle.length <= maxIdleEntries) return;
        idle.sort((a, b) => a[1].lastUsed - b[1].lastUsed);
        for (const [key, entry] of idle.slice(0, idle.length - maxIdleEntries)) {
            URL.revokeObjectURL(entry.url!);
            entries.delete(key);
        }
    };

    const acquire = ((uri: string, opts?: LoadOptions): Promise<string | undefined> => {
        const key = keyOf(uri, opts);
        let entry = entries.get(key);
        if (!entry) {
            const created: Entry = { pending: Promise.resolve(undefined), refs: 0, lastUsed: ++clock };
            created.pending = schedule(async () => {
                const blob = await getBlob(uri);
                if (!blob) return undefined;
                const shown = (opts?.thumbnail && await makeThumbnail(blob, opts.thumbnail)) || blob;
                return URL.createObjectURL(shown);
            }).then(
                (url) => {
                    created.url = url;
                    if (!url) entries.delete(key); // misses are not cached, so a retry can succeed
                    else evictIdle();
                    return url;
                },
                (error) => {
                    console.warn(`Failed to load media: ${uri}`, error);
                    entries.delete(key);
                    return undefined;
                }
            );
            entries.set(key, created);
            entry = created;
        }
        entry.refs++;
        entry.lastUsed = ++clock;
        return entry.pending;
    }) as MediaSource;

    acquire.release = (uri, opts) => {
        const entry = entries.get(keyOf(uri, opts));
        if (!entry) return;
        entry.refs = Math.max(0, entry.refs - 1);
        entry.lastUsed = ++clock;
        if (entry.refs === 0) evictIdle();
    };

    const dispose = () => {
        queue.splice(0).forEach(job => job.cancel());
        entries.forEach(entry => entry.pending.then(url => { if (url) URL.revokeObjectURL(url); }));
        entries.clear();
    };

    return { source: acquire, dispose };
};

/**
 * Returns a loader bound to `getBlob`. It is rebuilt (and the old one's blob URLs
 * revoked) only when `getBlob` changes or the component unmounts.
 */
export const useMediaLoader = (getBlob: BlobSource, options?: MediaLoaderOptions): MediaLoader => {
    // eslint-disable-next-line react-hooks/exhaustive-deps
    const loader = useMemo(() => createMediaLoader(getBlob, options), [getBlob]);
    useEffect(() => () => loader.dispose(), [loader]);
    return loader;
};

/** A MediaSource that never finds anything; handy for tests and empty states. */
export const noMedia: MediaSource = Object.assign(async () => undefined, { release: () => {} });
