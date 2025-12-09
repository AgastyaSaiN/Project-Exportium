
import React, { useState, useMemo, useEffect, useRef, useLayoutEffect, useCallback } from 'react';
import { Chat, Message, TelegramText } from './types';

type Theme = 'light' | 'dark';

// --- Icon Components ---
const ArrowLeftIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" /></svg>);
const SpinnerIcon: React.FC<{className?: string}> = ({className}) => (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className={className}><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>);
const SettingsIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => ( <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-1.007 1.11-1.226.55-.22 1.156-.22 1.706 0 .55.22 1.02.684 1.11 1.226l.08 1.485a2.5 2.5 0 011.82 2.336 2.5 2.5 0 01-.1 1.026l.42 1.696a2.5 2.5 0 01-2.22 3.097l-1.696-.42a2.5 2.5 0 01-1.026-.1 2.5 2.5 0 01-2.336-1.82l-1.485-.08a2.5 2.5 0 01-3.097-2.22l.42-1.696a2.5 2.5 0 01.1-1.026 2.5 2.5 0 011.82-2.336l1.485.08zm-2.478 8.485a.5.5 0 01.378-.85l.74-.185a2.5 2.5 0 012.336 1.82.5.5 0 01-.85.378l-.185.74a2.5 2.5 0 01-1.82-2.336zM12 15.75a3.75 3.75 0 100-7.5 3.75 3.75 0 000 7.5z" /></svg>);
const CloseIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>);
const SearchIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" /></svg>);
const XCircleIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>);
const PhotoIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 017.5 0z" /></svg>);
const CameraIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.776 48.776 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" /><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" /></svg>);
const SunIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" /></svg>);
const MoonIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" /></svg>);
const CalendarDaysIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0h18M-4.5 12h2.25" /><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5a.75.75 0 11-1.5 0 .75.75 0 011.5 0zM8.25 10.5a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" /></svg>);
const ChevronLeftIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>);
const ChevronRightIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>);
const ChatBubbleIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 017.5 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 017.5 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 017.5 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.76 9.76 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.455.09-.91.09-1.365 0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" /></svg>);

// --- Helper Functions ---
const formatTimestamp = (timestamp_ms: number) => new Date(timestamp_ms).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
const formatDateSeparator = (timestamp_ms: number) => { const date = new Date(timestamp_ms); const today = new Date(); const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1); if (date.toDateString() === today.toDateString()) return 'Today'; if (date.toDateString() === yesterday.toDateString()) return 'Yesterday'; return date.toLocaleDateString([], { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });};
const getMessagePreview = (message?: Message): string => {
    if (!message) return '...';
    if (typeof message.text === 'string' && message.text) return message.text;
    if (Array.isArray(message.text) && message.text.length > 0) {
        return message.text.map(part => typeof part === 'string' ? part : part.text).join('');
    }
    if (message.photo) return '📷 Photo';
    if (message.video_file) return '📹 Video';
    if (message.voice_message) return '🎤 Voice Message';
    if (message.sticker_emoji) return `${message.sticker_emoji} Sticker`;
    return 'Unsupported message';
};

