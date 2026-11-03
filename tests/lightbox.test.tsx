import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { LightboxProvider } from '../components/Lightbox';
import type { LightboxItem } from '../components/Lightbox';
import LazyMedia from '../components/LazyMedia';
import type { MediaSource } from '../utils/mediaLoader';

const makeMedia = () => {
    const media = Object.assign(
        vi.fn(async (uri: string, options?: { thumbnail?: number }) => `blob:${uri}${options?.thumbnail ? '#thumb' : '#full'}`),
        { release: vi.fn() }
    );
    return media as unknown as MediaSource & { release: ReturnType<typeof vi.fn> } & ReturnType<typeof vi.fn>;
};

const items: LightboxItem[] = [
    { uri: 'a.jpg', kind: 'image', sender: 'Alice', timestamp: 1700000000000, ref: 'm-a' },
    { uri: 'b.jpg', kind: 'image', sender: 'Bob', timestamp: 1700000060000, ref: 'm-b' },
    { uri: 'c.jpg', kind: 'image', sender: 'Alice', timestamp: 1700000120000, ref: 'm-c' },
];

const renderChat = (onShowInChat = vi.fn()) => {
    const media = makeMedia();
    const view = render(
        <LightboxProvider items={items} media={media} onShowInChat={onShowInChat}>
            {items.map(item => <LazyMedia key={item.uri} uri={item.uri} media={media} kind="image" alt={item.uri} />)}
        </LightboxProvider>
    );
    return { media, onShowInChat, ...view };
};

const openFirst = async (container: HTMLElement) => {
    const photo = await waitFor(() => {
        const el = container.querySelector('img[alt="a.jpg"]');
        if (!el) throw new Error('photo not loaded yet');
        return el as HTMLElement;
    });
    await act(async () => { fireEvent.click(photo); });
};

describe('Lightbox', () => {
    it('opens a photo full-size when it is clicked, with its sender and position', async () => {
        const { container, media } = renderChat();
        await openFirst(container);
        const dialog = await screen.findByRole('dialog');
        expect(dialog).toBeTruthy();
        expect(screen.getByText(/Alice/)).toBeTruthy();
        expect(screen.getByText('1 of 3')).toBeTruthy();
        // the original (no thumbnail option) is requested
        await waitFor(() => expect(media).toHaveBeenCalledWith('a.jpg'));
        await waitFor(() => expect(screen.getByAltText('Full-size photo').getAttribute('src')).toBe('blob:a.jpg#full'));
    });

    it('pages through the photos with the buttons and arrow keys, and stops at the ends', async () => {
        const { container } = renderChat();
        await openFirst(container);
        await screen.findByRole('dialog');
        expect(screen.queryByLabelText('Previous')).toBeNull();
        fireEvent.click(screen.getByLabelText('Next'));
        expect(await screen.findByText('2 of 3')).toBeTruthy();
        fireEvent.keyDown(window, { key: 'ArrowRight' });
        expect(await screen.findByText('3 of 3')).toBeTruthy();
        expect(screen.queryByLabelText('Next')).toBeNull();
        fireEvent.keyDown(window, { key: 'ArrowLeft' });
        expect(await screen.findByText('2 of 3')).toBeTruthy();
    });

    it('closes with Escape, the close button or a click on the backdrop, and frees the original', async () => {
        const { container, media } = renderChat();
        await openFirst(container);
        await screen.findByRole('dialog');
        fireEvent.keyDown(window, { key: 'Escape' });
        await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
        expect(media.release).toHaveBeenCalledWith('a.jpg');

        await openFirst(container);
        fireEvent.click(await screen.findByLabelText('Close photo viewer'));
        await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());

        await openFirst(container);
        fireEvent.click(await screen.findByRole('dialog'));
        await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    });

    it('"Show in chat" closes the viewer and reports the message it came from', async () => {
        const { container, onShowInChat } = renderChat();
        await openFirst(container);
        fireEvent.click(await screen.findByLabelText('Next'));
        await screen.findByText('2 of 3');
        fireEvent.click(screen.getByText('Show in chat'));
        expect(onShowInChat).toHaveBeenCalledWith(expect.objectContaining({ uri: 'b.jpg', ref: 'm-b' }));
        await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    });

    it('can be opened from the keyboard', async () => {
        const { container } = renderChat();
        const photo = await waitFor(() => {
            const el = container.querySelector('img[alt="b.jpg"]');
            if (!el) throw new Error('not yet');
            return el as HTMLElement;
        });
        await act(async () => { fireEvent.keyDown(photo, { key: 'Enter' }); });
        expect(await screen.findByText('2 of 3')).toBeTruthy();
    });

    it('does nothing outside a provider', async () => {
        const media = makeMedia();
        const { container } = render(<LazyMedia uri="a.jpg" media={media} kind="image" alt="a.jpg" />);
        const photo = await waitFor(() => {
            const el = container.querySelector('img[alt="a.jpg"]');
            if (!el) throw new Error('not yet');
            return el as HTMLElement;
        });
        fireEvent.click(photo);
        expect(screen.queryByRole('dialog')).toBeNull();
    });
});
