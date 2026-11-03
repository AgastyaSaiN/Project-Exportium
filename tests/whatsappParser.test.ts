import { describe, it, expect } from 'vitest';
import { parseInWorker } from '../utils/parseInWorker';

const run = async (text: string, name = 'WhatsApp Chat with Sam.txt') => {
    let progress = 0;
    const chat = await parseInWorker('whatsapp', { text, fileName: name }, () => { progress++; });
    return { chat: chat as any, progress };
};

describe('parseWhatsAppChat', () => {
    it('parses Android-style lines, multi-line messages and system lines', async () => {
        const { chat } = await run([
            '12/03/2023, 10:15 - Messages are end-to-end encrypted.',
            '12/03/2023, 10:16 - Sam: hello there',
            'second line of the same message',
            '12/03/2023, 10:17 - Alex: hi!',
        ].join('\n'));
        expect(chat.title).toBe('Sam');
        expect(chat.participants.map((p: any) => p.name).sort()).toEqual(['Alex', 'Sam']);
        const sam = chat.messages.find((m: any) => m.sender_name === 'Sam');
        expect(sam.content).toBe('hello there\nsecond line of the same message');
        expect(chat.messages.filter((m: any) => m.type === 'system')).toHaveLength(1);
    });

    it('parses iOS-style bracketed timestamps and attachments', async () => {
        const { chat } = await run([
            '[12/03/2023, 10:16:05] Sam: <attached: 00000012-PHOTO-2023.jpg>',
            '[12/03/2023, 10:17:05] Sam: IMG-0001.jpg (file attached)',
        ].join('\n'));
        expect(chat.messages[0].photo.uri).toBe('00000012-PHOTO-2023.jpg');
        expect(chat.messages[0].content).toBe('');   // a bare attachment has no caption
        expect(chat.messages[1].photo.uri).toBe('IMG-0001.jpg');
    });

    it('handles 12-hour clocks', async () => {
        const { chat } = await run('3/14/23, 12:05 AM - Sam: night\n3/14/23, 1:30 PM - Sam: day');
        expect(new Date(chat.messages[0].timestamp_ms).getHours()).toBe(0);
        expect(new Date(chat.messages[1].timestamp_ms).getHours()).toBe(13);
    });

    it('rejects files with no messages', async () => {
        await expect(run('this is not a chat export')).rejects.toThrow(/valid messages/i);
    });

    it('parses a large chat and reports progress', async () => {
        const lines = Array.from({ length: 20000 }, (_, i) =>
            `01/02/2023, 10:${String(i % 60).padStart(2, '0')} - ${i % 2 ? 'A' : 'B'}: message ${i}`);
        const { chat, progress } = await run(lines.join('\n'));
        expect(chat.messages).toHaveLength(20000);
        expect(progress).toBeGreaterThanOrEqual(3);
    });
});
