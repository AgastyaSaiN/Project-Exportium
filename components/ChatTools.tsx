import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

// ----------------------------------------------------------------------------- stars

interface StarApi {
    isStarred: (id: string) => boolean;
    toggle: (id: string) => void;
}

const StarContext = createContext<StarApi | null>(null);

export const StarProvider: React.FC<{ starred: ReadonlySet<string>; onToggle: (id: string) => void; children: React.ReactNode }> = ({ starred, onToggle, children }) => {
    const api = useMemo<StarApi>(() => ({ isStarred: (id) => starred.has(id), toggle: onToggle }), [starred, onToggle]);
    return <StarContext.Provider value={api}>{children}</StarContext.Provider>;
};

const isPhone = () => typeof document !== 'undefined' && document.documentElement.classList.contains('native-mobile');

/** Phone only: the sheet that opens when you press and hold a message. */
const MessageSheet: React.FC<{ starred: boolean; text: string; onStar: () => void; onClose: () => void }> = ({ starred, text, onStar, onClose }) => {
    const [note, setNote] = useState('');
    const done = (message: string) => { setNote(message); window.setTimeout(onClose, 700); };
    const copy = async () => { try { await navigator.clipboard.writeText(text); done('Copied'); } catch { done('Could not copy'); } };
    const share = async () => { try { await navigator.share({ text }); onClose(); } catch { onClose(); } };
    const canShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';
    const item = 'w-full text-left px-5 py-4 text-base font-medium text-slate-800 dark:text-slate-100 active:bg-slate-100 dark:active:bg-slate-700';
    return createPortal(
        <div className="fixed inset-0 z-[100] flex flex-col justify-end bg-black/50" onClick={onClose}>
            <div className="rounded-t-2xl bg-white dark:bg-slate-800 pb-[max(env(safe-area-inset-bottom),20px)] shadow-2xl" onClick={(e) => e.stopPropagation()}>
                <div className="mx-auto mt-2 mb-1 h-1 w-10 rounded-full bg-slate-300 dark:bg-slate-600" />
                {text && <p className="px-5 py-2 text-sm text-slate-500 dark:text-slate-400 line-clamp-3 whitespace-pre-line break-words">{text}</p>}
                {note ? <p className="px-5 py-4 text-base font-semibold text-slate-800 dark:text-slate-100">{note}</p> : (
                    <>
                        <button type="button" className={item} onClick={() => { onStar(); onClose(); }}>{starred ? '★  Remove star' : '☆  Star message'}</button>
                        {text && <button type="button" className={item} onClick={() => void copy()}>Copy text</button>}
                        {text && canShare && <button type="button" className={item} onClick={() => void share()}>Share…</button>}
                        <button type="button" className={`${item} text-slate-500 dark:text-slate-400`} onClick={onClose}>Cancel</button>
                    </>
                )}
            </div>
        </div>,
        document.body,
    );
};

/**
 * Place inside a message bubble (an element that is `relative group`). On desktop it is a small star in the
 * bubble's corner; on a phone there is no corner button: pressing and holding the bubble opens a sheet to
 * star, copy or share the message.
 */
export const StarButton: React.FC<{ id: string | number }> = ({ id }) => {
    const stars = useContext(StarContext);
    const anchor = useRef<HTMLSpanElement>(null);
    const [menuText, setMenuText] = useState<string | null>(null);
    const phone = isPhone();

    useEffect(() => {
        if (!phone) return;
        const bubble = anchor.current?.parentElement;
        if (!bubble) return;
        let timer = 0;
        let startX = 0;
        let startY = 0;
        const cancel = () => window.clearTimeout(timer);
        const down = (e: PointerEvent) => {
            if (e.pointerType === 'mouse') return;
            startX = e.clientX;
            startY = e.clientY;
            cancel();
            timer = window.setTimeout(() => {
                navigator.vibrate?.(15);
                setMenuText((bubble.innerText || '').split('\n').map(line => line.trim()).filter(line => line && !/^\d{1,2}[:.]\d{2}(\s?[AaPp][Mm])?$/.test(line)).join('\n'));
            }, 450);
        };
        const move = (e: PointerEvent) => { if (Math.abs(e.clientX - startX) > 10 || Math.abs(e.clientY - startY) > 10) cancel(); };
        const block = (e: Event) => e.preventDefault();
        bubble.style.userSelect = 'none';
        bubble.style.setProperty('-webkit-touch-callout', 'none');
        bubble.addEventListener('pointerdown', down);
        bubble.addEventListener('pointermove', move);
        bubble.addEventListener('pointerup', cancel);
        bubble.addEventListener('pointercancel', cancel);
        bubble.addEventListener('contextmenu', block);
        return () => {
            cancel();
            bubble.removeEventListener('pointerdown', down);
            bubble.removeEventListener('pointermove', move);
            bubble.removeEventListener('pointerup', cancel);
            bubble.removeEventListener('pointercancel', cancel);
            bubble.removeEventListener('contextmenu', block);
        };
    }, [phone]);

    if (!stars) return null;
    const key = String(id);
    const on = stars.isStarred(key);

    if (phone) {
        return (
            <>
                <span ref={anchor} className="hidden" />
                {on && <span className="absolute -top-2 right-2 z-10 text-amber-500 text-sm leading-none pointer-events-none before:content-['★']" aria-label="Starred" />}
                {menuText !== null && <MessageSheet starred={on} text={menuText} onStar={() => stars.toggle(key)} onClose={() => setMenuText(null)} />}
            </>
        );
    }

    return (
        <button
            type="button"
            aria-label={on ? 'Remove star' : 'Star this message'}
            aria-pressed={on}
            title={on ? 'Starred: click to remove' : 'Star this message'}
            onClick={(e) => { e.stopPropagation(); stars.toggle(key); }}
            className={`absolute -top-2 -right-2 z-10 w-6 h-6 rounded-full text-sm leading-none flex items-center justify-center shadow bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 transition-opacity ${on ? 'opacity-100 text-amber-500' : 'opacity-0 group-hover:opacity-100 focus:opacity-100 text-slate-400 hover:text-amber-500'}`}
        >
            {on ? '★' : '☆'}
        </button>
    );
};

