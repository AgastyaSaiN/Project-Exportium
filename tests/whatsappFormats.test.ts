import { describe, it, expect } from 'vitest';
import { parseInWorker } from '../utils/parseInWorker';
import { detectDateOrder } from '../pages/apps/whatsapp/parser';

const parse = async (lines: string[], dateOrder?: 'dmy' | 'mdy' | 'ymd') =>
    (await parseInWorker('whatsapp', { text: lines.join('\n'), fileName: 'WhatsApp Chat with Sam.txt', dateOrder })) as any;
const dayMonth = (ms: number) => { const d = new Date(ms); return [d.getDate(), d.getMonth() + 1]; };

describe('WhatsApp date order', () => {
    it('reads a US-style chat month-first because one line proves it', async () => {
        const chat = await parse(['3/4/23, 10:00 AM - Sam: hi', '3/14/23, 10:05 AM - Sam: later']);
        expect(chat.dateOrder).toBe('mdy');
        expect(chat.dateOrderAmbiguous).toBe(false);
        expect(dayMonth(chat.messages[0].timestamp_ms)).toEqual([4, 3]);   // 4 March, not 3 April
        expect(dayMonth(chat.messages[1].timestamp_ms)).toEqual([14, 3]);
    });

    it('reads a day-first chat day-first', async () => {
        const chat = await parse(['03/04/2023, 10:00 - Sam: hi', '14/04/2023, 10:05 - Sam: later']);
        expect(chat.dateOrder).toBe('dmy');
        expect(dayMonth(chat.messages[0].timestamp_ms)).toEqual([3, 4]);
    });

    it('applies one order to the whole file, so ordering is never scrambled', async () => {
        const chat = await parse(['1/2/23, 9:00 AM - A: one', '5/2/23, 9:00 AM - A: two', '13/2/23, 9:00 AM - A: three', '2/3/23, 9:00 AM - A: four']);
        const times = chat.messages.map((m: any) => m.timestamp_ms);
        expect([...times].sort((a: number, b: number) => a - b)).toEqual(times);
    });

    it('says so when the dates cannot settle it, and lets the caller choose', async () => {
        const lines = ['01/02/2023, 10:00 - Sam: hi', '03/04/2023, 10:00 - Sam: hello'];
        const guess = await parse(lines);
        expect(guess.dateOrderAmbiguous).toBe(true);
        expect(dayMonth(guess.messages[0].timestamp_ms)).toEqual([1, 2]);
        const flipped = await parse(lines, 'mdy');
        expect(dayMonth(flipped.messages[0].timestamp_ms)).toEqual([2, 1]);
        expect(flipped.dateOrderAmbiguous).toBe(false);
    });

    it('understands year-first and dotted dates', async () => {
        expect(detectDateOrder(['2023-03-14 22:16 - Sam: hi']).order).toBe('ymd');
        const chat = await parse(['14.03.2023, 22:16 - Sam: hi']);
        expect(dayMonth(chat.messages[0].timestamp_ms)).toEqual([14, 3]);
    });
});

describe('WhatsApp line formats', () => {
    it('copes with iOS invisible marks and narrow no-break spaces before AM/PM', async () => {
        const chat = await parse(['\u200e[14/03/2023, 10:16:05\u202fPM] Sam: \u200eIMG-1.jpg (file attached)']);
        expect(chat.messages).toHaveLength(1);
        expect(new Date(chat.messages[0].timestamp_ms).getHours()).toBe(22);
        expect(chat.messages[0].photo.uri).toBe('IMG-1.jpg');
    });

    it('treats attachments in other languages as attachments', async () => {
        const chat = await parse([
            '14/03/2023, 10:00 - Sam: IMG-2.jpg (Datei angehängt)',
            '14/03/2023, 10:01 - Sam: <Anhang: 00000003-VIDEO.mp4>',
            '14/03/2023, 10:02 - Sam: PTT-4.opus (archivo adjunto)',
        ]);
        expect(chat.messages[0].photo.uri).toBe('IMG-2.jpg');
        expect(chat.messages[1].video.uri).toBe('00000003-VIDEO.mp4');
        expect(chat.messages[2].audio.uri).toBe('PTT-4.opus');
    });

    it('keeps documents and captions together', async () => {
        const chat = await parse(['14/03/2023, 10:00 - Sam: Report 2023.pdf (file attached) the numbers']);
        expect(chat.messages[0].document).toEqual({ uri: 'Report 2023.pdf', name: 'Report 2023.pdf' });
        expect(chat.messages[0].content).toBe('the numbers');
    });

    it('keeps "media omitted" messages as visible placeholders instead of dropping them', async () => {
        const chat = await parse(['14/03/2023, 10:00 - Sam: <Media omitted>', '14/03/2023, 10:01 - Sam: image omitted', '14/03/2023, 10:02 - Sam: ok']);
        expect(chat.messages).toHaveLength(3);
        expect(chat.messages[0].omitted).toBe('media');
        expect(chat.messages[1].omitted).toBe('photo');
        expect(chat.messages[0].content).toBe('');
    });

    it('does not mistake a later header-looking line inside a message for a continuation', async () => {
        const chat = await parse(['14/03/2023, 10:00 - Sam: first', 'a second line', '14/03/2023, 10:01 - Sam: next']);
        expect(chat.messages[0].content).toBe('first\na second line');
        expect(chat.messages).toHaveLength(2);
    });
});
