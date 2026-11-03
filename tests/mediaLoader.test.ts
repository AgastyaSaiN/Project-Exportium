import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMediaLoader, makeThumbnail } from '../utils/mediaLoader';

const tick = () => new Promise((r) => setTimeout(r, 0));
const blobOf = (text: string, type = 'text/plain') => new Blob([text], { type });

let created: string[];
let revoked: string[];
beforeEach(() => {
    created = [];
    revoked = [];
    let n = 0;
    URL.createObjectURL = vi.fn(() => { const url = `blob:test/${n++}`; created.push(url); return url; }) as typeof URL.createObjectURL;
    URL.revokeObjectURL = vi.fn((url: string) => { revoked.push(url); }) as typeof URL.revokeObjectURL;
});

describe('createMediaLoader', () => {
    it('caches results and shares in-flight requests', async () => {
        const getBlob = vi.fn(async (uri: string) => blobOf(uri));
        const { source } = createMediaLoader(getBlob);
        const [a, b] = await Promise.all([source('x.jpg'), source('x.jpg')]);
        await source('x.jpg');
        expect(a).toBe(b);
        expect(getBlob).toHaveBeenCalledTimes(1);
        expect(created).toHaveLength(1);
    });

    it('never runs more than `concurrency` extractions at once', async () => {
        let active = 0;
        let peak = 0;
        const getBlob = async (uri: string) => {
            active++;
            peak = Math.max(peak, active);
            await tick();
            active--;
            return blobOf(uri);
        };
        const { source } = createMediaLoader(getBlob, { concurrency: 3 });
        const results = await Promise.all(Array.from({ length: 12 }, (_, i) => source(`f${i}`)));
        expect(results.every(Boolean)).toBe(true);
        expect(peak).toBe(3);
    });

    it('does not cache misses or failures, so a retry can succeed', async () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const getBlob = vi.fn()
            .mockRejectedValueOnce(new Error('boom'))
            .mockResolvedValueOnce(undefined)
            .mockResolvedValueOnce(blobOf('ok'));
        const { source } = createMediaLoader(getBlob);
        expect(await source('a')).toBeUndefined();
        expect(await source('a')).toBeUndefined();
        expect(await source('a')).toBe('blob:test/0');
        warn.mockRestore();
    });

    it('frees URLs nobody is showing, oldest first, but never ones still in use', async () => {
        const { source } = createMediaLoader(async (uri) => blobOf(uri), { maxIdleEntries: 2 });
        const inUse = await source('in-use');           // stays acquired the whole time
        for (const name of ['a', 'b', 'c', 'd']) {
            await source(name);
            source.release(name);
        }
        await tick();
        expect(revoked).not.toContain(inUse);
        // Only the 2 most recently used idle entries survive (c, d); a and b were revoked.
        expect(revoked).toHaveLength(2);
        expect(await source('d')).toBe('blob:test/4');  // still cached, no new URL
        expect(created).toHaveLength(5);
    });

    it('reloads an evicted entry on demand', async () => {
        const getBlob = vi.fn(async (uri: string) => blobOf(uri));
        const { source } = createMediaLoader(getBlob, { maxIdleEntries: 0 });
        await source('a');
        source.release('a');
        expect(revoked).toHaveLength(1);
        await source('a');
        expect(getBlob).toHaveBeenCalledTimes(2);
    });

    it('treats thumbnails and originals as separate entries and falls back to the original when it cannot downscale', async () => {
        const getBlob = vi.fn(async (uri: string) => blobOf(uri, 'image/png'));
        const { source } = createMediaLoader(getBlob);
        const thumb = await source('photo.png', { thumbnail: 800 });
        const full = await source('photo.png');
        expect(thumb).toBeTruthy();   // jsdom has no createImageBitmap, so the original is used
        expect(full).toBeTruthy();
        expect(thumb).not.toBe(full);
    });

    it('settles requests still waiting in the queue when disposed instead of leaving them hanging', async () => {
        const gate: Array<() => void> = [];
        const loader = createMediaLoader(() => new Promise<Blob>((resolve) => gate.push(() => resolve(blobOf('x')))), { concurrency: 1 });
        const running = loader.source('first');
        const waiting = loader.source('second');   // queued behind the first
        loader.dispose();
        expect(await waiting).toBeUndefined();     // resolved, not stuck
        gate.forEach(open => open());
        await running;
    });

    it('revokes every created URL on dispose', async () => {
        const loader = createMediaLoader(async (u) => blobOf(u));
        await Promise.all([loader.source('a'), loader.source('b')]);
        loader.dispose();
        await tick();
        expect(revoked.sort()).toEqual(created.sort());
    });
});

describe('makeThumbnail', () => {
    it('declines non-images, GIFs and environments without decoding support', async () => {
        expect(await makeThumbnail(blobOf('x', 'video/mp4'), 800)).toBeUndefined();
        expect(await makeThumbnail(blobOf('x', 'image/gif'), 800)).toBeUndefined();
        expect(await makeThumbnail(blobOf('x', 'image/png'), 800)).toBeUndefined();
    });

    it('downscales wide images and keeps small ones as they are', async () => {
        const close = vi.fn();
        const drawImage = vi.fn();
        const convertToBlob = vi.fn(async () => new Blob(['jpeg'], { type: 'image/jpeg' }));
        vi.stubGlobal('createImageBitmap', vi.fn(async () => ({ width: 4000, height: 3000, close })));
        vi.stubGlobal('OffscreenCanvas', class { constructor(public width: number, public height: number) {} getContext() { return { drawImage }; } convertToBlob = convertToBlob; });

        const out = await makeThumbnail(blobOf('big', 'image/jpeg'), 800);
        expect(out?.type).toBe('image/jpeg');
        expect(drawImage).toHaveBeenCalledWith(expect.anything(), 0, 0, 800, 600);
        expect(close).toHaveBeenCalled();

        vi.stubGlobal('createImageBitmap', vi.fn(async () => ({ width: 500, height: 300, close })));
        expect(await makeThumbnail(blobOf('small', 'image/jpeg'), 800)).toBeUndefined();
        vi.unstubAllGlobals();
    });
});
