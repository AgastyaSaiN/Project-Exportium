import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { noMedia } from '../utils/mediaLoader';
import TelegramChatViewer from '../pages/apps/telegram/TelegramChatViewer';
import SnapchatChatViewer from '../pages/apps/snapchat/SnapchatChatViewer';
import WhatsAppChatViewer from '../pages/apps/whatsapp/WhatsAppChatViewer';
import InstagramChatViewer from '../pages/apps/instagram/InstagramChatViewer';

const countMessages = (container: HTMLElement) => container.querySelectorAll('[id^="message-"]').length;

describe('TelegramChatViewer', () => {
    const makeChat = (n: number) => ({
        id: 1, name: 'Big chat', type: 'personal_chat', lastActivity: n,
        messages: Array.from({ length: n }, (_, i) => ({
            id: i + 1, type: 'message',
            date: new Date(2023, 0, 1, 0, i).toISOString(), date_unixtime: String(1672531200 + i * 60),
            from: i % 2 ? 'Sam' : 'Me', from_id: i % 2 ? 'user7' : 'user42',
            text: `telegram message ${i}`,
        })),
    });
    const renderViewer = (n: number) => render(
        <TelegramChatViewer chats={[makeChat(n)] as any} ownerId="user42" createBlobUrl={noMedia} theme="light" onThemeToggle={() => {}} onReset={() => {}} />
    );

    it('virtualizes a huge chat: newest messages shown, DOM stays small', () => {
        const { container } = renderViewer(100_000);
        expect(countMessages(container)).toBeGreaterThan(0);
        expect(container.querySelectorAll('[data-index]').length).toBeLessThan(80);
        expect(container.querySelector('#message-100000')).not.toBeNull();
        expect(container.querySelector('#message-50')).toBeNull();
    });

    it('shows small chats completely', () => {
        const { container } = renderViewer(5);
        expect(countMessages(container)).toBe(5);
    });

    it('searches across the whole chat after the debounce and still renders only a window', async () => {
        const { container } = renderViewer(5_000);
        const input = screen.getAllByPlaceholderText(/search/i).pop() as HTMLInputElement;
        fireEvent.change(input, { target: { value: 'message 5' } });
        // "message 5", "message 50".."59", "message 500".."599", "message 5000".."5999" capped at 4999 -> 1111 - 0
        await waitFor(() => expect(screen.getByText(/Found \d+ messages?\./)).toBeTruthy(), { timeout: 2000 });
        const expected = Array.from({ length: 5_000 }, (_, i) => `telegram message ${i}`).filter(t => t.toLowerCase().includes('message 5')).length;
        expect(screen.getByText(`Found ${expected} messages.`)).toBeTruthy();
        expect(container.querySelectorAll('[data-index]').length).toBeLessThan(80);
    });
});

describe('SnapchatChatViewer', () => {
    const makeChat = (n: number) => ({
        id: 'sam', participant: 'sam', messageCount: n, mediaCount: 0, lastActivity: n,
        messages: Array.from({ length: n }, (_, i) => ({
            id: `m${i}`, sender: i % 2 ? 'sam' : 'me', timestamp: 1672531200000 + i * 60000,
            type: 'TEXT' as const, content: `snap message ${i}`, isSaved: false,
        })),
    });

    it('virtualizes a huge chat: every message is reachable but only a few are in the DOM', () => {
        const { container } = render(<SnapchatChatViewer chats={[makeChat(100_000)] as any} owner="me" zip={null} onBack={() => {}} />);
        fireEvent.click(screen.getAllByText('sam')[0]);
        const rendered = Array.from(container.querySelectorAll('[data-index]')).map(el => el.textContent ?? '');
        expect(rendered.length).toBeGreaterThan(0);
        expect(rendered.length).toBeLessThan(80);
        expect(rendered.some(t => t.includes('snap message 99999'))).toBe(true);
        expect(rendered.some(t => t.includes('snap message 100 '))).toBe(false);
    });
});

