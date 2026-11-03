import { describe, it, expect } from 'vitest';
import JSZip from 'jszip';
import {
    fixEncoding, messageFilePattern, mapWithConcurrency, detectOwnerName,
    scanChats, loadChatMessagesFromZip, normalizeMessages, readChatFolder,
} from '../pages/apps/instagram/parser';
import { openZip } from '../utils/zipArchive';

// Instagram writes UTF-8 bytes as latin-1 escapes: "é" arrives as "Ã©".
const mojibake = (text: string) => Buffer.from(text, 'utf-8').toString('latin1');

const chatJson = (title: string, messages: any[]) => JSON.stringify({
    title: mojibake(title),
    participants: [{ name: 'me_user' }, { name: 'sam' }],
    messages,
});

const buildZip = async (files: Record<string, string>) => {
    const zip = new JSZip();
    for (const [name, body] of Object.entries(files)) zip.file(name, body);
    return openZip(new File([await zip.generateAsync({ type: 'blob' })], 'export.zip'));
};

describe('fixEncoding', () => {
    it('repairs mojibake and leaves clean text alone', () => {
        expect(fixEncoding(mojibake('Répondu à'))).toBe('Répondu à');
        expect(fixEncoding('plain ascii')).toBe('plain ascii');
        expect(fixEncoding('already fine: é')).toBe('already fine: é');
    });
});

describe('messageFilePattern', () => {
    it('matches folders whose names contain regex metacharacters', () => {
        const folder = 'your_instagram_activity/messages/inbox/john_(work)+team';
        const re = messageFilePattern(folder);
        expect(re.test(`${folder}/message_1.json`)).toBe(true);
        expect(re.test(`${folder}/message_12.json`)).toBe(true);
        expect(re.test('your_instagram_activity/messages/inbox/other/message_1.json')).toBe(false);
    });
});

describe('mapWithConcurrency', () => {
    it('keeps order and respects the limit', async () => {
        let active = 0;
        let peak = 0;
        const out = await mapWithConcurrency([1, 2, 3, 4, 5, 6, 7, 8], 3, async (n) => {
            active++;
            peak = Math.max(peak, active);
            await new Promise((r) => setTimeout(r, 2));
            active--;
            return n * 2;
        });
        expect(out).toEqual([2, 4, 6, 8, 10, 12, 14, 16]);
        expect(peak).toBeLessThanOrEqual(3);
    });
});

describe('detectOwnerName', () => {
    it('reads the username from the archive file name', async () => {
        const zip = await buildZip({});
        expect(await detectOwnerName(zip, 'instagram-my_name-2024-01-02-AbCd.zip')).toBe('my_name');
    });

    it('falls back to personal_information.json', async () => {
        const zip = await buildZip({
            'personal_information/personal_information.json': JSON.stringify({ profile_user: [{ string_map_data: {} }], profile: { username: 'from_json' } }),
        });
        expect(await detectOwnerName(zip, 'download.zip')).toBe('from_json');
    });

    it('returns null when nothing identifies the user', async () => {
        expect(await detectOwnerName(await buildZip({}), 'download.zip')).toBeNull();
    });
});

describe('scanChats / loadChatMessagesFromZip', () => {
    const folder = 'your_instagram_activity/messages/inbox/sam_(work)_123';
    const files = {
        [`${folder}/message_1.json`]: chatJson('Café crew', [
            { sender_name: 'sam', timestamp_ms: 3000, content: mojibake('très bien') },
            { sender_name: 'me_user', timestamp_ms: 2000, content: 'hi' },
        ]),
        [`${folder}/message_2.json`]: chatJson('Café crew', [
            { sender_name: 'sam', timestamp_ms: 1000, content: 'first' },
        ]),
        'your_instagram_activity/messages/inbox/empty_1/message_1.json': chatJson('Empty', []),
    };

    it('lists chats with decoded titles, newest first, skipping empty ones', async () => {
        const chats = await scanChats(await buildZip(files));
        expect(chats).toHaveLength(1);
        expect(chats[0].title).toBe('Café crew');
        expect(chats[0].lastActivity).toBe(3000);
        expect(chats[0].participants.map(p => p.name)).toEqual(['me_user', 'sam']);
    });

    it('merges message files and sorts oldest first, even with special characters in the path', async () => {
        const messages = await loadChatMessagesFromZip(await buildZip(files), folder);
        expect(messages.map(m => m.timestamp_ms)).toEqual([1000, 2000, 3000]);
        expect(messages[2].content).toBe('très bien');
    });

    it('returns nothing for an unknown chat and a friendly error for corrupt files', async () => {
        expect(await loadChatMessagesFromZip(await buildZip(files), 'nope')).toEqual([]);
        const broken = await buildZip({ 'a/b/message_1.json': '{ nope' });
        await expect(loadChatMessagesFromZip(broken, 'a/b')).rejects.toThrow(/corrupt/i);
    });
});

