import React, { useEffect, useRef, useState } from 'react';

export interface GlobalHit {
    chatId: string;
    chatTitle: string;
    messageId: string;
    sender: string | null;
    ts: number;
    text: string;
}

export type GlobalSearchFn = (
    query: string,
    onProgress: (done: number, total: number) => void,
    signal: AbortSignal
) => Promise<GlobalHit[]>;

interface GlobalSearchProps {
    search: GlobalSearchFn;
    onOpen: (hit: GlobalHit) => void;
    onClose: () => void;
    accent?: string;
}

const MAX_SHOWN = 300;

const Highlight: React.FC<{ text: string; query: string }> = ({ text, query }) => {
    const index = text.toLowerCase().indexOf(query.toLowerCase());
    if (index < 0 || !query) return <>{text}</>;
    return <>{text.slice(0, index)}<mark className="bg-yellow-200 dark:bg-yellow-600/60 text-inherit rounded px-0.5">{text.slice(index, index + query.length)}</mark>{text.slice(index + query.length)}</>;
};

/** Searches every conversation in the archive at once and opens a result in its chat. */
const GlobalSearch: React.FC<GlobalSearchProps> = ({ search, onOpen, onClose, accent = 'bg-sky-500' }) => {
    const [query, setQuery] = useState('');
    const [hits, setHits] = useState<GlobalHit[] | null>(null);
    const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
    const [error, setError] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => { inputRef.current?.focus(); }, []);
    useEffect(() => {
        const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onClose]);

    // Search shortly after the reader stops typing; a new query cancels the one still running.
    useEffect(() => {
        const trimmed = query.trim();
        if (trimmed.length < 2) { setHits(null); setProgress(null); return; }
        const controller = new AbortController();
        const timer = setTimeout(async () => {
            setError('');
            setProgress({ done: 0, total: 1 });
            try {
                const found = await search(trimmed, (done, total) => { if (!controller.signal.aborted) setProgress({ done, total }); }, controller.signal);
                if (!controller.signal.aborted) { setHits(found); setProgress(null); }
            } catch (e) {
                if (!controller.signal.aborted) { setError(e instanceof Error ? e.message : 'Search failed.'); setProgress(null); }
            }
        }, 350);
        return () => { clearTimeout(timer); controller.abort(); };
    }, [query, search]);

    const grouped = new Map<string, { title: string; hits: GlobalHit[] }>();
    for (const hit of (hits ?? []).slice(0, MAX_SHOWN)) {
        const entry = grouped.get(hit.chatId) ?? { title: hit.chatTitle, hits: [] };
        entry.hits.push(hit);
        grouped.set(hit.chatId, entry);
    }
    const trimmed = query.trim();

    return (
        <div role="dialog" aria-modal="true" aria-label="Search all chats" className="fixed inset-0 z-50 flex items-start justify-center pt-[8vh] px-4" style={{ backgroundColor: 'rgba(0,0,0,0.55)' }} onClick={onClose}>
            <div className="w-full max-w-2xl max-h-[80vh] flex flex-col rounded-2xl shadow-2xl bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 overflow-hidden" onClick={e => e.stopPropagation()}>
                <div className="p-4 border-b border-slate-200 dark:border-slate-700">
                    <input
                        ref={inputRef}
                        type="text"
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        placeholder="Search every conversation..."
                        className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 px-4 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-sky-500"
                    />
                    {progress && (
                        <div className="mt-3 h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden" role="progressbar" aria-valuenow={progress.done} aria-valuemax={progress.total}>
                            <div className={`h-full ${accent} transition-all`} style={{ width: `${Math.round((progress.done / Math.max(1, progress.total)) * 100)}%` }} />
                        </div>
                    )}
                </div>
                <div className="flex-1 overflow-y-auto">
                    {error && <p className="p-6 text-sm text-red-600 dark:text-red-400">{error}</p>}
                    {!error && trimmed.length < 2 && <p className="p-6 text-sm text-slate-500 dark:text-slate-400">Type at least two letters. Results from every chat appear here; click one to open it in its conversation.</p>}
                    {!error && hits && hits.length === 0 && <p className="p-6 text-sm text-slate-500 dark:text-slate-400">Nothing found for "{trimmed}".</p>}
                    {Array.from(grouped, ([chatId, group]) => (
                        <section key={chatId}>
                            <h3 className="sticky top-0 px-4 py-2 text-sm font-bold bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-300">{group.title} · {group.hits.length}{group.hits.length >= 50 ? '+' : ''}</h3>
                            <ul>
                                {group.hits.slice(0, 50).map(hit => (
                                    <li key={`${hit.chatId}-${hit.messageId}`}>
                                        <button type="button" onClick={() => onOpen(hit)} className="w-full text-left px-4 py-3 border-b border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/60">
                                            <span className="block text-xs text-slate-500 dark:text-slate-400">{hit.sender ?? 'System'} · {new Date(hit.ts).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</span>
                                            <span className="block text-sm mt-0.5 break-words"><Highlight text={hit.text.length > 220 ? `${hit.text.slice(0, 220)}…` : hit.text} query={trimmed} /></span>
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        </section>
                    ))}
                    {hits && hits.length > MAX_SHOWN && <p className="p-4 text-xs text-center text-slate-500">Showing the first {MAX_SHOWN} matches. Narrow the search to see others.</p>}
                </div>
            </div>
        </div>
    );
};

export default GlobalSearch;
