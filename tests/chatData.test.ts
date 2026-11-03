import { describe, it, expect } from 'vitest';
import { computeInsights, findLinks, onThisDay, toCsv, toHtml, toPlainText } from '../utils/chatData';
import type { ToolMessage } from '../utils/chatData';
import { filtersActive, NO_FILTERS, passesFilters } from '../components/ChatTools';

const at = (y: number, m: number, d: number, h = 12) => new Date(y, m - 1, d, h).getTime();
const msg = (id: string, sender: string, ts: number, text = 'hi'): ToolMessage => ({ id, sender, ts, text });

describe('findLinks', () => {
    it('finds links, trims trailing punctuation and removes duplicates', () => {
        expect(findLinks('see https://a.com/x, and (https://b.org/y). also https://a.com/x')).toEqual(['https://a.com/x', 'https://b.org/y']);
        expect(findLinks('no links here')).toEqual([]);
    });
});

describe('computeInsights', () => {
    const messages = [
        msg('1', 'Alice', at(2023, 1, 1, 9), 'good morning everyone'),
        msg('2', 'Bob', at(2023, 1, 2, 21), 'hello'),
        msg('3', 'Alice', at(2023, 1, 3, 9), 'again'),
        msg('4', 'Alice', at(2023, 1, 3, 10), 'and again'),
        msg('5', 'Bob', at(2023, 1, 10, 22), 'later'),
    ];
    const result = computeInsights(messages);

    it('counts messages, words and who wrote them', () => {
        expect(result.total).toBe(5);
        expect(result.wordCount).toBe(3 + 1 + 1 + 2 + 1);
        expect(result.perSender).toEqual([{ name: 'Alice', count: 3 }, { name: 'Bob', count: 2 }]);
    });
    it('finds the busiest day, active days and the longest run of consecutive days', () => {
        expect(result.busiestDay).toEqual({ date: '2023-01-03', count: 2 });
        expect(result.activeDays).toBe(4);
        expect(result.longestStreakDays).toBe(3);   // Jan 1, 2, 3
    });
    it('buckets by hour, weekday and month', () => {
        expect(result.perHour[9]).toBe(2);
        expect(result.perHour[22]).toBe(1);
        expect(result.perMonth).toEqual([{ month: '2023-01', count: 5 }]);
        expect(result.perWeekday.reduce((a, b) => a + b, 0)).toBe(5);
    });
    it('copes with an empty chat', () => {
        const empty = computeInsights([]);
        expect(empty.total).toBe(0);
        expect(empty.busiestDay).toBeNull();
    });
});

describe('onThisDay', () => {
    it('returns earlier years only, newest first', () => {
        const today = new Date(2025, 5, 14);
        const groups = onThisDay([
            msg('a', 'A', at(2023, 6, 14)), msg('b', 'A', at(2021, 6, 14)), msg('c', 'A', at(2023, 6, 15)), msg('d', 'A', at(2025, 6, 14)),
        ], today);
        expect(groups.map(g => g.year)).toEqual([2023, 2021]);
        expect(groups[0].messages.map(m => m.id)).toEqual(['a']);
    });
});

describe('export formats', () => {
    const messages: ToolMessage[] = [
        { id: '1', sender: 'Alice', ts: at(2023, 3, 4, 9), text: 'Hello, "world"' },
        { id: '2', sender: null, ts: at(2023, 3, 4, 10), text: 'Alice added Bob' },
        { id: '3', sender: 'Bob', ts: at(2023, 3, 5, 8), text: '<b>hi</b> & bye', files: [{ uri: 'x.pdf', name: 'x.pdf' }] },
    ];
    it('plain text lists every message with its time and sender', () => {
        const text = toPlainText('Chat with Alice', messages);
        expect(text).toContain('Chat with Alice');
        expect(text).toContain('Alice: Hello, "world"');
        expect(text).toContain('Bob: <b>hi</b> & bye [file: x.pdf]');
    });
    it('CSV quotes fields and escapes embedded quotes', () => {
        const csv = toCsv(messages);
        expect(csv.split('\r\n')[0]).toBe('timestamp,sender,message');
        expect(csv).toContain('"Hello, ""world"""');
        expect(csv.trim().split('\r\n')).toHaveLength(4);
    });
    it('HTML escapes message text and groups by day', () => {
        const html = toHtml('Chat', messages);
        expect(html).toContain('&lt;b&gt;hi&lt;/b&gt; &amp; bye');
        expect(html).not.toContain('<b>hi</b>');
        expect(html.match(/<h2>/g)).toHaveLength(2);
    });
});

describe('search filters', () => {
    it('limits by sender and by an inclusive date range', () => {
        const f = { sender: 'Alice', from: '2023-03-01', to: '2023-03-31' };
        expect(passesFilters(f, 'Alice', at(2023, 3, 31, 23))).toBe(true);
        expect(passesFilters(f, 'Alice', at(2023, 4, 1, 0))).toBe(false);
        expect(passesFilters(f, 'Alice', at(2023, 2, 28))).toBe(false);
        expect(passesFilters(f, 'Bob', at(2023, 3, 10))).toBe(false);
        expect(passesFilters(NO_FILTERS, 'Anyone', 1)).toBe(true);
        expect(filtersActive(f)).toBe(true);
        expect(filtersActive(NO_FILTERS)).toBe(false);
    });
});