describe('InstagramChatViewer', () => {
    const chat = { id: 'c1', path: 'c1', title: 'Group chat', participants: [{ name: 'me_user' }, { name: 'sam' }], messages: [], lastActivity: 1 };
    const makeMessages = (n: number, prefix: string) => Array.from({ length: n }, (_, i) => ({
        id: `${i}-${i}`, sender_name: i % 2 ? 'sam' : 'me_user', timestamp_ms: 1672531200000 + i * 600000, content: `${prefix} ${i}`,
    }));
    const renderViewer = (messages: any[], onLoadMessages = async () => messages) => render(
        <InstagramChatViewer chats={[chat]} ownerName="me_user" onLoadMessages={onLoadMessages} createBlobUrl={noMedia} theme="light" onThemeToggle={() => {}} />
    );
    const renderedText = (container: HTMLElement) =>
        Array.from(container.querySelectorAll('[id^="message-"]')).map(el => el.textContent ?? '');

    it('loads one chat on demand and virtualizes a huge conversation', async () => {
        const onLoadMessages = vi.fn(async () => makeMessages(100_000, 'insta message'));
        const { container } = renderViewer([], onLoadMessages);
        // Messages are fetched per chat on demand, never for the whole archive up front.
        await waitFor(() => expect(onLoadMessages).toHaveBeenCalledWith('c1'));
        expect(onLoadMessages).toHaveBeenCalledTimes(1);
        await waitFor(() => expect(renderedText(container).length).toBeGreaterThan(0));
        expect(container.querySelectorAll('[data-index]').length).toBeLessThan(80);
        expect(renderedText(container).some(t => t.includes('insta message 99999'))).toBe(true);
        expect(renderedText(container).some(t => t.includes('insta message 100 '))).toBe(false);
    });

    it('searches every message with no result cap, rendering only a window', async () => {
        const { container } = renderViewer(makeMessages(20_000, 'needle'));
        await waitFor(() => expect(renderedText(container).length).toBeGreaterThan(0));
        const input = screen.getAllByPlaceholderText(/search/i).pop() as HTMLInputElement;
        fireEvent.change(input, { target: { value: 'needle' } });
        await waitFor(() => expect(screen.getByText('Found 20000 messages.')).toBeTruthy(), { timeout: 3000 });
        expect(container.querySelectorAll('[data-index]').length).toBeLessThan(80);
    });

    it('clicking a search result clears the search and lands on that old message', async () => {
        const messages = makeMessages(20_000, 'filler');
        messages[7] = { ...messages[7], content: 'one-of-a-kind marker' };
        const { container } = renderViewer(messages);
        await waitFor(() => expect(renderedText(container).length).toBeGreaterThan(0));
        expect(container.querySelector('#message-7-7')).toBeNull(); // far outside the newest window
        const input = screen.getAllByPlaceholderText(/search/i).pop() as HTMLInputElement;
        fireEvent.change(input, { target: { value: 'one-of-a-kind' } });
        await waitFor(() => expect(screen.getByText('Found 1 message.')).toBeTruthy(), { timeout: 3000 });
        await act(async () => { fireEvent.click(container.querySelector('#message-7-7')!); });
        await waitFor(() => expect(screen.queryByText('Found 1 message.')).toBeNull(), { timeout: 3000 });
        await waitFor(() => expect(container.querySelector('#message-7-7')).not.toBeNull(), { timeout: 3000 });
        expect(container.querySelectorAll('[data-index]').length).toBeLessThan(80);
    });

    it('no longer offers a message-loading mode: every message is always reachable', async () => {
        const { container } = renderViewer(makeMessages(30, 'short'));
        await waitFor(() => expect(renderedText(container).length).toBeGreaterThan(0));
        expect(screen.queryByText('Load All Messages')).toBeNull();
        expect(screen.queryByText('Incremental Loading')).toBeNull();
    });
});

