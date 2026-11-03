import React, { useEffect, useMemo, useRef, useState } from 'react';

export type CalendarTone = 'green' | 'pink' | 'sky' | 'yellow';

// Spelled out in full so Tailwind sees every class.
const TONES: Record<CalendarTone, { hover: string; dot: string }> = {
    green: { hover: 'hover:bg-green-100 dark:hover:bg-green-900/50', dot: 'bg-green-500' },
    pink: { hover: 'hover:bg-pink-100 dark:hover:bg-pink-900/50', dot: 'bg-pink-500' },
    sky: { hover: 'hover:bg-sky-100 dark:hover:bg-sky-900/50', dot: 'bg-sky-500' },
    yellow: { hover: 'hover:bg-yellow-100 dark:hover:bg-yellow-900/40', dot: 'bg-yellow-400' },
};

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

/** The day key the calendar uses to mark days that have messages: local time, YYYY-MM-DD. */
export const dayKey = (timestamp: number): string => {
    const date = new Date(timestamp);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

interface CalendarPopoverProps {
    isOpen: boolean;
    onClose: () => void;
    onDateSelect: (date: Date) => void;
    /** Days with messages, as dayKey() strings; other days are greyed out. */
    activeDays: Set<string>;
    tone?: CalendarTone;
    /** Open on the month of this day instead of today (the latest message is a better start than "now"). */
    startAt?: number;
}

export const CalendarDaysIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
    </svg>
);

const Chevron: React.FC<{ direction: 'left' | 'right' }> = ({ direction }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" d={direction === 'left' ? 'M15.75 19.5L8.25 12l7.5-7.5' : 'M8.25 4.5l7.5 7.5-7.5 7.5'} />
    </svg>
);

/** "Jump to date": days, months and years, with the days that have messages marked. */
const CalendarPopover: React.FC<CalendarPopoverProps> = ({ isOpen, onClose, onDateSelect, activeDays, tone = 'green', startAt }) => {
    const [viewDate, setViewDate] = useState(() => new Date(startAt ?? Date.now()));
    const [viewMode, setViewMode] = useState<'days' | 'months' | 'years'>('days');
    const popoverRef = useRef<HTMLDivElement>(null);
    const colors = TONES[tone];

    const yearsRange = useMemo(() => {
        const years = Array.from(activeDays).map(d => parseInt(d.substring(0, 4), 10));
        if (years.length === 0) return { min: new Date().getFullYear() - 5, max: new Date().getFullYear() };
        return { min: Math.min(...years), max: Math.max(...years) };
    }, [activeDays]);

    useEffect(() => {
        if (!isOpen) return;
        const onMouseDown = (event: MouseEvent) => {
            if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) onClose();
        };
        const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
        document.addEventListener('mousedown', onMouseDown);
        document.addEventListener('keydown', onKey);
        return () => { document.removeEventListener('mousedown', onMouseDown); document.removeEventListener('keydown', onKey); };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const step = viewMode === 'days' ? { m: 1, y: 0 } : viewMode === 'months' ? { m: 0, y: 1 } : { m: 0, y: 10 };
    const move = (direction: 1 | -1) => setViewDate(new Date(year + direction * step.y, month + direction * step.m, 1));

    const firstWeekday = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const years = Array.from({ length: yearsRange.max - yearsRange.min + 1 }, (_, i) => yearsRange.min + i);

    return (
        <div ref={popoverRef} role="dialog" aria-label="Jump to date" className="absolute top-16 right-4 z-30 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-lg shadow-2xl p-4 border border-slate-200 dark:border-slate-700 w-72">
            <div className="flex justify-between items-center mb-4">
                <button type="button" aria-label="Previous" onClick={() => move(-1)} className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700"><Chevron direction="left" /></button>
                <div className="flex gap-1 font-bold">
                    {viewMode === 'days' && <button type="button" className="hover:underline" onClick={() => setViewMode('months')}>{MONTHS[month]}</button>}
                    <button type="button" className="hover:underline" onClick={() => setViewMode('years')}>{year}</button>
                </div>
                <button type="button" aria-label="Next" onClick={() => move(1)} className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700"><Chevron direction="right" /></button>
            </div>
            {viewMode === 'days' && (
                <>
                    <div className="grid grid-cols-7 gap-y-2 text-center text-sm">
                        {WEEKDAYS.map(day => <div key={day} className="font-medium text-slate-500 dark:text-slate-400 text-xs">{day}</div>)}
                    </div>
                    <div className="grid grid-cols-7 gap-1 mt-2">
                        {Array.from({ length: firstWeekday }).map((_, i) => <div key={`empty-${i}`} />)}
                        {Array.from({ length: daysInMonth }).map((_, day) => {
                            const date = new Date(year, month, day + 1);
                            const hasMessages = activeDays.has(dayKey(date.getTime()));
                            return (
                                <div key={day} className="relative flex justify-center items-center">
                                    <button
                                        type="button"
                                        disabled={!hasMessages}
                                        onClick={() => { onDateSelect(date); onClose(); }}
                                        className={`w-8 h-8 rounded-full transition-colors text-sm ${hasMessages ? `${colors.hover} font-semibold` : 'text-slate-400 dark:text-slate-600 cursor-not-allowed'}`}
                                    >{day + 1}</button>
                                    {hasMessages && <div className={`absolute bottom-1 w-1 h-1 rounded-full ${colors.dot}`} />}
                                </div>
                            );
                        })}
                    </div>
                </>
            )}
            {viewMode === 'months' && (
                <div className="grid grid-cols-4 gap-2">
                    {MONTHS.map((name, index) => (
                        <button type="button" key={name} onClick={() => { setViewDate(new Date(year, index, 1)); setViewMode('days'); }} className="p-2 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700 font-semibold text-sm">{name}</button>
                    ))}
                </div>
            )}
            {viewMode === 'years' && (
                <div className="grid grid-cols-4 gap-2 max-h-56 overflow-y-auto">
                    {years.map(y => (
                        <button type="button" key={y} onClick={() => { setViewDate(new Date(y, month, 1)); setViewMode('months'); }} className="p-2 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700 font-semibold text-sm">{y}</button>
                    ))}
                </div>
            )}
        </div>
    );
};

export default CalendarPopover;