// --- Sub-components ---
const HighlightedText: React.FC<{ text: string; highlight: string }> = ({ text, highlight }) => { if (!highlight.trim()) { return <>{text}</>; } const regex = new RegExp(`(${highlight.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'); const parts = text.split(regex); return (<>{parts.map((part, i) => regex.test(part) ? (<mark key={i} className="bg-sky-200 dark:bg-sky-500 text-slate-900 rounded px-0.5 py-0">{part}</mark>) : (part))}</>);};
const UserAvatar: React.FC<{ name: string; className?: string; imageUrl?: string | null; onClick?: (e: React.MouseEvent<HTMLDivElement>) => void; }> = React.memo(({ name, className = '', imageUrl, onClick }) => { const initial = (name || " ").charAt(0).toUpperCase(); const colors = ['bg-pink-200 text-pink-700', 'bg-blue-200 text-blue-700', 'bg-green-200 text-green-700', 'bg-purple-200 text-purple-700', 'bg-yellow-200 text-yellow-700']; const colorClass = colors[name.charCodeAt(0) % colors.length]; const content = imageUrl ? (<img src={imageUrl} alt={name} className={`rounded-full object-cover w-full h-full ${className}`} />) : (<div className={`rounded-full ${colorClass} flex items-center justify-center font-bold w-full h-full ${className}`}>{initial}</div>); return (<div className={`relative flex-shrink-0 ${onClick ? 'cursor-pointer' : ''} ${className}`} onClick={onClick}>{content}{onClick && (<div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity"><CameraIcon className="w-1/2 h-1/2 text-white" /></div>)}</div>);});
const useIntersectionObserver = (options: IntersectionObserverInit) => { const [entry, setEntry] = useState<IntersectionObserverEntry | null>(null); const observer = useRef<IntersectionObserver | null>(null); const ref = useRef(null); useEffect(() => { const node = ref.current; if (!node) return; observer.current = new IntersectionObserver(([entry]) => { if (entry.isIntersecting) { setEntry(entry); if (observer.current) { observer.current.unobserve(node); } } }, options); observer.current.observe(node); return () => { if (observer.current) { observer.current.disconnect(); } }; }, [options]); return [ref, entry] as const;};

const LazyMedia: React.FC<{ uri: string, createBlobUrl: (uri: string) => Promise<string | undefined>, isVideo: boolean, className?: string }> = ({ uri, createBlobUrl, isVideo, className }) => { const [blobUrl, setBlobUrl] = useState<string | null>(null); const [isLoading, setIsLoading] = useState(false); const [ref, entry] = useIntersectionObserver({ threshold: 0.1, rootMargin: '200px' }); useEffect(() => { if (entry?.isIntersecting && !blobUrl && !isLoading) { setIsLoading(true); createBlobUrl(uri).then(url => { if (url) { setBlobUrl(url); } }).finally(() => { setIsLoading(false); }); } }, [entry, uri, createBlobUrl, blobUrl, isLoading]); if (blobUrl) { if (isVideo) { return <video src={blobUrl} controls className={className} />; } return <img src={blobUrl} alt="Media" className={className} />; } const placeholderClass = isVideo ? 'aspect-video' : 'aspect-square'; return (<div ref={ref} className={`${className} ${placeholderClass} bg-slate-200 dark:bg-slate-700 flex items-center justify-center`}>{isLoading ? <SpinnerIcon className="w-6 h-6 text-slate-400 animate-spin" /> : <PhotoIcon className="w-8 h-8 text-slate-400" />}</div>);};

const renderTelegramText = (text: TelegramText, searchQuery: string) => {
    if (typeof text === 'string') {
        return <HighlightedText text={text} highlight={searchQuery} />;
    }
    return text.map((part, index) => {
        if (typeof part === 'string') {
            return <HighlightedText key={index} text={part} highlight={searchQuery} />;
        }
        switch(part.type) {
            case 'bold': return <strong key={index}><HighlightedText text={part.text} highlight={searchQuery} /></strong>;
            case 'italic': return <em key={index}><HighlightedText text={part.text} highlight={searchQuery} /></em>;
            case 'link': return <a href={part.text} key={index} target="_blank" rel="noopener noreferrer" className="text-sky-500 hover:underline"><HighlightedText text={part.text} highlight={searchQuery} /></a>;
            case 'mention': return <span key={index} className="text-sky-500 font-semibold"><HighlightedText text={part.text} highlight={searchQuery} /></span>;
            case 'pre':
            case 'code': return <code key={index} className="bg-slate-200 dark:bg-slate-700 rounded p-1 text-sm font-mono"><HighlightedText text={part.text} highlight={searchQuery} /></code>;
            default: return <HighlightedText key={index} text={part.text} highlight={searchQuery} />;
        }
    });
};

const ReplyPreview: React.FC<{ replyToId: number, messages: Message[], onJump: (id: number) => void }> = ({ replyToId, messages, onJump }) => {
    const originalMessage = useMemo(() => messages.find(m => m.id === replyToId), [replyToId, messages]);
    
    if (!originalMessage) return null;

    return (
        <div 
            onClick={() => onJump(replyToId)}
            className="mb-1 pl-2 border-l-2 border-sky-500 cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 rounded-r p-1 transition-colors"
        >
            <p className="text-xs font-bold text-sky-600 dark:text-sky-400">{originalMessage.from || "Unknown"}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{getMessagePreview(originalMessage)}</p>
        </div>
    );
};

const MessageBubble: React.FC<{ 
    message: Message; 
    isOwnMessage: boolean; 
    showSender: boolean; 
    searchQuery?: string; 
    createBlobUrl: (uri: string) => Promise<string | undefined>;
    allMessages: Message[];
    onJumpToMessage: (id: number) => void;
}> = ({ message, isOwnMessage, showSender, searchQuery, createBlobUrl, allMessages, onJumpToMessage }) => { 
    const bubbleColor = isOwnMessage ? `bg-sky-100 dark:bg-sky-800/60` : 'bg-white dark:bg-slate-700'; 
    const senderColor = useMemo(() => { const name = message.from || ''; let hash = 0; for (let i = 0; i < name.length; i++) { hash = name.charCodeAt(i) + ((hash << 5) - hash); } const colors = ['text-red-500', 'text-blue-500', 'text-green-500', 'text-purple-500', 'text-orange-500', 'text-pink-500']; return colors[Math.abs(hash) % colors.length]; }, [message.from]); 

    return (
        <div id={`message-${message.id}`} className={`group relative flex flex-col max-w-lg shadow-sm rounded-lg px-3 py-2 ${bubbleColor} ${isOwnMessage ? 'self-end' : 'self-start'}`}> 
            {!isOwnMessage && showSender && (<p className={`text-sm font-bold mb-1 ${senderColor}`}>{message.from}</p>)} 
            
            {message.reply_to_message_id && (
                <ReplyPreview replyToId={message.reply_to_message_id} messages={allMessages} onJump={onJumpToMessage} />
            )}

            {message.photo && <LazyMedia uri={message.photo} createBlobUrl={createBlobUrl} isVideo={false} className="max-w-xs sm:max-w-sm max-h-80 rounded-lg mb-1" />} 
            {message.video_file && <LazyMedia uri={message.video_file} createBlobUrl={createBlobUrl} isVideo={true} className="max-w-xs sm:max-w-sm max-h-80 rounded-lg mb-1" />} 
            
            {message.sticker_emoji && <div className="text-6xl text-center my-2">{message.sticker_emoji}</div>}
            
            <div className={`whitespace-pre-wrap leading-relaxed text-slate-800 dark:text-slate-200 ${(message.photo || message.video_file) ? 'mt-1' : ''}`}>
                {renderTelegramText(message.text, searchQuery || '')}
            </div> 
            
            <div className="self-end text-xs text-slate-400 dark:text-slate-500 mt-1 flex items-center gap-1">
                {message.forwarded_from && <span>Forwarded from {message.forwarded_from} • </span>}
                {formatTimestamp(new Date(message.date).getTime())}
            </div>
        </div>
    );
};

// ... Calendar and Settings Modals ...

const CalendarPopover: React.FC<{ isOpen: boolean; onClose: () => void; onDateSelect: (date: Date) => void; activeDays: Set<string>; }> = ({ isOpen, onClose, onDateSelect, activeDays }) => { const [viewDate, setViewDate] = useState(new Date()); const [viewMode, setViewMode] = useState<'days' | 'months' | 'years'>('days'); const popoverRef = useRef<HTMLDivElement>(null); const yearsRange = useMemo(() => { const years = Array.from(activeDays).map((d: string) => parseInt(d.substring(0, 4))); if (years.length === 0) return { min: new Date().getFullYear() - 5, max: new Date().getFullYear() }; return { min: Math.min(...years), max: Math.max(...years) }; }, [activeDays]); useEffect(() => { const handleClickOutside = (event: MouseEvent) => { if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) { onClose(); }}; if (isOpen) { document.addEventListener('mousedown', handleClickOutside); } return () => document.removeEventListener('mousedown', handleClickOutside); }, [isOpen, onClose]); if (!isOpen) return null; const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]; const daysOfWeek = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"]; const { year, month } = { year: viewDate.getFullYear(), month: viewDate.getMonth() }; const renderDays = () => { const firstDayOfMonth = new Date(year, month, 1).getDay(); const daysInMonth = new Date(year, month + 1, 0).getDate(); return (<> <div className="grid grid-cols-7 gap-y-2 text-center text-sm"> {daysOfWeek.map(day => <div key={day} className="font-medium text-slate-500 dark:text-slate-400 text-xs">{day}</div>)} </div> <div className="grid grid-cols-7 gap-1 mt-2"> {Array.from({ length: firstDayOfMonth }).map((_, i) => <div key={`empty-${i}`}></div>)} {Array.from({ length: daysInMonth }).map((_, day) => { const date = new Date(year, month, day + 1); const dateString = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`; const hasMessages = activeDays.has(dateString); return (<div key={day} className="relative flex justify-center items-center"><button onClick={() => { onDateSelect(date); onClose(); }} className={`w-8 h-8 rounded-full transition-colors text-sm ${hasMessages ? 'hover:bg-sky-100 dark:hover:bg-sky-900/50 font-semibold text-slate-800 dark:text-slate-200' : 'text-slate-400 dark:text-slate-600 cursor-not-allowed'}`} disabled={!hasMessages}>{day + 1}</button>{hasMessages && <div className="absolute bottom-1 w-1 h-1 bg-sky-500 rounded-full"></div>}</div>); })} </div> </>); }; const renderMonths = () => ( <div className="grid grid-cols-4 gap-2"> {monthNames.map((name, index) => ( <button key={name} onClick={() => { setViewDate(new Date(year, index, 1)); setViewMode('days'); }} className="p-2 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-sm">{name}</button> ))} </div> ); const renderYears = () => { const startYear = yearsRange.min; const endYear = yearsRange.max; const years = Array.from({ length: endYear - startYear + 1 }, (_, i) => startYear + i); return ( <div className="grid grid-cols-4 gap-2"> {years.map(y => ( <button key={y} onClick={() => { setViewDate(new Date(y, month, 1)); setViewMode('months'); }} className="p-2 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-sm">{y}</button> ))} </div> ); }; return ( <div ref={popoverRef} className="absolute top-16 right-4 z-30 bg-white dark:bg-slate-800 rounded-lg shadow-2xl p-4 border border-slate-200 dark:border-slate-700 w-72"> <div className="flex justify-between items-center mb-4"> <button onClick={() => { if (viewMode === 'days') setViewDate(new Date(year, month - 1, 1)); if (viewMode === 'months') setViewDate(new Date(year - 1, month, 1)); if (viewMode === 'years') setViewDate(new Date(year - 10, month, 1)); }} className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700"><ChevronLeftIcon className="w-5 h-5" /></button> <div className="flex gap-1 font-bold text-slate-800 dark:text-slate-200"> {viewMode === 'days' && <button className="hover:underline" onClick={() => setViewMode('months')}>{monthNames[month]}</button>} <button className="hover:underline" onClick={() => setViewMode('years')}>{year}</button> </div> <button onClick={() => { if (viewMode === 'days') setViewDate(new Date(year, month + 1, 1)); if (viewMode === 'months') setViewDate(new Date(year + 1, month, 1)); if (viewMode === 'years') setViewDate(new Date(year + 10, month, 1)); }} className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700"><ChevronRightIcon className="w-5 h-5" /></button> </div> {viewMode === 'days' && renderDays()} {viewMode === 'months' && renderMonths()} {viewMode === 'years' && renderYears()} </div> );};

