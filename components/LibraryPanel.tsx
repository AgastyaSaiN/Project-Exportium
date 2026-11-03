import React, { useMemo, useState } from 'react';
import { computeInsights, findLinks, onThisDay, toCsv, toHtml, toPlainText } from '../utils/chatData';
import type { ToolMessage } from '../utils/chatData';
import type { MediaSource } from '../utils/mediaLoader';
import { saveMedia, saveText } from '../utils/saveMedia';

type Section = 'starred' | 'day' | 'links' | 'files' | 'insights';

interface LibraryPanelProps {
    messages: ToolMessage[];
    starred: ReadonlySet<string>;
    onToggleStar: (id: string) => void;
    /** Go to a message in the chat. */
    onJump: (id: string) => void;
    media: MediaSource;
    chatTitle: string;
    accent?: string;
}

const when = (ts: number) => new Date(ts).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
const snippet = (text: string, length = 160) => (text.length > length ? `${text.slice(0, length)}…` : text) || '(attachment)';

const Row: React.FC<{ message: ToolMessage; onJump: (id: string) => void; extra?: React.ReactNode; label?: string }> = ({ message, onJump, extra, label }) => (
    <li className="flex items-start gap-3 px-4 py-3 border-b border-slate-200 dark:border-slate-700">
        <button type="button" onClick={() => onJump(message.id)} className="flex-1 min-w-0 text-left">
            <span className="block text-xs text-slate-500 dark:text-slate-400">{message.sender ?? 'System'} · {when(message.ts)}</span>
            <span className="block mt-0.5 text-sm text-slate-800 dark:text-slate-100 break-words">{label ?? snippet(message.text)}</span>
        </button>
        {extra}
    </li>
);

const Empty: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <div className="p-10 text-center text-slate-500 dark:text-slate-400 text-sm">{children}</div>
);

const Bars: React.FC<{ values: number[]; labels: string[]; color: string; height?: number }> = ({ values, labels, color, height = 72 }) => {
    const max = Math.max(1, ...values);
    return (
        <div className="flex items-end gap-[2px]" style={{ height }} role="img" aria-label="Bar chart">
            {values.map((value, index) => (
                <div key={index} title={`${labels[index]}: ${value.toLocaleString()}`} className={`flex-1 rounded-t ${color}`} style={{ height: `${Math.max(2, (value / max) * 100)}%`, opacity: value === 0 ? 0.25 : 1 }} />
            ))}
        </div>
    );
};

const Stat: React.FC<{ label: string; value: string }> = ({ label, value }) => (
    <div className="p-4 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
        <div className="text-2xl font-bold text-slate-900 dark:text-slate-50">{value}</div>
        <div className="text-xs mt-1 uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</div>
    </div>
);

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/**
 * The "Library" tab: what you saved (stars), what happened on this day in earlier years, every link
 * and file in the chat, a few numbers about it, and ways to take it with you. Shared by all four apps.
 */