describe('WhatsAppChatViewer', () => {
    const makeChat = (n: number) => ({
        id: 'chat', title: 'Alice', participants: [{ name: 'Alice' }, { name: 'Bob' }], lastActivity: n,
        messages: Array.from({ length: n }, (_, i) => ({
            id: `${i}`, type: 'message' as const, sender_name: i % 2 ? 'Alice' : 'Bob',
            timestamp_ms: 1672531200000 + i * 60000, content: `whatsapp message ${i}`,
        })),
    });

    const renderViewer = (n: number) => render(
        <WhatsAppChatViewer chat={makeChat(n) as any} ownerName="Bob" onReset={() => {}} platform={{} as any} theme="light" onThemeToggle={() => {}} createBlobUrl={noMedia} />
    );

    it('virtualizes a huge chat and starts at the newest message', () => {
        const { container } = renderViewer(150_000);
        expect(container.querySelectorAll('[data-index]').length).toBeLessThan(80);
        expect(container.querySelector('#message-149999')).not.toBeNull();
        expect(container.querySelector('#message-10')).toBeNull();
    });

    it('shows a small chat completely', () => {
        const { container } = renderViewer(6);
        expect(container.querySelectorAll('[id^="message-"]').length).toBe(6);
    });

    it('search lists matches from the whole chat, and jumping to one renders it', async () => {
        const { container } = renderViewer(20_000);
        const input = screen.getAllByPlaceholderText(/search/i).pop() as HTMLInputElement;
        fireEvent.change(input, { target: { value: 'message 123' } });
        await waitFor(() => expect(screen.getByText('Search Results')).toBeTruthy(), { timeout: 2000 });
        // the oldest match ("whatsapp message 123") is nowhere near the newest window
        expect(container.querySelector('#message-123')).toBeNull();
        // results are highlighted (split across elements), so match on the combined text and skip the chat rows
        const firstHit = screen.getAllByText((_, el) => !!el && el.textContent === 'whatsapp message 123' && !el.closest('[data-index]'))[0];
        await act(async () => { fireEvent.click(firstHit); });
        await waitFor(() => expect(container.querySelector('#message-123')).not.toBeNull(), { timeout: 2000 });
    });
});

describe('Media tab', () => {
    const chat = { id: 'c1', path: 'c1', title: 'Photo chat', participants: [{ name: 'me_user' }, { name: 'sam' }], messages: [], lastActivity: 1 };
    const withMedia = Array.from({ length: 40 }, (_, i) => ({
        id: `${i}-${i}`, sender_name: i % 2 ? 'sam' : 'me_user', timestamp_ms: 1672531200000 + i * 600000, content: `m ${i}`,
        photos: i % 4 === 0 ? [{ uri: `p${i}.jpg`, creation_timestamp: 1 }] : undefined,
        videos: i % 4 === 1 ? [{ uri: `v${i}.mp4`, creation_timestamp: 1 }] : undefined,
    }));
    const media = Object.assign(async (uri: string) => `blob:${uri}`, { release: () => {} }) as unknown as typeof noMedia;
    const renderViewer = () => render(
        <InstagramChatViewer chats={[chat]} ownerName="me_user" onLoadMessages={async () => withMedia} createBlobUrl={media} theme="light" onThemeToggle={() => {}} />
    );
    const openMediaTab = async () => { fireEvent.click(await screen.findByRole('button', { name: 'Media' })); };

    it('keeps your type filter when you switch to Messages and back', async () => {
        renderViewer();
        await openMediaTab();
        fireEvent.click(await screen.findByRole('button', { name: 'Videos' }));
        expect(screen.getByRole('button', { name: 'Videos' }).className).toContain('bg-pink-500');
        fireEvent.click(screen.getByRole('button', { name: 'Messages' }));
        await waitFor(() => expect(screen.queryByRole('button', { name: 'Videos' })).toBeNull());
        await openMediaTab();
        expect(screen.getByRole('button', { name: 'Videos' }).className).toContain('bg-pink-500');
        expect(screen.getByRole('button', { name: 'All' }).className).not.toContain('bg-pink-500');
    });

    it('opens a gallery photo full-size and pages only through what the filter shows', async () => {
        const { container } = renderViewer();
        await openMediaTab();
        fireEvent.click(await screen.findByRole('button', { name: 'Photos' }));
        const photo = await waitFor(() => {
            // a tile in the gallery grid (the Messages list stays mounted behind it)
            const el = container.querySelector('.group.aspect-square img[alt="Attachment"]');
            if (!el) throw new Error('photos not loaded');
            return el as HTMLElement;
        });
        await act(async () => { fireEvent.click(photo); });
        const dialog = await screen.findByRole('dialog');
        expect(dialog).toBeTruthy();
        // 10 photos in the chat (every 4th of 40 messages); videos are filtered out of the paging
        expect(dialog.textContent).toMatch(/1 of 10/);
    });
});
