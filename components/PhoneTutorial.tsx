import React, { useEffect, useRef, useState } from 'react';
import { PLATFORMS } from '../constants';
import { useBackToClose } from '../utils/useBackToClose';

/**
 * The phone app's first-launch tutorial: a few swipeable slides, each a drawn picture, a short title and one
 * line. Shown once (remembered on the device) and reopenable from Home and from a chat's three-dots menu.
 * Phone only: it never renders unless the `native-mobile` class is on the page.
 */

const SEEN_KEY = 'exportium.tutorialSeen';
const OPEN_EVENT = 'exportium:tutorial';

const onPhone = () => typeof document !== 'undefined' && document.documentElement.classList.contains('native-mobile');

/** Opens the tutorial from anywhere (Home link, chat menu). */
export const openTutorial = () => window.dispatchEvent(new Event(OPEN_EVENT));

const wasSeen = (): boolean => { try { return localStorage.getItem(SEEN_KEY) === '1'; } catch { return false; } };
const markSeen = () => { try { localStorage.setItem(SEEN_KEY, '1'); } catch { /* private mode: it just shows again */ } };

// ----------------------------------------------------------------------------- tiny icon set

const PATHS: Record<string, string> = {
    phone: 'M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3',
    lock: 'M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z',
    chat: 'M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 01-.825-.242m9.345-8.334a2.126 2.126 0 00-.476-.095 48.64 48.64 0 00-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0011.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155',
    box: 'M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5m8.25 3v6.75m0 0l-3-3m3 3l3-3M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z',
    down: 'M19.5 13.5L12 21m0 0l-7.5-7.5M12 21V3',
    search: 'M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z',
    calendar: 'M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5',
    star: 'M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z',
    copy: 'M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 01-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 011.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 00-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 01-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5a3.375 3.375 0 00-3.375-3.375H9.75',
    photo: 'M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.41a2.25 2.25 0 013.182 0l2.909 2.91m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z',
    cloudOff: 'M3 3l18 18M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 012.54-4.05M9.5 5.2A5.25 5.25 0 0117.7 9.1a4.5 4.5 0 011.8 7.4',
    tap: 'M15.042 21.672L13.684 16.6m0 0l-2.51 2.225.569-9.47 5.227 7.917-3.286-.672zM12 2.25V4.5m5.834.166l-1.591 1.591M20.25 10.5H18M7.757 14.743l-1.59 1.59M6 10.5H3.75m4.007-4.243l-1.59-1.59',
};

const Icon: React.FC<{ name: keyof typeof PATHS; className?: string }> = ({ name, className = 'w-7 h-7' }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.6} stroke="currentColor" className={className} aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d={PATHS[name]} />
    </svg>
);
const DotsIcon: React.FC = () => (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-7 h-7" aria-hidden="true"><circle cx="12" cy="5" r="1.8" /><circle cx="12" cy="12" r="1.8" /><circle cx="12" cy="19" r="1.8" /></svg>
);

// ----------------------------------------------------------------------------- shared pieces

const tile = 'flex items-center justify-center rounded-2xl border bg-slate-100 border-slate-200 text-slate-500 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400';
const lit = 'flex items-center justify-center rounded-2xl border-2 bg-green-100 border-green-500 text-green-600 dark:bg-green-500/15 dark:text-green-400';

const Label: React.FC<{ children: React.ReactNode }> = ({ children }) => <span className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">{children}</span>;

const Bubble: React.FC<{ mine?: boolean; w: string; hot?: boolean }> = ({ mine, w, hot }) => (
    <div className={`h-7 rounded-2xl ${w} ${mine ? 'self-end bg-green-200 dark:bg-green-500/30' : 'bg-slate-200 dark:bg-slate-700'} ${hot ? 'ring-2 ring-green-500' : ''}`} />
);

// ----------------------------------------------------------------------------- the slides

interface Slide { title: string; line: string; art: React.ReactNode }