const LibraryPanel: React.FC<LibraryPanelProps> = ({ messages, starred, onToggleStar, onJump, media, chatTitle, accent = 'bg-sky-500' }) => {
    const [section, setSection] = useState<Section>('starred');

    const starredMessages = useMemo(() => messages.filter(m => starred.has(m.id)), [messages, starred]);
    const days = useMemo(() => onThisDay(messages), [messages]);
    const links = useMemo(() => {
        const found: { message: ToolMessage; link: string }[] = [];
        for (const message of messages) for (const link of findLinks(message.text)) found.push({ message, link });
        return found.reverse();
    }, [messages]);
    const files = useMemo(() => {
        const found: { message: ToolMessage; uri: string; name: string }[] = [];
        for (const message of messages) for (const file of message.files ?? []) found.push({ message, uri: file.uri, name: file.name });
        return found.reverse();
    }, [messages]);
    const insights = useMemo(() => (section === 'insights' ? computeInsights(messages) : null), [section, messages]);

    const tabs: { id: Section; label: string; count?: number }[] = [
        { id: 'starred', label: 'Starred', count: starredMessages.length },
        { id: 'day', label: 'On this day', count: days.reduce((n, d) => n + d.messages.length, 0) },
        { id: 'links', label: 'Links', count: links.length },
        { id: 'files', label: 'Files', count: files.length },
        { id: 'insights', label: 'Insights' },
    ];

    const safeName = chatTitle.replace(/[<>:"/\\|?*]+/g, '_') || 'chat';

    return (
        <div className="h-full flex flex-col bg-slate-50 dark:bg-slate-900">
            <div className="flex-shrink-0 flex flex-wrap items-center gap-2 p-3 border-b border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800/80">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        type="button"
                        onClick={() => setSection(tab.id)}
                        aria-pressed={section === tab.id}
                        className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${section === tab.id ? `${accent} text-white` : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-200 border border-slate-300 dark:border-slate-600'}`}
                    >
                        {tab.label}{tab.count !== undefined ? ` (${tab.count.toLocaleString()})` : ''}
                    </button>
                ))}
                <div className="ml-auto flex items-center gap-2 text-sm">
                    <span className="text-slate-500 dark:text-slate-400">Save chat as</span>
                    <button type="button" onClick={() => saveText(toPlainText(chatTitle, messages), `${safeName}.txt`)} className="px-2 py-1 rounded border border-slate-300 dark:border-slate-600 hover:bg-white dark:hover:bg-slate-700">Text</button>
                    <button type="button" onClick={() => saveText(toCsv(messages), `${safeName}.csv`, 'text/csv')} className="px-2 py-1 rounded border border-slate-300 dark:border-slate-600 hover:bg-white dark:hover:bg-slate-700">CSV</button>
                    <button type="button" onClick={() => saveText(toHtml(chatTitle, messages), `${safeName}.html`, 'text/html')} className="px-2 py-1 rounded border border-slate-300 dark:border-slate-600 hover:bg-white dark:hover:bg-slate-700" title="A printable page; print it to save a PDF">Printable page</button>
                </div>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto">
                {section === 'starred' && (starredMessages.length === 0
                    ? <Empty>Nothing starred yet. Hover a message and click the ☆ to keep it here.</Empty>
                    : <ul>{starredMessages.map(m => <Row key={m.id} message={m} onJump={onJump} extra={<button type="button" aria-label="Remove star" onClick={() => onToggleStar(m.id)} className="text-amber-500 text-lg px-2">★</button>} />)}</ul>)}

                {section === 'day' && (days.length === 0
                    ? <Empty>No messages from earlier years on {new Date().toLocaleDateString([], { month: 'long', day: 'numeric' })}.</Empty>
                    : days.map(group => (
                        <section key={group.year}>
                            <h3 className="px-4 py-2 text-sm font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">{group.year} · {new Date().getFullYear() - group.year} year{new Date().getFullYear() - group.year === 1 ? '' : 's'} ago</h3>
                            <ul>{group.messages.slice(0, 50).map(m => <Row key={m.id} message={m} onJump={onJump} />)}</ul>
                        </section>
                    )))}

                {section === 'links' && (links.length === 0
                    ? <Empty>No links in this chat.</Empty>
                    : <ul>{links.slice(0, 1000).map((entry, index) => (
                        <Row key={`${entry.message.id}-${index}`} message={entry.message} onJump={onJump} label={entry.link}
                            extra={<a href={entry.link} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold underline px-2 whitespace-nowrap">Open</a>} />
                    ))}</ul>)}

                {section === 'files' && (files.length === 0
                    ? <Empty>No files or documents in this chat.</Empty>
                    : <ul>{files.slice(0, 1000).map((entry, index) => (
                        <Row key={`${entry.message.id}-${index}`} message={entry.message} onJump={onJump} label={entry.name}
                            extra={<button type="button" onClick={() => void saveMedia(media, entry.uri, entry.name)} className="text-sm font-semibold underline px-2">Save</button>} />
                    ))}</ul>)}

                {section === 'insights' && insights && (
                    insights.total === 0 ? <Empty>No messages to analyse.</Empty> : (
                        <div className="p-4 space-y-6 max-w-3xl mx-auto">
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                <Stat label="Messages" value={insights.total.toLocaleString()} />
                                <Stat label="Words" value={insights.wordCount.toLocaleString()} />
                                <Stat label="Days with messages" value={insights.activeDays.toLocaleString()} />
                                <Stat label="Longest daily streak" value={`${insights.longestStreakDays} day${insights.longestStreakDays === 1 ? '' : 's'}`} />
                            </div>
                            <p className="text-sm text-slate-600 dark:text-slate-300">
                                From <strong>{new Date(insights.firstTs).toLocaleDateString([], { dateStyle: 'long' })}</strong> to <strong>{new Date(insights.lastTs).toLocaleDateString([], { dateStyle: 'long' })}</strong>.
                                {insights.busiestDay && <> The busiest day was <strong>{new Date(`${insights.busiestDay.date}T12:00:00`).toLocaleDateString([], { dateStyle: 'long' })}</strong> with {insights.busiestDay.count.toLocaleString()} messages.</>}
                            </p>
                            <section>
                                <h3 className="text-sm font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-2">Who wrote the most</h3>
                                <ul className="space-y-2">
                                    {insights.perSender.slice(0, 8).map(entry => (
                                        <li key={entry.name}>
                                            <div className="flex justify-between text-sm text-slate-700 dark:text-slate-200"><span className="truncate">{entry.name}</span><span>{entry.count.toLocaleString()} · {Math.round((entry.count / insights.total) * 100)}%</span></div>
                                            <div className="h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden"><div className={`h-full ${accent}`} style={{ width: `${(entry.count / insights.perSender[0].count) * 100}%` }} /></div>
                                        </li>
                                    ))}
                                </ul>
                            </section>
                            <section>
                                <h3 className="text-sm font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-2">Messages per month</h3>
                                <Bars values={insights.perMonth.map(m => m.count)} labels={insights.perMonth.map(m => m.month)} color={accent} />
                                <div className="flex justify-between text-xs text-slate-500 mt-1"><span>{insights.perMonth[0]?.month}</span><span>{insights.perMonth[insights.perMonth.length - 1]?.month}</span></div>
                            </section>
                            <div className="grid sm:grid-cols-2 gap-6">
                                <section>
                                    <h3 className="text-sm font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-2">By hour of day</h3>
                                    <Bars values={insights.perHour} labels={insights.perHour.map((_, h) => `${h}:00`)} color={accent} />
                                    <div className="flex justify-between text-xs text-slate-500 mt-1"><span>0h</span><span>12h</span><span>23h</span></div>
                                </section>
                                <section>
                                    <h3 className="text-sm font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-2">By day of week</h3>
                                    <Bars values={insights.perWeekday} labels={WEEKDAYS} color={accent} />
                                    <div className="flex justify-between text-xs text-slate-500 mt-1">{WEEKDAYS.map(d => <span key={d}>{d}</span>)}</div>
                                </section>
                            </div>
                        </div>
                    )
                )}
            </div>
        </div>
    );
};

export default LibraryPanel;