describe('normalizeMessages', () => {
    it('assigns ids and sorts by time', () => {
        const out = normalizeMessages([
            { sender_name: 'b', timestamp_ms: 20 },
            { sender_name: 'a', timestamp_ms: 10, content: 'x' },
        ]);
        expect(out.map(m => m.sender_name)).toEqual(['a', 'b']);
        expect(new Set(out.map(m => m.id)).size).toBe(2);
    });
});

describe('readChatFolder', () => {
    const makeFile = (relative: string, body: string) => {
        const f = new File([body], relative.split('/').pop()!);
        Object.defineProperty(f, 'webkitRelativePath', { value: relative });
        return f;
    };

    it('reads an unzipped chat folder', async () => {
        const { pending, participants } = await readChatFolder([
            makeFile('sam_123/message_1.json', chatJson('Sam', [{ sender_name: 'sam', timestamp_ms: 5, content: 'yo' }])),
            makeFile('sam_123/message_2.json', chatJson('Sam', [{ sender_name: 'me_user', timestamp_ms: 6, content: 'hey' }])),
            makeFile('sam_123/photos/a.jpg', 'x'),
        ]);
        expect(participants).toEqual(['me_user', 'sam']);
        expect(pending.messages).toHaveLength(2);
        expect(pending.lastActivity).toBe(6);
        expect(pending.fileMap.has('photos/a.jpg')).toBe(true);
    });

    it('rejects folders without message_1.json', async () => {
        await expect(readChatFolder([makeFile('x/readme.txt', 'hi')])).rejects.toThrow(/message_1\.json/);
    });
});

describe('normalizeMessages: every message kind', () => {
    it('keeps reactions, shared posts, voice notes, stickers, GIFs, calls and unsent messages, decoding their text', () => {
        const [m] = normalizeMessages([{
            sender_name: 'sam', timestamp_ms: 1,
            content: mojibake('café'),
            reactions: [{ reaction: mojibake('❤️'), actor: 'me_user' }],
            share: { link: 'https://example.com/p/1', share_text: mojibake('très beau'), original_content_owner: 'artist' },
            audio_files: [{ uri: 'audio/1.mp4', creation_timestamp: 1 }],
            gifs: [{ uri: 'gifs/1.gif' }],
            sticker: { uri: 'stickers/1.png' },
            call_duration: 125,
            is_unsent: true,
        } as never]);
        expect(m.content).toBe('café');
        expect(m.reactions).toEqual([{ reaction: '❤️', actor: 'me_user' }]);
        expect(m.share).toEqual({ link: 'https://example.com/p/1', share_text: 'très beau', original_content_owner: 'artist' });
        expect(m.audio_files).toHaveLength(1);
        expect(m.gifs).toHaveLength(1);
        expect(m.sticker?.uri).toBe('stickers/1.png');
        expect(m.call_duration).toBe(125);
        expect(m.is_unsent).toBe(true);
    });

    it('leaves the extra fields out of ordinary messages', () => {
        const [m] = normalizeMessages([{ sender_name: 'sam', timestamp_ms: 1, content: 'hi', reactions: [], audio_files: [] } as never]);
        expect(m.reactions).toBeUndefined();
        expect(m.audio_files).toBeUndefined();
        expect(m.share).toBeUndefined();
    });
});
