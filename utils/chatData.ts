/** The few facts about a message that the library, insights and export features need, whatever app it came from. */
export interface ToolMessage {
    id: string;
    sender: string | null;
    ts: number;
    text: string;
    files?: { uri: string; name: string }[];
}

const LINK = /https?:\/\/[^\s<>"')\]]+/gi;

export const findLinks = (text: string): string[] => {
    const found = text.match(LINK);
    return found ? Array.from(new Set(found.map(link => link.replace(/[.,;:!?]+$/, '')))) : [];
};

// ----------------------------------------------------------------------------- insights

export interface Insights {
    total: number;
    perSender: { name: string; count: number }[];
    firstTs: number;
    lastTs: number;
    activeDays: number;
    busiestDay: { date: string; count: number } | null;
    longestStreakDays: number;
    perHour: number[];
    perWeekday: number[];
    perMonth: { month: string; count: number }[];
    wordCount: number;
}

const dayKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** Counts that answer "who talks more, and when": one pass over the chat. */
export const computeInsights = (messages: ToolMessage[]): Insights => {
    const perSender = new Map<string, number>();
    const perDay = new Map<string, number>();
    const perMonth = new Map<string, number>();
    const perHour = new Array<number>(24).fill(0);
    const perWeekday = new Array<number>(7).fill(0);
    let wordCount = 0;
    let firstTs = Infinity;
    let lastTs = 0;

    for (const message of messages) {
        const d = new Date(message.ts);
        const sender = message.sender ?? '';
        if (sender) perSender.set(sender, (perSender.get(sender) ?? 0) + 1);
        const day = dayKey(d);
        perDay.set(day, (perDay.get(day) ?? 0) + 1);
        const month = day.slice(0, 7);
        perMonth.set(month, (perMonth.get(month) ?? 0) + 1);
        perHour[d.getHours()]++;
        perWeekday[d.getDay()]++;
        if (message.text) wordCount += message.text.split(/\s+/).filter(Boolean).length;
        if (message.ts < firstTs) firstTs = message.ts;
        if (message.ts > lastTs) lastTs = message.ts;
    }

    let busiest: { date: string; count: number } | null = null;
    for (const [date, count] of perDay) if (!busiest || count > busiest.count) busiest = { date, count };

    // Longest run of consecutive days with at least one message.
    const days = Array.from(perDay.keys()).sort();
    let longest = 0, run = 0, previous = 0;
    for (const day of days) {
        const [y, m, d] = day.split('-').map(Number);
        const stamp = Date.UTC(y, m - 1, d) / 86400000;
        run = stamp - previous === 1 ? run + 1 : 1;
        previous = stamp;
        if (run > longest) longest = run;
    }

    return {
        total: messages.length,
        perSender: Array.from(perSender, ([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count),
        firstTs: messages.length ? firstTs : 0,
        lastTs,
        activeDays: perDay.size,
        busiestDay: busiest,
        longestStreakDays: longest,
        perHour,
        perWeekday,
        perMonth: Array.from(perMonth, ([month, count]) => ({ month, count })).sort((a, b) => a.month.localeCompare(b.month)),
        wordCount,
    };
};

// ----------------------------------------------------------------------------- on this day

/** Messages sent on this calendar day (month and day) in earlier years, newest year first. */
export const onThisDay = (messages: ToolMessage[], today = new Date()): { year: number; messages: ToolMessage[] }[] => {
    const byYear = new Map<number, ToolMessage[]>();
    for (const message of messages) {
        const d = new Date(message.ts);
        if (d.getMonth() !== today.getMonth() || d.getDate() !== today.getDate() || d.getFullYear() >= today.getFullYear()) continue;
        const list = byYear.get(d.getFullYear()) ?? [];
        list.push(message);
        byYear.set(d.getFullYear(), list);
    }
    return Array.from(byYear, ([year, list]) => ({ year, messages: list })).sort((a, b) => b.year - a.year);
};

// ----------------------------------------------------------------------------- export

const stamp = (ts: number) => new Date(ts).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });

const bodyOf = (message: ToolMessage) =>
    [message.text, ...(message.files ?? []).map(file => `[file: ${file.name}]`)].filter(Boolean).join(' ');

export const toPlainText = (title: string, messages: ToolMessage[]): string =>
    `${title}\n${'='.repeat(Math.max(3, title.length))}\n\n` +
    messages.map(m => `[${stamp(m.ts)}] ${m.sender ? `${m.sender}: ` : ''}${bodyOf(m)}`).join('\n') + '\n';

const csvCell = (value: string) => `"${value.replace(/"/g, '""')}"`;

export const toCsv = (messages: ToolMessage[]): string =>
    ['timestamp,sender,message', ...messages.map(m => [new Date(m.ts).toISOString(), m.sender ?? '', bodyOf(m)].map(csvCell).join(','))].join('\r\n') + '\r\n';

const escapeHtml = (text: string) => text.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string));

/** A single self-contained page that prints cleanly (and so can be saved as a PDF from any browser). */
export const toHtml = (title: string, messages: ToolMessage[]): string => {
    let lastDay = '';
    const rows = messages.map(m => {
        const day = new Date(m.ts).toLocaleDateString([], { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
        const heading = day !== lastDay ? `<h2>${escapeHtml(day)}</h2>` : '';
        lastDay = day;
        const time = new Date(m.ts).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
        return `${heading}<p><span class="t">${escapeHtml(time)}</span> ${m.sender ? `<b>${escapeHtml(m.sender)}</b>: ` : ''}${escapeHtml(bodyOf(m)).replace(/\n/g, '<br>')}</p>`;
    });
    return `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(title)}</title><style>
body{font:15px/1.5 system-ui,sans-serif;max-width:46rem;margin:2rem auto;padding:0 1rem;color:#111}
h1{font-size:1.5rem}h2{font-size:1rem;margin:1.6rem 0 .4rem;padding-top:.6rem;border-top:1px solid #ddd;color:#555}
p{margin:.25rem 0}.t{color:#888;font-size:.8rem;margin-right:.4rem}@media print{h2{break-after:avoid}p{break-inside:avoid}}
</style></head><body><h1>${escapeHtml(title)}</h1><p><i>${messages.length.toLocaleString()} messages</i></p>${rows.join('\n')}</body></html>`;
};