const SLIDES: Slide[] = [
    {
        title: 'Your chats, offline',
        line: 'Nothing leaves your phone.',
        art: (
            <div className="relative">
                <div className={`${lit} w-32 h-32 !rounded-full`}><Icon name="phone" className="w-16 h-16" /></div>
                <div className={`${tile} absolute -right-3 -bottom-1 w-12 h-12 !rounded-full`}><Icon name="lock" className="w-6 h-6" /></div>
                <div className={`${tile} absolute -left-6 -top-1 w-12 h-12 !rounded-full`}><Icon name="cloudOff" className="w-6 h-6" /></div>
            </div>
        ),
    },
    {
        title: 'Export from your app',
        line: 'Use its Export chat option.',
        art: (
            <div className="flex flex-col items-center gap-3">
                <div className="flex gap-2.5">
                    {PLATFORMS.map(p => (
                        <div key={p.slug} className={`${tile} w-14 h-14`}><p.icon className={`w-8 h-8 ${p.color}`} /></div>
                    ))}
                </div>
                <div className="text-green-600 dark:text-green-400"><Icon name="down" className="w-8 h-8" /></div>
                <div className={`${lit} w-16 h-16`}><Icon name="box" className="w-8 h-8" /></div>
            </div>
        ),
    },
    {
        title: 'Pick it here',
        line: 'Tap the app, then your file.',
        art: (
            <div className="relative">
                <div className="grid grid-cols-2 gap-2.5">
                    <div className={`${tile} w-[68px] h-[68px]`} />
                    <div className={`${lit} w-[68px] h-[68px]`}><Icon name="chat" className="w-8 h-8" /></div>
                    <div className={`${tile} w-[68px] h-[68px]`} />
                    <div className={`${tile} w-[68px] h-[68px]`} />
                </div>
                <div className="absolute -right-8 top-9 text-slate-800 dark:text-slate-100"><Icon name="tap" className="w-10 h-10" /></div>
            </div>
        ),
    },
    {
        title: 'Three tabs',
        line: 'Messages, Media, Library.',
        art: (
            <div className="w-64 rounded-2xl overflow-hidden border bg-white border-slate-200 dark:bg-slate-800 dark:border-slate-700">
                <div className="h-28 p-3 flex flex-col gap-2"><Bubble w="w-3/5" /><Bubble mine w="w-2/5" /><Bubble w="w-4/5" /></div>
                <div className="flex border-t border-slate-200 dark:border-slate-700 text-[13px] font-semibold">
                    <span className="flex-1 text-center py-2.5 text-green-600 dark:text-green-400 border-b-2 border-green-500">Messages</span>
                    <span className="flex-1 text-center py-2.5 text-slate-500 dark:text-slate-400">Media</span>
                    <span className="flex-1 text-center py-2.5 text-slate-500 dark:text-slate-400">Library</span>
                </div>
            </div>
        ),
    },
    {
        title: 'Know the icons',
        line: 'Everything you need, up top.',
        art: (
            <div className="grid grid-cols-2 gap-x-9 gap-y-5">
                <div className="flex flex-col items-center"><div className={`${tile} w-14 h-14 !rounded-full`}><Icon name="search" /></div><Label>Search</Label></div>
                <div className="flex flex-col items-center"><div className={`${tile} w-14 h-14 !rounded-full`}><Icon name="calendar" /></div><Label>Jump to date</Label></div>
                <div className="flex flex-col items-center"><div className={`${tile} w-14 h-14 !rounded-full`}><DotsIcon /></div><Label>More</Label></div>
                <div className="flex flex-col items-center"><div className={`${lit} w-14 h-14 !rounded-full`}><Icon name="star" /></div><Label>Saved</Label></div>
            </div>
        ),
    },
    {
        title: 'Press and hold',
        line: 'Star or copy any message.',
        art: (
            <div className="relative w-64 h-48">
                <div className="absolute left-0 top-0 w-36"><Bubble w="w-full" /></div>
                <div className="absolute right-0 top-9 w-40"><Bubble mine hot w="w-full" /></div>
                <div className="absolute right-12 top-10 w-9 h-9 rounded-full border-2 border-green-500 opacity-70" />
                <div className="absolute left-8 bottom-0 w-44 rounded-xl overflow-hidden border bg-white border-slate-200 dark:bg-slate-800 dark:border-slate-700 text-sm text-slate-800 dark:text-slate-100">
                    <div className="flex items-center gap-3 px-3.5 py-2.5 border-b border-slate-200 dark:border-slate-700"><span className="text-green-600 dark:text-green-400"><Icon name="star" className="w-5 h-5" /></span>Star</div>
                    <div className="flex items-center gap-3 px-3.5 py-2.5"><span className="text-slate-500"><Icon name="copy" className="w-5 h-5" /></span>Copy</div>
                </div>
            </div>
        ),
    },
];

