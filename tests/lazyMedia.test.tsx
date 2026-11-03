import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, waitFor, act } from '@testing-library/react';
import LazyMedia from '../components/LazyMedia';
import type { MediaSource } from '../utils/mediaLoader';

// An IntersectionObserver the test can fire by hand.
const observers: Array<() => void> = [];
const fireIntersect = () => observers.splice(0).forEach(fire => fire());
class ControllableObserver {
    constructor(private cb: IntersectionObserverCallback) {}
    observe() { observers.push(() => this.cb([{ isIntersecting: true } as IntersectionObserverEntry], this as unknown as IntersectionObserver)); }
    unobserve() {}
    disconnect() {}
}

const makeSource = () => {
    const source = Object.assign(vi.fn(async (uri: string) => `blob:${uri}`), { release: vi.fn() }) as unknown as MediaSource & {
        mock: unknown; release: ReturnType<typeof vi.fn>;
    };
    return source;
};

afterEach(() => vi.unstubAllGlobals());

describe('LazyMedia', () => {
    it('does not touch the export until it scrolls into view', async () => {
        vi.stubGlobal('IntersectionObserver', ControllableObserver);
        const source = makeSource();
        render(<LazyMedia uri="a.jpg" media={source} kind="image" />);
        expect(source).not.toHaveBeenCalled();
        await act(async () => { fireIntersect(); });
        await waitFor(() => expect(source).toHaveBeenCalledWith('a.jpg', { thumbnail: 800 }));
    });

    it('asks for a downscaled copy of photos but the original of videos', async () => {
        vi.stubGlobal('IntersectionObserver', ControllableObserver);
        const photo = makeSource();
        const video = makeSource();
        render(<><LazyMedia uri="p.jpg" media={photo} kind="image" /><LazyMedia uri="v.mp4" media={video} kind="video" /></>);
        await act(async () => { fireIntersect(); });
        await waitFor(() => expect(photo).toHaveBeenCalledWith('p.jpg', { thumbnail: 800 }));
        await waitFor(() => expect(video).toHaveBeenCalledWith('v.mp4', undefined));
    });

    it('hands the file back when it unmounts, so memory can be reclaimed', async () => {
        vi.stubGlobal('IntersectionObserver', ControllableObserver);
        const source = makeSource();
        const { container, unmount } = render(<LazyMedia uri="a.jpg" media={source} kind="image" />);
        await act(async () => { fireIntersect(); });
        await waitFor(() => expect(container.querySelector('img')).not.toBeNull());
        expect(container.querySelector('img')!.getAttribute('src')).toBe('blob:a.jpg');
        unmount();
        expect(source.release).toHaveBeenCalledWith('a.jpg', { thumbnail: 800 });
    });

    it('shows a placeholder, not a broken image, when the file is missing', async () => {
        vi.stubGlobal('IntersectionObserver', ControllableObserver);
        const missing = Object.assign(vi.fn(async () => undefined), { release: vi.fn() }) as unknown as MediaSource;
        const { container } = render(<LazyMedia uri="gone.jpg" media={missing} kind="image" />);
        await act(async () => { fireIntersect(); });
        await waitFor(() => expect(missing).toHaveBeenCalled());
        expect(container.querySelector('img')).toBeNull();
    });
});