// ----------------------------------------------------------------------------- search hits

interface HitNavigatorProps {
    /** 1-based position of the current match, and how many there are. */
    position: number;
    total: number;
    onPrev: () => void;
    onNext: () => void;
    onClose: () => void;
}

/** After jumping to a search result in context, steps to the previous or next match without going back to the list. */
export const HitNavigator: React.FC<HitNavigatorProps> = ({ position, total, onPrev, onNext, onClose }) => (
    <div role="toolbar" aria-label="Search matches" className="fixed bottom-6 left-1/2 -translate-x-1/2 z-30 flex items-center gap-1 pl-4 pr-2 py-1.5 rounded-full bg-slate-900/95 text-white shadow-xl text-sm">
        <span className="font-semibold tabular-nums">Match {position.toLocaleString()} of {total.toLocaleString()}</span>
        <button type="button" aria-label="Previous match" onClick={onPrev} disabled={position <= 1} className="w-8 h-8 rounded-full hover:bg-white/15 disabled:opacity-30">↑</button>
        <button type="button" aria-label="Next match" onClick={onNext} disabled={position >= total} className="w-8 h-8 rounded-full hover:bg-white/15 disabled:opacity-30">↓</button>
        <button type="button" aria-label="Close match navigator" onClick={onClose} className="w-8 h-8 rounded-full hover:bg-white/15">✕</button>
    </div>
);

// ----------------------------------------------------------------------------- search filters

export interface SearchFilterValue {
    sender: string;      // '' = anyone
    from: string;        // yyyy-mm-dd or ''
    to: string;
}

export const NO_FILTERS: SearchFilterValue = { sender: '', from: '', to: '' };

export const filtersActive = (f: SearchFilterValue) => !!(f.sender || f.from || f.to);

/** Whether a message passes the sender and date-range filters of a search. */
export const passesFilters = (f: SearchFilterValue, sender: string | null | undefined, ts: number): boolean => {
    if (f.sender && sender !== f.sender) return false;
    if (f.from && ts < new Date(`${f.from}T00:00:00`).getTime()) return false;
    if (f.to && ts > new Date(`${f.to}T23:59:59.999`).getTime()) return false;
    return true;
};

interface SearchFiltersProps {
    senders: string[];
    value: SearchFilterValue;
    onChange: (next: SearchFilterValue) => void;
}

/** A "Filters" button beside the search box: limit a search to one person and/or a date range. */
export const SearchFilters: React.FC<SearchFiltersProps> = ({ senders, value, onChange }) => {
    const [open, setOpen] = useState(false);
    const active = filtersActive(value);
    return (
        <div className="relative">
            <button
                type="button"
                aria-label="Search filters"
                aria-expanded={open}
                onClick={() => setOpen(o => !o)}
                className={`px-3 py-1.5 rounded-full text-sm font-semibold border transition-colors ${active ? 'bg-sky-500 text-white border-sky-500' : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-200 border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600'}`}
            >
                Filters{active ? ' •' : ''}
            </button>
            {open && (
                <div className="absolute right-0 mt-2 w-72 z-30 p-4 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 space-y-3">
                    <label className="block text-xs font-semibold uppercase tracking-wide opacity-70">
                        From
                        <select value={value.sender} onChange={e => onChange({ ...value, sender: e.target.value })} className="mt-1 w-full rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-2 py-1.5 text-sm normal-case tracking-normal font-normal">
                            <option value="">Anyone</option>
                            {senders.map(name => <option key={name} value={name}>{name}</option>)}
                        </select>
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                        <label className="block text-xs font-semibold uppercase tracking-wide opacity-70">
                            After
                            <input type="date" value={value.from} onChange={e => onChange({ ...value, from: e.target.value })} className="mt-1 w-full rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-2 py-1.5 text-sm normal-case tracking-normal font-normal" />
                        </label>
                        <label className="block text-xs font-semibold uppercase tracking-wide opacity-70">
                            Before
                            <input type="date" value={value.to} onChange={e => onChange({ ...value, to: e.target.value })} className="mt-1 w-full rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-2 py-1.5 text-sm normal-case tracking-normal font-normal" />
                        </label>
                    </div>
                    <div className="flex justify-between pt-1">
                        <button type="button" onClick={() => onChange(NO_FILTERS)} disabled={!active} className="text-sm underline disabled:opacity-40">Clear</button>
                        <button type="button" onClick={() => setOpen(false)} className="text-sm font-semibold">Done</button>
                    </div>
                </div>
            )}
        </div>
    );
};