// ----------------------------------------------------------------------------- the overlay

const PhoneTutorial: React.FC<{ onDone: () => void }> = ({ onDone }) => {
    const [index, setIndex] = useState(0);
    const touchX = useRef<number | null>(null);
    useBackToClose(onDone);
    const last = index === SLIDES.length - 1;
    const slide = SLIDES[index];
    const go = (n: number) => setIndex(Math.max(0, Math.min(SLIDES.length - 1, n)));

    return (
        <div
            role="dialog"
            aria-label="How Exportium works"
            className="fixed inset-0 z-[100] flex flex-col bg-white dark:bg-slate-900 px-6"
            style={{ paddingTop: 'max(env(safe-area-inset-top), 28px)', paddingBottom: 'max(env(safe-area-inset-bottom), 20px)' }}
            onTouchStart={e => { touchX.current = e.touches[0].clientX; }}
            onTouchEnd={e => {
                if (touchX.current === null) return;
                const dx = e.changedTouches[0].clientX - touchX.current;
                touchX.current = null;
                if (Math.abs(dx) > 50) go(index + (dx < 0 ? 1 : -1));
            }}
        >
            <div className="flex-none h-12 flex justify-end items-center">
                {!last && <button type="button" onClick={onDone} className="px-3 py-2 text-base text-slate-500 dark:text-slate-400">Skip</button>}
            </div>
            <div className="flex-1 min-h-0 flex items-center justify-center">{slide.art}</div>
            <h2 className="flex-none text-center text-2xl font-bold text-slate-900 dark:text-white">{slide.title}</h2>
            <p className="flex-none text-center mt-1 mb-6 text-base text-slate-500 dark:text-slate-400">{slide.line}</p>
            <div className="flex-none flex justify-center gap-1.5 mb-6">
                {SLIDES.map((s, i) => <span key={s.title} className={`h-2 rounded-full ${i === index ? 'w-5 bg-green-500' : 'w-2 bg-slate-300 dark:bg-slate-600'}`} />)}
            </div>
            <div className="flex-none flex items-center justify-between">
                <button type="button" onClick={() => go(index - 1)} className={`px-4 py-3 text-base text-slate-600 dark:text-slate-300 ${index === 0 ? 'invisible' : ''}`}>Back</button>
                <button type="button" onClick={() => (last ? onDone() : go(index + 1))} className="px-7 py-3 rounded-full bg-green-500 text-white text-base font-semibold">{last ? 'Get started' : 'Next'}</button>
            </div>
        </div>
    );
};

/** Mounted once at the top of the app. Shows the tutorial on first launch and whenever `openTutorial()` is called. */
export const TutorialHost: React.FC = () => {
    const [open, setOpen] = useState(() => onPhone() && !wasSeen());
    useEffect(() => {
        if (!onPhone()) return;
        const show = () => setOpen(true);
        window.addEventListener(OPEN_EVENT, show);
        return () => window.removeEventListener(OPEN_EVENT, show);
    }, []);
    if (!open) return null;
    return <PhoneTutorial onDone={() => { markSeen(); setOpen(false); }} />;
};