interface Participant {
    name: string;
    id: string;
}

const SettingsModal: React.FC<{ isOpen: boolean; onClose: () => void; currentParticipants: Set<Participant>; currentRightAlignedId: string; onRightAlignmentChange: (id: string) => void; }> = ({ isOpen, onClose, currentParticipants, currentRightAlignedId, onRightAlignmentChange }) => {
    if (!isOpen) return null;
    const participantsList: Participant[] = Array.from(currentParticipants);
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-30" onClick={onClose}>
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl p-6 w-full max-w-md mx-4" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200">Settings</h2>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700"><CloseIcon className="w-6 h-6 text-slate-500 dark:text-slate-400" /></button>
                </div>
                <div className="space-y-6">
                    <div>
                        <h3 className="font-semibold text-slate-800 dark:text-slate-200 mb-2">Who are you?</h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">Select yourself to align your messages to the right.</p>
                        <div className="space-y-2 max-h-60 overflow-y-auto pr-2 border border-slate-200 dark:border-slate-700 rounded-lg p-2">
                            {participantsList.map((p: Participant) => (
                                <div key={p.id} onClick={() => onRightAlignmentChange(p.id)} className={`p-3 border rounded-lg cursor-pointer transition-all flex items-center gap-3 ${currentRightAlignedId === p.id ? 'border-sky-500 bg-sky-50 dark:bg-sky-900/20 ring-2 ring-sky-200 dark:border-sky-500' : 'border-slate-300 dark:border-slate-600 hover:border-slate-400 dark:hover:border-slate-500'}`}>
                                    <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center font-bold text-slate-600 dark:text-slate-300">{p.name.charAt(0)}</div>
                                    <div className="flex-grow min-w-0"><p className="font-semibold text-slate-800 dark:text-slate-200 truncate">{p.name}</p><p className="text-xs text-slate-500 dark:text-slate-400 truncate">{p.id}</p></div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

interface MediaItem { uri: string; type: 'photo' | 'video'; messageId: number; timestamp: number; }

const MediaGallery: React.FC<{ chat: Chat | undefined, onJump: (id: number) => void, createBlobUrl: (uri: string) => Promise<string | undefined> }> = ({ chat, onJump, createBlobUrl }) => {
    const [filter, setFilter] = useState<'all' | 'photo' | 'video'>('all');
    
    const mediaItems = useMemo(() => {
        if (!chat) return [];
        const items: MediaItem[] = [];
        chat.messages.forEach(msg => {
            if (msg.photo) items.push({ uri: msg.photo, type: 'photo', messageId: msg.id, timestamp: new Date(msg.date).getTime() });
            if (msg.video_file) items.push({ uri: msg.video_file, type: 'video', messageId: msg.id, timestamp: new Date(msg.date).getTime() });
        });
        return items.sort((a, b) => b.timestamp - a.timestamp);
    }, [chat]);

    const filteredItems = useMemo(() => mediaItems.filter(i => filter === 'all' || i.type === filter), [mediaItems, filter]);

    return (
        <div className="h-full flex flex-col bg-slate-50 dark:bg-slate-900">
             <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex gap-2">
                {['all', 'photo', 'video'].map(f => (
                    <button 
                        key={f}
                        onClick={() => setFilter(f as any)}
                        className={`px-4 py-1 rounded-full text-sm font-medium capitalize ${filter === f ? 'bg-sky-500 text-white' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300'}`}
                    >
                        {f}s
                    </button>
                ))}
            </div>
            <div className="flex-grow overflow-y-auto p-4">
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                    {filteredItems.map(item => (
                        <div key={item.messageId} onClick={() => onJump(item.messageId)} className="aspect-square relative group cursor-pointer bg-slate-200 dark:bg-slate-800 rounded overflow-hidden">
                            <LazyMedia uri={item.uri} createBlobUrl={createBlobUrl} isVideo={item.type === 'video'} className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold">
                                View in Chat
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

// --- Main Viewer Component ---
interface TelegramChatViewerProps { chats: Chat[]; ownerId: string; createBlobUrl: (uri: string) => Promise<string | undefined>; theme: Theme; onThemeToggle: () => void; onReset: () => void; }
const TelegramChatViewer: React.FC<TelegramChatViewerProps> = ({ chats, ownerId, createBlobUrl, theme, onThemeToggle, onReset }) => {
    const [selectedChatId, setSelectedChatId] = useState<number | null>(chats[0]?.id || null);
    const [searchQuery, setSearchQuery] = useState('');
    const [chatSearchQuery, setChatSearchQuery] = useState('');
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [customAvatars, setCustomAvatars] = useState<Record<string, string>>({});
    const [isSidebarVisible, setIsSidebarVisible] = useState(true);
    const [activeTab, setActiveTab] = useState<'messages' | 'media'>('messages');
    const [isCalendarOpen, setIsCalendarOpen] = useState(false);
    
    // Identity State
    const [rightAlignedId, setRightAlignedId] = useState<string>(ownerId);
    
    useEffect(() => { setRightAlignedId(ownerId); }, [ownerId]);

    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const avatarInputRef = useRef<HTMLInputElement>(null);
    const userForAvatarChange = useRef<string | null>(null);

    const selectedChat = useMemo(() => chats.find(c => c.id === selectedChatId), [selectedChatId, chats]);
    const isSearching = useMemo(() => searchQuery.trim().length > 0, [searchQuery]);
    
    const filteredChats = useMemo(() => {
        if (!chatSearchQuery.trim()) return chats;
        return chats.filter(chat => chat.name.toLowerCase().includes(chatSearchQuery.toLowerCase()));
    }, [chats, chatSearchQuery]);

    const currentChatParticipants = useMemo(() => {
        const participants = new Set<Participant>();
        if (selectedChat) {
            selectedChat.messages.forEach(msg => {
                if (msg.from && msg.from_id) {
                    participants.add({ name: msg.from, id: msg.from_id });
                }
            });
        }
        // Deduplicate by ID
        const unique = new Map<string, Participant>();
        participants.forEach(p => unique.set(p.id, p));
        return new Set(unique.values());
    }, [selectedChat]);

    const activeDays = useMemo(() => { const days = new Set<string>(); selectedChat?.messages.forEach(msg => { const date = new Date(msg.date); days.add(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`); }); return days; }, [selectedChat]);

    const { messageGroups, searchResultCount } = useMemo(() => { 
        if(!selectedChat) return {messageGroups:[], searchResultCount: null}; 
        const sourceMessages = selectedChat.messages; 
        const filteredMessages = isSearching ? sourceMessages.filter(msg => { const text = getMessagePreview(msg); return text && text.toLowerCase().includes(searchQuery.toLowerCase());}) : sourceMessages; 
        const resultCount = isSearching ? filteredMessages.length : null; 
        const groups: Message[][] = []; 
        if (filteredMessages.length > 0) { 
            let currentGroup: Message[] = [filteredMessages[0]]; 
            for (let i = 1; i < filteredMessages.length; i++) { 
                const newDate = new Date(filteredMessages[i].date).toDateString() !== new Date(filteredMessages[i-1].date).toDateString(); 
                if (!newDate) { currentGroup.push(filteredMessages[i]); } else { groups.push(currentGroup); currentGroup = [filteredMessages[i]]; } 
            } 
            groups.push(currentGroup); 
        } 
        return { messageGroups: groups, searchResultCount: resultCount }; 
    }, [selectedChat, isSearching, searchQuery]);
    
    useLayoutEffect(() => { const container = scrollContainerRef.current; if(container && !isSearching) { container.scrollTop = container.scrollHeight; } }, [selectedChat?.id, messageGroups.length]);

    const handleSelectChat = (chatId: number) => { setSelectedChatId(chatId); setSearchQuery(''); setIsSidebarVisible(false); setActiveTab('messages'); };
    const handleAvatarChangeClick = (userName: string) => { userForAvatarChange.current = userName; avatarInputRef.current?.click(); };
    const handleAvatarFileSelected = (event: React.ChangeEvent<HTMLInputElement>) => { const file = event.target.files?.[0]; const userName = userForAvatarChange.current; if (!file || !userName) return; const reader = new FileReader(); reader.onload = (e) => { const dataUrl = e.target?.result as string; if (dataUrl) setCustomAvatars(prev => ({...prev, [userName]: dataUrl})); }; reader.readAsDataURL(file); if(event.target) event.target.value = '';};
    
    const jumpToMessage = (id: number) => {
        setActiveTab('messages');
        const element = document.getElementById(`message-${id}`);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            element.classList.add('bg-yellow-100', 'dark:bg-yellow-900/30');
            setTimeout(() => element.classList.remove('bg-yellow-100', 'dark:bg-yellow-900/30'), 2000);
        } else {
            // If virtualized or filtered, we'd need more complex logic. 
            // For now, simple scrollIntoView works for non-virtualized lists.
            alert("Message not found in current view (try clearing search)");
        }
    };

    const handleDateSelect = (date: Date) => {
        if (!selectedChat) return;
        const targetDate = date.toDateString();
        const msg = selectedChat.messages.find(m => new Date(m.date).toDateString() === targetDate);
        if (msg) jumpToMessage(msg.id);
    };

    const isGroupChat = useMemo(() => selectedChat?.type.includes('group') || selectedChat?.type.includes('channel'), [selectedChat]);

    return (
        <div className="flex w-full h-full bg-white dark:bg-slate-900 overflow-hidden relative">
            <input type="file" ref={avatarInputRef} className="hidden" accept="image/png, image/jpeg, image/gif" onChange={handleAvatarFileSelected}/>
            
            <SettingsModal 
                isOpen={isSettingsOpen} 
                onClose={() => setIsSettingsOpen(false)} 
                currentParticipants={currentChatParticipants}
                currentRightAlignedId={rightAlignedId}
                onRightAlignmentChange={setRightAlignedId}
            />

            <CalendarPopover isOpen={isCalendarOpen} onClose={() => setIsCalendarOpen(false)} onDateSelect={handleDateSelect} activeDays={activeDays} />

            <aside className={`absolute md:relative w-full md:w-1/3 lg:w-1/4 border-r border-slate-200 dark:border-slate-700 flex flex-col transition-transform duration-300 ease-in-out z-10 bg-white dark:bg-slate-800 h-full ${isSidebarVisible ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}>
                <header className="p-4 border-b border-slate-200 dark:border-slate-700 space-y-3">
                    <div>
                        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200">Your Chats</h2>
                        <p className="text-sm text-slate-500 dark:text-slate-400">{chats.length} conversations</p>
                    </div>
                    <div className="relative">
                        <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none"><SearchIcon className="w-5 h-5 text-slate-400 dark:text-slate-500" /></span>
                        <input type="text" placeholder="Search chats..." value={chatSearchQuery} onChange={(e) => setChatSearchQuery(e.target.value)} className="w-full rounded-md border border-slate-300 dark:border-slate-600 bg-slate-100 dark:bg-slate-700 py-1.5 pl-10 pr-4 text-sm text-slate-800 dark:text-slate-200 focus:bg-white dark:focus:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-sky-500 transition-all duration-300" />
                    </div>
                </header>
                <div className="flex-grow overflow-y-auto">
                    {filteredChats.length > 0 ? (
                        filteredChats.map(chat => (
                            <div key={chat.id} onClick={() => handleSelectChat(chat.id)} className={`p-3 flex items-center cursor-pointer border-l-4 transition-colors duration-200 ${selectedChatId === chat.id ? 'border-sky-500 bg-slate-100 dark:bg-slate-700/50' : 'border-transparent hover:bg-slate-50 dark:hover:bg-slate-700/30'}`}>
                                <UserAvatar name={chat.name} className="w-11 h-11 text-lg" imageUrl={customAvatars[chat.name]} onClick={(e) => { e.stopPropagation(); handleAvatarChangeClick(chat.name); }} />
                                <div className="ml-4 truncate flex-grow"><p className="font-semibold text-slate-900 dark:text-slate-100">{chat.name}</p><p className="text-sm text-slate-500 dark:text-slate-400 truncate">{getMessagePreview(chat.messages.slice(-1)[0])}</p></div>
                            </div>
                        ))
                    ) : (<div className="p-4 text-center text-slate-500 dark:text-slate-400"><p className="text-sm">{chatSearchQuery ? `No chats matching "${chatSearchQuery}"` : "No chats found."}</p></div>)}
                </div>
            </aside>

            <main className="flex flex-col w-full h-full">
                {selectedChat ? (
                    <>
                        <header className="p-3 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between shadow-sm gap-4 bg-white dark:bg-slate-800">
                           <div className="flex items-center min-w-0">
                                <button onClick={() => setIsSidebarVisible(true)} className="md:hidden p-2 mr-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700"><ArrowLeftIcon className="w-5 h-5 text-slate-600 dark:text-slate-300" /></button>
                                <UserAvatar name={selectedChat.name} className="w-11 h-11 text-lg" imageUrl={customAvatars[selectedChat.name]} onClick={(e) => { e.stopPropagation(); handleAvatarChangeClick(selectedChat.name); }}/>
                                <div className="ml-4 truncate"><h3 className="text-xl font-bold text-slate-800 dark:text-slate-200 truncate">{selectedChat.name}</h3></div>
                           </div>
                           <div className="flex-shrink-0 flex items-center gap-2">
                               <div className="relative"><span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none"><SearchIcon className="w-5 h-5 text-slate-400 dark:text-slate-500" /></span><input type="text" placeholder="Search messages..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full max-w-[120px] sm:max-w-[200px] rounded-full border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 py-1.5 pl-10 pr-8 text-sm text-slate-800 dark:text-slate-200 focus:bg-white dark:focus:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-sky-500 transition-all duration-300" />{isSearching && (<button onClick={() => setSearchQuery('')} className="absolute inset-y-0 right-0 flex items-center pr-2 group"><XCircleIcon className="w-5 h-5 text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-colors" /></button>)}</div>
                               <button onClick={() => setIsCalendarOpen(o => !o)} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"><CalendarDaysIcon className="w-6 h-6 text-slate-600 dark:text-slate-300" /></button>
                               <button onClick={onThemeToggle} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">{theme === 'light' ? <MoonIcon className="w-6 h-6 text-slate-600" /> : <SunIcon className="w-6 h-6 text-yellow-400" />}</button>
                               <button onClick={() => setIsSettingsOpen(true)} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"><SettingsIcon className="w-6 h-6 text-slate-600 dark:text-slate-300" /></button>
                               <button onClick={onReset} className="px-4 py-2 bg-sky-500 text-white text-sm font-semibold rounded-lg hover:bg-sky-600 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500">Process Another</button>
                           </div>
                        </header>

                        <div className="flex-shrink-0 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 flex items-center gap-4">
                            <button onClick={() => setActiveTab('messages')} className={`py-3 text-sm font-semibold border-b-2 transition-colors ${activeTab === 'messages' ? 'border-sky-500 text-sky-600' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'}`}>Messages</button>
                            <button onClick={() => setActiveTab('media')} className={`py-3 text-sm font-semibold border-b-2 transition-colors ${activeTab === 'media' ? 'border-sky-500 text-sky-600' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'}`}>Media</button>
                        </div>
                        
                        <div className="flex-grow overflow-hidden relative">
                            {activeTab === 'messages' ? (
                                <div ref={scrollContainerRef} className="h-full p-4 md:p-6 overflow-y-auto bg-slate-100 dark:bg-slate-800 bg-[url('https://uploads-ssl.webflow.com/5a979516ab15960001a2d59a/5ab17498c368380001b8d787_seamless-pattern-with-telegram-l-c63e29f0302489a24d2621742417a58a.png')] dark:bg-[url('https://uploads-ssl.webflow.com/5a979516ab15960001a2d59a/5ab17498c368380001b8d787_seamless-pattern-with-telegram-l-c63e29f0302489a24d2621742417a58a.png')] bg-repeat bg-center" style={{'--tw-bg-opacity': theme === 'dark' ? 0.05 : 0.1} as React.CSSProperties}>
                                    <div className="flex flex-col gap-4 max-w-4xl mx-auto">{isSearching && (<div className="text-center my-2 sticky top-2 z-10"><p className="text-sm text-slate-500 dark:text-slate-400 bg-slate-200/70 dark:bg-slate-700/70 backdrop-blur-sm inline-block px-3 py-1 rounded-full">{searchResultCount === 0 ? 'No messages found.' : `Found ${searchResultCount} message${searchResultCount !== 1 ? 's' : ''}.`}</p></div>)}{messageGroups.map((group, groupIndex) => { const firstMessage = group[0]; if (!firstMessage) return null; const dateStr = formatDateSeparator(new Date(firstMessage.date).getTime()); return (<React.Fragment key={`${firstMessage.date_unixtime}-${groupIndex}`}><div className="flex justify-center my-4 sticky top-2 z-10"><span className="bg-slate-200 dark:bg-slate-900/80 backdrop-blur-sm text-slate-600 dark:text-slate-300 text-xs font-semibold px-3 py-1 rounded-full shadow-sm">{dateStr}</span></div><div className="flex flex-col gap-1">{group.map((message, messageIndex) => { const prevMessage = messageIndex > 0 ? group[messageIndex - 1] : null; const showSender = isGroupChat && (!prevMessage || prevMessage.from_id !== message.from_id); return (<MessageBubble key={message.id} message={message} isOwnMessage={message.from_id === rightAlignedId} showSender={showSender} searchQuery={isSearching ? searchQuery : undefined} createBlobUrl={createBlobUrl} allMessages={selectedChat.messages} onJumpToMessage={jumpToMessage} />) })}</div></React.Fragment>);})}</div>
                                </div>
                            ) : (
                                <MediaGallery chat={selectedChat} onJump={jumpToMessage} createBlobUrl={createBlobUrl} />
                            )}
                        </div>
                    </>
                ) : (
                    <div className="hidden md:flex flex-grow items-center justify-center text-center text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-900">
                       <div><h2 className="text-2xl font-semibold">Welcome to your Telegram archive</h2><p className="mt-2">Select a conversation to begin.</p></div>
                    </div>
                )}
            </main>
        </div>
    );
};
export default TelegramChatViewer;
