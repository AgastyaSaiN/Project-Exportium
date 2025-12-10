
import React, { useState, useMemo, useEffect, useRef, useLayoutEffect, useCallback } from 'react';
import { Chat, Message, Photo, Video, Audio } from './types';
import { Platform } from '../../../constants';

const MESSAGES_PER_PAGE = 50;
type Theme = 'light' | 'dark';
type MediaItem = (Photo | Video) & { type: 'photo' | 'video', sender: string | null, timestamp_ms: number, messageId: string, blobUrl?: string };

// --- Custom Hooks ---

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);
  return debouncedValue;
}


// --- Icon Components ---

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
const MicrophoneIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" /></svg>);

const SpinnerIcon: React.FC<{className?: string}> = ({className}) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className={className}>
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);

const ChatBubbleIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 017.5 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 017.5 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 017.5 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.76 9.76 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.455.09-.91.09-1.365 0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
    </svg>
);

// --- Helper Functions ---
const formatTimestamp = (timestamp_ms: number) => new Date(timestamp_ms).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
const formatDateSeparator = (timestamp_ms: number) => { const date = new Date(timestamp_ms); const today = new Date(); const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1); if (date.toDateString() === today.toDateString()) return 'Today'; if (date.toDateString() === yesterday.toDateString()) return 'Yesterday'; return date.toLocaleDateString([], { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });};
const THEMES: Record<string, { name: string, gradient: string, ring: string }> = { default: { name: 'Default', gradient: 'bg-gradient-to-br from-emerald-500 to-green-600', ring: 'ring-emerald-500' }, ocean: { name: 'Ocean', gradient: 'bg-gradient-to-br from-blue-500 to-cyan-400', ring: 'ring-blue-500' }, sunset: { name: 'Sunset', gradient: 'bg-gradient-to-br from-amber-500 to-orange-600', ring: 'ring-amber-500' }, amethyst: { name: 'Amethyst', gradient: 'bg-gradient-to-br from-purple-500 to-indigo-600', ring: 'ring-purple-500' }};

// --- Sub-components ---
const LoadingBar: React.FC<{ isLoading: boolean }> = ({ isLoading }) => (
    <div className={`fixed top-0 left-0 right-0 h-0.5 z-50 ${isLoading ? 'opacity-100' : 'opacity-0'} transition-opacity duration-300`}>
        <div className="relative w-full h-full bg-green-500/20 overflow-hidden">
            <div className="absolute top-0 left-0 h-full w-full bg-green-500 animate-[loading-bar_2s_linear_infinite]"></div>
        </div>
    </div>
);

const JumpToDateLoader: React.FC = () => (
    <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm flex flex-col items-center justify-center z-40">
        <SpinnerIcon className="w-16 h-16 text-white animate-spin" />
        <p className="mt-4 text-lg font-semibold text-white">Jumping to date...</p>
    </div>
);

const HighlightedText: React.FC<{ text: string; highlight: string }> = ({ text, highlight }) => { if (!highlight.trim()) { return <>{text}</>; } const regex = new RegExp(`(${highlight.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'); const parts = text.split(regex); return (<>{parts.map((part, i) => regex.test(part) ? (<mark key={i} className="bg-yellow-200 dark:bg-yellow-500 text-slate-900 rounded px-0.5 py-0">{part}</mark>) : (part))}</>);};
const UserAvatar: React.FC<{ name: string; className?: string; imageUrl?: string | null; onClick?: (e: React.MouseEvent<HTMLDivElement>) => void; }> = React.memo(({ name, className = '', imageUrl, onClick }) => { const initial = name.charAt(0).toUpperCase(); const colors = ['bg-pink-200 text-pink-700', 'bg-blue-200 text-blue-700', 'bg-green-200 text-green-700', 'bg-purple-200 text-purple-700', 'bg-yellow-200 text-yellow-700']; const colorClass = colors[name.charCodeAt(0) % colors.length]; const content = imageUrl ? (<img src={imageUrl} alt={name} className={`rounded-full object-cover w-full h-full ${className}`} />) : (<div className={`rounded-full ${colorClass} flex items-center justify-center font-bold w-full h-full ${className}`}>{initial}</div>); return (<div className={`relative flex-shrink-0 ${onClick ? 'cursor-pointer' : ''} ${className}`} onClick={onClick}>{content}{onClick && (<div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity"><CameraIcon className="w-1/2 h-1/2 text-white" /></div>)}</div>);});
const useIntersectionObserver = (options: IntersectionObserverInit) => { const [entry, setEntry] = useState<IntersectionObserverEntry | null>(null); const observer = useRef<IntersectionObserver | null>(null); const ref = useRef(null); useEffect(() => { const node = ref.current; if (!node) return; observer.current = new IntersectionObserver(([entry]) => { if (entry.isIntersecting) { setEntry(entry); } }, options); observer.current.observe(node); return () => { if (observer.current) { observer.current.disconnect(); } }; }, [options]); return [ref, entry] as const;};
const LazyMedia: React.FC<{ uri: string, createBlobUrl: (uri: string) => Promise<string | undefined>, isVideo: boolean, className?: string, isAudio?: boolean }> = ({ uri, createBlobUrl, isVideo, isAudio, className }) => { 
    const [blobUrl, setBlobUrl] = useState<string | null>(null); 
    const [isLoading, setIsLoading] = useState(false); 
    const [ref, entry] = useIntersectionObserver({ threshold: 0.1, rootMargin: '200px' }); 
    useEffect(() => { if (entry?.isIntersecting && !blobUrl && !isLoading) { setIsLoading(true); createBlobUrl(uri).then(url => { if (url) { setBlobUrl(url); } }).finally(() => { setIsLoading(false); }); } }, [entry, uri, createBlobUrl, blobUrl, isLoading]); 
    if (blobUrl) { 
        if (isVideo) { return <video src={blobUrl} controls className={className} />; } 
        if (isAudio) { return <audio src={blobUrl} controls className="w-full h-10" /> }
        return <img src={blobUrl} alt="A photo shared in the chat" className={className} />; 
    } 
    if (isAudio) return <div ref={ref} className="w-full flex items-center justify-center bg-slate-200 dark:bg-slate-700 rounded-lg p-2"><SpinnerIcon className="w-4 h-4 text-slate-400 animate-spin" /></div>;
    const placeholderClass = isVideo ? 'aspect-video' : 'aspect-square'; 
    return (<div ref={ref} className={`${className} ${placeholderClass} bg-slate-200 dark:bg-slate-700 flex items-center justify-center`}>{isLoading ? <SpinnerIcon className="w-6 h-6 text-slate-400 animate-spin" /> : <PhotoIcon className="w-8 h-8 text-slate-400" />}</div>);
};
const MediaDisplay: React.FC<{ media: Photo | Video | Audio, isVideo: boolean, isAudio?: boolean, createBlobUrl: (uri: string) => Promise<string | undefined> }> = ({ media, isVideo, isAudio, createBlobUrl }) => (
    <LazyMedia uri={media.uri} createBlobUrl={createBlobUrl} isVideo={isVideo} isAudio={isAudio} className={isAudio ? "w-full min-w-[200px]" : "max-w-xs sm:max-w-sm max-h-80 rounded-lg"} />
);
const SystemMessageBubble: React.FC<{ message: Message }> = ({ message }) => (<div className="flex justify-center my-2"><div className="bg-blue-100/80 dark:bg-slate-700/80 backdrop-blur-sm text-slate-600 dark:text-slate-300 text-xs font-medium px-3 py-1 rounded-full shadow-sm">{message.content}</div></div>);
const MessageBubble: React.FC<{ message: Message; isOwnMessage: boolean; showSender: boolean; searchQuery?: string; theme: string; createBlobUrl: (uri: string) => Promise<string | undefined>; }> = ({ message, isOwnMessage, showSender, searchQuery, theme, createBlobUrl }) => { const themeClasses = THEMES[theme]?.gradient || THEMES.default.gradient; const bubbleColor = isOwnMessage ? `bg-emerald-100 dark:bg-emerald-900/70` : 'bg-white dark:bg-slate-700'; const senderColor = useMemo(() => { if (!message.sender_name) return ''; let hash = 0; for (let i = 0; i < message.sender_name.length; i++) { hash = message.sender_name.charCodeAt(i) + ((hash << 5) - hash); } const colors = ['text-red-500', 'text-blue-500', 'text-green-500', 'text-purple-500', 'text-orange-500', 'text-pink-500']; return colors[Math.abs(hash) % colors.length]; }, [message.sender_name]); return (<div id={`message-${message.id}`} className={`group relative flex flex-col max-w-lg shadow-sm rounded-lg px-3 py-2 ${bubbleColor} ${isOwnMessage ? 'self-end' : 'self-start'}`}> {!isOwnMessage && showSender && (<p className={`text-sm font-bold mb-1 ${senderColor}`}>{message.sender_name}</p>)} {message.photo && <MediaDisplay media={message.photo} isVideo={false} createBlobUrl={createBlobUrl} />} {message.video && <MediaDisplay media={message.video} isVideo={true} createBlobUrl={createBlobUrl} />} {message.audio && <div className="flex items-center gap-2 mb-1"><MicrophoneIcon className="w-5 h-5 text-slate-500" /><MediaDisplay media={message.audio} isVideo={false} isAudio={true} createBlobUrl={createBlobUrl} /></div>} {message.content && !message.content.startsWith('📷') && !message.content.startsWith('📹') && !message.content.startsWith('🎤') && <p className={`whitespace-pre-wrap leading-relaxed text-slate-800 dark:text-slate-200 ${(message.photo || message.video || message.audio) ? 'mt-2' : ''}`}><HighlightedText text={message.content} highlight={searchQuery || ''} /></p>} <div className="self-end text-xs text-slate-400 dark:text-slate-500 mt-1">{formatTimestamp(message.timestamp_ms)}</div></div>);};
const SettingsModal: React.FC<{ isOpen: boolean; onClose: () => void; showAvatars: boolean; onShowAvatarsChange: (show: boolean) => void; currentTheme: string; onThemeChange: (theme: string) => void; onUploadBackground: () => void; onRemoveBackground: () => void; participants: { name: string }[]; currentAlignment: string; onAlignmentChange: (name: string) => void; customAvatars: Record<string, string>; }> = ({ isOpen, onClose, showAvatars, onShowAvatarsChange, currentTheme, onThemeChange, onUploadBackground, onRemoveBackground, participants, currentAlignment, onAlignmentChange, customAvatars }) => { if (!isOpen) return null; return (<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-30" onClick={onClose}><div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl p-6 w-full max-w-md mx-4" onClick={e => e.stopPropagation()}><div className="flex justify-between items-center mb-6"><h2 className="text-xl font-bold text-slate-800 dark:text-slate-200">Display Settings</h2><button onClick={onClose} className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700"><CloseIcon className="w-6 h-6 text-slate-500 dark:text-slate-400" /></button></div><div className="space-y-6"><div><h3 className="font-semibold text-slate-800 dark:text-slate-200 mb-2">Message Alignment</h3><p className="text-sm text-slate-500 dark:text-slate-400 mb-3">Choose which user's messages appear on the right.</p><div className="space-y-2 max-h-40 overflow-y-auto pr-2">{participants.map(p => (<div key={p.name} onClick={() => onAlignmentChange(p.name)} className={`p-3 border rounded-lg cursor-pointer transition-all flex items-center gap-3 ${currentAlignment === p.name ? 'border-green-500 bg-green-50 dark:bg-green-900/20 ring-2 ring-green-200 dark:border-green-500' : 'border-slate-300 dark:border-slate-600 hover:border-slate-400 dark:hover:border-slate-500'}`}><UserAvatar name={p.name} className="w-8 h-8" imageUrl={customAvatars[p.name]} /><span className="font-semibold text-slate-800 dark:text-slate-200">{p.name}</span></div>))}</div></div><div><h3 className="font-semibold text-slate-800 dark:text-slate-200 mb-3">Appearance</h3><div className="flex items-center justify-between p-4 border border-slate-300 dark:border-slate-600 rounded-lg mb-3"><label htmlFor="showAvatars" className="font-semibold text-slate-800 dark:text-slate-200 cursor-pointer">Show Avatars</label><button id="showAvatars" role="switch" aria-checked={showAvatars} onClick={() => onShowAvatarsChange(!showAvatars)} className={`${showAvatars ? 'bg-green-500' : 'bg-slate-300 dark:bg-slate-600'} relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 dark:focus:ring-offset-slate-800`}><span className={`${showAvatars ? 'translate-x-6' : 'translate-x-1'} inline-block h-4 w-4 transform rounded-full bg-white transition-transform`} /></button></div><div className="p-4 border border-slate-300 dark:border-slate-600 rounded-lg"><h4 className="font-semibold text-slate-800 dark:text-slate-200 mb-3">Chat Background</h4><div className="flex gap-2"><button onClick={onUploadBackground} className="flex-1 px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-700 rounded-md hover:bg-slate-200 dark:hover:bg-slate-600 transition">Upload Image</button><button onClick={onRemoveBackground} className="flex-1 px-4 py-2 text-sm font-semibold text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30 rounded-md hover:bg-red-200 dark:hover:bg-red-900/50 transition">Remove</button></div></div></div><div><h3 className="font-semibold text-slate-800 dark:text-slate-200 mb-3">Chat Theme</h3><div className="flex items-center justify-around p-3 border border-slate-300 dark:border-slate-600 rounded-lg">{Object.entries(THEMES).map(([themeKey, { name, gradient, ring }]) => (<button key={themeKey} title={name} onClick={() => onThemeChange(themeKey)} className={`w-8 h-8 rounded-full ${gradient} transition-all duration-200 ${currentTheme === themeKey ? `ring-2 ring-offset-2 ${ring} dark:ring-offset-slate-800` : 'ring-0'}`} />))}</div></div></div></div></div>);};
const SearchResultsSidebar: React.FC<{ results: Message[], onJump: (messageId: string) => void, onClose: () => void, searchQuery: string }> = ({ results, onJump, onClose, searchQuery }) => ( <div className="absolute top-0 right-0 h-full w-full md:w-1/2 lg:w-1/3 bg-white/80 dark:bg-slate-800/80 backdrop-blur-md shadow-2xl border-l border-slate-200 dark:border-slate-700 flex flex-col animate-[slide-in_0.3s_ease-out]"> <style>{`@keyframes slide-in { from { transform: translateX(100%); } to { transform: translateX(0); } }`}</style> <div className="flex-shrink-0 p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center"> <h3 className="font-bold text-lg text-slate-800 dark:text-slate-200">Search Results <span className="text-sm font-normal text-slate-500">({results.length})</span></h3> <button onClick={onClose} className="p-1 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700"><CloseIcon className="w-6 h-6" /></button> </div> <div className="flex-grow overflow-y-auto"> {results.length > 0 ? ( results.map(msg => ( <div key={msg.id} onClick={() => onJump(msg.id)} className="p-4 border-b border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700/50 cursor-pointer"> <p className="font-semibold text-slate-800 dark:text-slate-200 text-sm">{msg.sender_name}</p> <p className="text-slate-600 dark:text-slate-400 text-sm truncate"><HighlightedText text={msg.content} highlight={searchQuery} /></p> <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">{new Date(msg.timestamp_ms).toLocaleString()}</p> </div> )) ) : ( <div className="p-4 text-center text-slate-500 dark:text-slate-400"> No messages found. </div> )} </div> </div>);
const CalendarPopover: React.FC<{ isOpen: boolean; onClose: () => void; onDateSelect: (date: Date) => void; activeDays: Set<string>; }> = ({ isOpen, onClose, onDateSelect, activeDays }) => { const [viewDate, setViewDate] = useState(new Date()); const [viewMode, setViewMode] = useState<'days' | 'months' | 'years'>('days'); const popoverRef = useRef<HTMLDivElement>(null); const yearsRange = useMemo(() => { const years = Array.from(activeDays).map((d: string) => parseInt(d.substring(0, 4))); if (years.length === 0) return { min: new Date().getFullYear() - 5, max: new Date().getFullYear() }; return { min: Math.min(...years), max: Math.max(...years) }; }, [activeDays]); useEffect(() => { const handleClickOutside = (event: MouseEvent) => { if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) { onClose(); }}; if (isOpen) { document.addEventListener('mousedown', handleClickOutside); } return () => document.removeEventListener('mousedown', handleClickOutside); }, [isOpen, onClose]); if (!isOpen) return null; const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]; const daysOfWeek = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"]; const { year, month } = { year: viewDate.getFullYear(), month: viewDate.getMonth() }; const renderDays = () => { const firstDayOfMonth = new Date(year, month, 1).getDay(); const daysInMonth = new Date(year, month + 1, 0).getDate(); return (<> <div className="grid grid-cols-7 gap-y-2 text-center text-sm"> {daysOfWeek.map(day => <div key={day} className="font-medium text-slate-500 dark:text-slate-400 text-xs">{day}</div>)} </div> <div className="grid grid-cols-7 gap-1 mt-2"> {Array.from({ length: firstDayOfMonth }).map((_, i) => <div key={`empty-${i}`}></div>)} {Array.from({ length: daysInMonth }).map((_, day) => { const date = new Date(year, month, day + 1); const dateString = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`; const hasMessages = activeDays.has(dateString); return (<div key={day} className="relative flex justify-center items-center"><button onClick={() => { onDateSelect(date); onClose(); }} className={`w-8 h-8 rounded-full transition-colors text-sm ${hasMessages ? 'hover:bg-green-100 dark:hover:bg-green-900/50 font-semibold text-slate-800 dark:text-slate-200' : 'text-slate-400 dark:text-slate-600 cursor-not-allowed'}`} disabled={!hasMessages}>{day + 1}</button>{hasMessages && <div className="absolute bottom-1 w-1 h-1 bg-green-500 rounded-full"></div>}</div>); })} </div> </>); }; const renderMonths = () => ( <div className="grid grid-cols-4 gap-2"> {monthNames.map((name, index) => ( <button key={name} onClick={() => { setViewDate(new Date(year, index, 1)); setViewMode('days'); }} className="p-2 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-sm">{name}</button> ))} </div> ); const renderYears = () => { const startYear = yearsRange.min; const endYear = yearsRange.max; const years = Array.from({ length: endYear - startYear + 1 }, (_, i) => startYear + i); return ( <div className="grid grid-cols-4 gap-2"> {years.map(y => ( <button key={y} onClick={() => { setViewDate(new Date(y, month, 1)); setViewMode('months'); }} className="p-2 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-sm">{y}</button> ))} </div> ); }; return ( <div ref={popoverRef} className="absolute top-16 right-4 z-30 bg-white dark:bg-slate-800 rounded-lg shadow-2xl p-4 border border-slate-200 dark:border-slate-700 w-72"> <div className="flex justify-between items-center mb-4"> <button onClick={() => { if (viewMode === 'days') setViewDate(new Date(year, month - 1, 1)); if (viewMode === 'months') setViewDate(new Date(year - 1, month, 1)); if (viewMode === 'years') setViewDate(new Date(year - 10, month, 1)); }} className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700"><ChevronLeftIcon className="w-5 h-5" /></button> <div className="flex gap-1 font-bold text-slate-800 dark:text-slate-200"> {viewMode === 'days' && <button className="hover:underline" onClick={() => setViewMode('months')}>{monthNames[month]}</button>} <button className="hover:underline" onClick={() => setViewMode('years')}>{year}</button> </div> <button onClick={() => { if (viewMode === 'days') setViewDate(new Date(year, month + 1, 1)); if (viewMode === 'months') setViewDate(new Date(year + 1, month, 1)); if (viewMode === 'years') setViewDate(new Date(year + 10, month, 1)); }} className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700"><ChevronRightIcon className="w-5 h-5" /></button> </div> {viewMode === 'days' && renderDays()} {viewMode === 'months' && renderMonths()} {viewMode === 'years' && renderYears()} </div> );};
const MediaGallery: React.FC<{ chat: Chat | null, onJumpToMessage: (item: MediaItem) => void, createBlobUrl: (uri: string) => Promise<string | undefined> }> = ({ chat, onJumpToMessage, createBlobUrl }) => { const [mediaTypeFilter, setMediaTypeFilter] = useState<'all' | 'photos' | 'videos'>('all'); const [senderFilter, setSenderFilter] = useState<string>('all'); const allMedia = useMemo((): MediaItem[] => { if (!chat?.messages) return []; return chat.messages.flatMap(msg => { const media: MediaItem[] = []; if (msg.photo) { media.push({ ...msg.photo, type: 'photo', sender: msg.sender_name, timestamp_ms: msg.timestamp_ms, messageId: msg.id }); } if (msg.video) { media.push({ ...msg.video, type: 'video', sender: msg.sender_name, timestamp_ms: msg.timestamp_ms, messageId: msg.id }); } return media; }).sort((a, b) => b.timestamp_ms - a.timestamp_ms); }, [chat]); const filteredMedia = useMemo(() => { return allMedia.filter(item => { const typeMatch = mediaTypeFilter === 'all' || (mediaTypeFilter === 'photos' && item.type === 'photo') || (mediaTypeFilter === 'videos' && item.type === 'video'); const senderMatch = senderFilter === 'all' || item.sender === senderFilter; return typeMatch && senderMatch; }); }, [allMedia, mediaTypeFilter, senderFilter]); const participants = useMemo(() => { if (!chat?.participants) return []; const names = new Set(chat.participants.map(p => p.name)); return Array.from(names); }, [chat]); return (<div className="flex flex-col h-full bg-slate-50 dark:bg-slate-900"><div className="flex-shrink-0 p-3 border-b border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm flex flex-wrap gap-4 items-center"><div className="flex items-center"><span className="text-sm font-semibold text-slate-600 dark:text-slate-400 mr-3">Type:</span><div className="inline-flex rounded-md shadow-sm" role="group"><button onClick={() => setMediaTypeFilter('all')} type="button" className={`px-4 py-1 text-sm font-medium rounded-l-lg border ${mediaTypeFilter === 'all' ? 'bg-green-500 text-white border-green-500 z-10' : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600'}`}>All</button><button onClick={() => setMediaTypeFilter('photos')} type="button" className={`px-4 py-1 text-sm font-medium border-t border-b ${mediaTypeFilter === 'photos' ? 'bg-green-500 text-white border-green-500 z-10' : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600'}`}>Photos</button><button onClick={() => setMediaTypeFilter('videos')} type="button" className={`px-4 py-1 text-sm font-medium rounded-r-lg border ${mediaTypeFilter === 'videos' ? 'bg-green-500 text-white border-green-500 z-10' : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600'}`}>Videos</button></div></div><div className="flex items-center"><label htmlFor="sender-filter" className="text-sm font-semibold text-slate-600 dark:text-slate-400 mr-3">Sender:</label><select id="sender-filter" value={senderFilter} onChange={e => setSenderFilter(e.target.value)} className="rounded-md border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 shadow-sm focus:border-green-500 focus:ring-green-500 text-sm py-1"><option value="all">All Senders</option>{participants.map(name => <option key={name} value={name}>{name}</option>)}</select></div></div><div className="flex-grow p-2 sm:p-4 overflow-y-auto">{filteredMedia.length > 0 ? (<div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-2">{filteredMedia.map(item => (<div key={item.uri} className="aspect-square bg-slate-200 dark:bg-slate-800 rounded-md overflow-hidden relative group"><LazyMedia uri={item.uri} createBlobUrl={createBlobUrl} isVideo={item.type === 'video'} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110" /><div onClick={() => onJumpToMessage(item)} className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300 cursor-pointer"><ChatBubbleIcon className="w-8 h-8"/><span className="text-xs font-bold mt-1">View in Chat</span></div></div>))}</div>) : (<div className="flex items-center justify-center h-full text-center p-4"><div><div className="mx-auto w-16 h-16 text-slate-300 dark:text-slate-600 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center"><PhotoIcon className="w-8 h-8"/></div><h3 className="mt-4 text-lg font-semibold text-slate-700 dark:text-slate-300">No Media Found</h3><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">No media matches your current filters.</p></div></div>)}</div></div>);};

// --- Main Viewer Component ---
interface WhatsAppChatViewerProps { chat: Chat; ownerName: string; onReset: () => void; platform: Platform; theme: Theme; onThemeToggle: () => void; createBlobUrl: (uri: string) => Promise<string | undefined>;}
const WhatsAppChatViewer: React.FC<WhatsAppChatViewerProps> = ({ chat, ownerName, onReset, platform, theme, onThemeToggle, createBlobUrl }) => {
    const [isLoading, setIsLoading] = useState(false);
    const [isJumpingToDate, setIsJumpingToDate] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const debouncedSearchQuery = useDebounce(searchQuery, 250);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [showAvatars, setShowAvatars] = useState(true);
    const [activeTab, setActiveTab] = useState<'messages' | 'media'>('messages');
    const [scrollToMessageId, setScrollToMessageId] = useState<string | null>(null);
    const [customAvatars, setCustomAvatars] = useState<Record<string, string>>({});
    const [chatTheme, setChatTheme] = useState<string>('default');
    const [chatBackground, setChatBackground] = useState<string | null>(null);
    const [rightAlignedUser, setRightAlignedUser] = useState<string>(ownerName);
    const [isCalendarOpen, setIsCalendarOpen] = useState(false);
    
    const [messageSlice, setMessageSlice] = useState({ start: 0, end: 0 });
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const topSentinelRef = useRef<HTMLDivElement>(null);
    const bottomSentinelRef = useRef<HTMLDivElement>(null);
    const avatarInputRef = useRef<HTMLInputElement>(null);
    const backgroundInputRef = useRef<HTMLInputElement>(null);
    const userForAvatarChange = useRef<string | null>(null);
    const scrollState = useRef({ isRestoring: false, oldScrollHeight: 0, shouldScrollToBottom: true });

    const isSearching = useMemo(() => debouncedSearchQuery.trim().length > 0, [debouncedSearchQuery]);
    const isGroupChat = useMemo(() => chat.participants.length > 1, [chat.participants]);
    
    useEffect(() => {
        if (chat?.messages.length) {
            setMessageSlice({
                start: Math.max(0, chat.messages.length - MESSAGES_PER_PAGE),
                end: chat.messages.length,
            });
            scrollState.current.shouldScrollToBottom = true;
        }
    }, [chat]);

    const activeDays = useMemo(() => { const days = new Set<string>(); chat.messages.forEach(msg => { const date = new Date(msg.timestamp_ms); days.add(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`); }); return days; }, [chat.messages]);
    const searchResults = useMemo(() => { if (!isSearching) return []; const lowercasedQuery = debouncedSearchQuery.toLowerCase(); return chat.messages.filter(msg => msg.type === 'message' && msg.content && msg.content.toLowerCase().includes(lowercasedQuery)); }, [isSearching, debouncedSearchQuery, chat.messages]);
    
    const hasOlderMessages = useMemo(() => messageSlice.start > 0, [messageSlice.start]);
    const hasNewerMessages = useMemo(() => messageSlice.end < chat.messages.length, [messageSlice.end, chat.messages.length]);

    const { messageGroups } = useMemo(() => { 
        const messagesToDisplay = chat.messages.slice(messageSlice.start, messageSlice.end);
        const groups: Message[][] = []; 
        if (messagesToDisplay.length > 0) { 
            let currentGroup: Message[] = [messagesToDisplay[0]]; 
            for (let i = 1; i < messagesToDisplay.length; i++) { 
                const newDate = new Date(messagesToDisplay[i].timestamp_ms).toDateString() !== new Date(messagesToDisplay[i-1].timestamp_ms).toDateString(); 
                if (!newDate) { 
                    currentGroup.push(messagesToDisplay[i]); 
                } else { 
                    groups.push(currentGroup); currentGroup = [messagesToDisplay[i]]; 
                } 
            } 
            groups.push(currentGroup); 
        } 
        return { messageGroups: groups }; 
    }, [chat.messages, messageSlice]);
    
    useEffect(() => { const styleId = 'whatsapp-viewer-animations'; if (document.getElementById(styleId)) return; const style = document.createElement('style'); style.id = styleId; style.innerHTML = `@keyframes loading-bar { 0% { transform: translateX(-100%); } 100% { transform: translateX(100%); } } @keyframes highlight-animation { 0% { background-color: rgba(22, 163, 74, 0.3); } 100% { background-color: transparent; } } .highlight-message > div { animation: highlight-animation 2.5s ease-out; }`; document.head.appendChild(style); }, []);
    
    useLayoutEffect(() => {
        const container = scrollContainerRef.current;
        if (!container) return;
        
        if (scrollState.current.isRestoring) {
            container.scrollTop = container.scrollHeight - scrollState.current.oldScrollHeight;
            scrollState.current.isRestoring = false;
        } else if (scrollState.current.shouldScrollToBottom) {
            container.scrollTop = container.scrollHeight;
            scrollState.current.shouldScrollToBottom = false;
        }

        if (isLoading) {
            setIsLoading(false);
        }
    }, [messageGroups]);

    useLayoutEffect(() => {
        if (!scrollToMessageId) return;
        const element = document.getElementById(`message-${scrollToMessageId}`);
        if (element) {
            scrollState.current.shouldScrollToBottom = false;
            element.scrollIntoView({ behavior: 'auto', block: 'center' });
            element.classList.add('highlight-message');
            
            const timer = setTimeout(() => {
                element.classList.remove('highlight-message');
                setScrollToMessageId(null);
                setIsJumpingToDate(false);
            }, 2500);

            return () => clearTimeout(timer);
        } else {
            setScrollToMessageId(null);
            setIsJumpingToDate(false);
        }
    }, [scrollToMessageId]);

    const loadOlderMessages = useCallback(() => { if (isLoading || !hasOlderMessages || isJumpingToDate) return; setIsLoading(true); const container = scrollContainerRef.current; if (!container) { setIsLoading(false); return; } scrollState.current = { isRestoring: true, oldScrollHeight: container.scrollHeight, shouldScrollToBottom: false }; setTimeout(() => { setMessageSlice(prev => ({ ...prev, start: Math.max(0, prev.start - MESSAGES_PER_PAGE)})); }, 100)}, [isLoading, hasOlderMessages, isJumpingToDate]);
    
    const loadNewerMessages = useCallback(() => {
        if (isLoading || !hasNewerMessages || isJumpingToDate) return;
        setIsLoading(true);
        scrollState.current.isRestoring = false; // Don't adjust scroll when adding to bottom
        setTimeout(() => {
            setMessageSlice(prev => ({
                ...prev,
                end: Math.min(chat.messages.length, prev.end + MESSAGES_PER_PAGE)
            }));
        }, 100);
    }, [isLoading, hasNewerMessages, isJumpingToDate, chat.messages.length]);

    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting) {
                    loadOlderMessages();
                }
            },
            { root: scrollContainerRef.current, threshold: 0.1 }
        );
        const sentinel = topSentinelRef.current;
        if (sentinel && hasOlderMessages) { observer.observe(sentinel); }
        return () => { if (sentinel) observer.unobserve(sentinel); };
    }, [loadOlderMessages, hasOlderMessages]);

    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting) {
                    loadNewerMessages();
                }
            },
            { root: scrollContainerRef.current, threshold: 0.1 }
        );
        const sentinel = bottomSentinelRef.current;
        if (sentinel && hasNewerMessages) {
            observer.observe(sentinel);
        }
        return () => { if (sentinel) observer.unobserve(sentinel); };
    }, [loadNewerMessages, hasNewerMessages]);

    const handleAvatarChangeClick = (userName: string) => { userForAvatarChange.current = userName; avatarInputRef.current?.click(); };
    const handleAvatarFileSelected = (event: React.ChangeEvent<HTMLInputElement>) => { const file = event.target.files?.[0]; const userName = userForAvatarChange.current; if (!file || !userName) return; const reader = new FileReader(); reader.onload = (e) => { const dataUrl = e.target?.result as string; if (dataUrl) setCustomAvatars(prev => ({...prev, [userName]: dataUrl})); }; reader.readAsDataURL(file); if(event.target) event.target.value = '';};
    const handleBackgroundChangeClick = () => { backgroundInputRef.current?.click(); };
    const handleBackgroundFileSelected = (event: React.ChangeEvent<HTMLInputElement>) => { const file = event.target.files?.[0]; if (!file) return; const reader = new FileReader(); reader.onload = (e) => { const dataUrl = e.target?.result as string; if (dataUrl) setChatBackground(dataUrl); }; reader.readAsDataURL(file); if (event.target) event.target.value = ''; };
    
    const jumpToMessageByIndex = (targetIndex: number, messageId: string) => {
        setIsJumpingToDate(true);
        scrollState.current.shouldScrollToBottom = false;

        const newStart = Math.max(0, targetIndex);
        const newEnd = Math.min(chat.messages.length, newStart + MESSAGES_PER_PAGE);

        setMessageSlice({ start: newStart, end: newEnd });
        
        setTimeout(() => setScrollToMessageId(messageId), 0);
    };

    const handleDateSelect = (date: Date) => {
        const targetTimestamp = new Date(date.setHours(0, 0, 0, 0)).getTime();
        
        let firstMessageIndex = -1;
        for(let i=0; i < chat.messages.length; i++) {
             const msgDate = new Date(chat.messages[i].timestamp_ms);
             if(msgDate.setHours(0,0,0,0) >= targetTimestamp) {
                firstMessageIndex = i;
                break;
             }
        }
        
        if (firstMessageIndex !== -1) {
            const message = chat.messages[firstMessageIndex];
            jumpToMessageByIndex(firstMessageIndex, message.id);
        } else if (chat.messages.length > 0) {
            const lastMessage = chat.messages[chat.messages.length - 1];
            jumpToMessageByIndex(chat.messages.length - 1, lastMessage.id);
        }
    };
    
    const handleJumpToMedia = useCallback((item: MediaItem) => {
        const messageIndex = chat.messages.findIndex(m => m.id === item.messageId);
        if (messageIndex === -1) return;
        setActiveTab('messages');
        jumpToMessageByIndex(messageIndex, item.messageId);
    }, [chat.messages]);

    const handleJumpFromSearch = (messageId: string) => {
        const messageIndex = chat.messages.findIndex(m => m.id === messageId);
        if (messageIndex === -1) return;
        
        setSearchQuery('');
        jumpToMessageByIndex(messageIndex, messageId);
    };
    
    const messageContainerStyle = chatBackground ? { backgroundImage: `url(${chatBackground})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {};
    const messageContainerClasses = chatBackground ? '' : "bg-slate-100 dark:bg-slate-800 bg-[url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAARMAAAARCAYAAAA/I2DMAAAABGdBTUEAALGPC/xhBQAAAAlwSFlzAAAOxAAADsQBlSsOGwAAABh0RVh0U29mdHdhcmUAcGFpbnQubmV0IDQuMS41ZEdYUgAAAIlJREFUWEft0EEKwDAIBMG4/2VzYy+BI2sppVSA8B3tTyvVAAAAAADgzhx7mYwVEQAAADBAAKsJz4h02sIQAAAAsmADe3SKpE8ZAAAAAAAAAICk2hEAAAAsyQCAw7MDAQAAgAgAABjJAIBcMwMAAADA7QAAgC9/pEaET7WBAAAAAElFTSuQmCC')]";

    return (
        <div className="flex flex-col w-screen h-screen bg-white dark:bg-slate-900">
            <LoadingBar isLoading={isLoading && !isJumpingToDate} />
            <input type="file" ref={avatarInputRef} className="hidden" accept="image/png, image/jpeg, image/gif" onChange={handleAvatarFileSelected}/>
            <input type="file" ref={backgroundInputRef} className="hidden" accept="image/png, image/jpeg, image/gif" onChange={handleBackgroundFileSelected}/>
            <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} showAvatars={showAvatars} onShowAvatarsChange={setShowAvatars} currentTheme={chatTheme} onThemeChange={setChatTheme} onUploadBackground={handleBackgroundChangeClick} onRemoveBackground={() => setChatBackground(null)} participants={chat.participants} currentAlignment={rightAlignedUser} onAlignmentChange={setRightAlignedUser} customAvatars={customAvatars} />
            <header className="flex-shrink-0 bg-white dark:bg-slate-800 p-3 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center shadow-sm z-20"><div className="flex items-center min-w-0">{showAvatars && <UserAvatar name={chat.title} className="w-11 h-11 text-lg" imageUrl={customAvatars[chat.title]} onClick={(e) => { e.stopPropagation(); handleAvatarChangeClick(chat.title); }} />}<div className="ml-3 truncate"><h1 className="text-xl font-bold text-slate-800 dark:text-slate-200 truncate">{chat.title}</h1><p className="text-sm text-slate-500 dark:text-slate-400 truncate">{chat.participants.map(p => p.name).join(', ')}</p></div></div><div className="flex items-center gap-2">{activeTab === 'messages' && <div className="relative"><span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none"><SearchIcon className="w-5 h-5 text-slate-400 dark:text-slate-500" /></span><input type="text" placeholder="Search..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full max-w-[120px] sm:max-w-[200px] rounded-full border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 py-1.5 pl-10 pr-8 text-sm text-slate-800 dark:text-slate-200 focus:bg-white dark:focus:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-green-500 transition-all duration-300" />{searchQuery && (<button onClick={() => setSearchQuery('')} className="absolute inset-y-0 right-0 flex items-center pr-2 group"><XCircleIcon className="w-5 h-5 text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-colors" /></button>)}</div>}<button onClick={() => setIsCalendarOpen(o => !o)} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors" aria-label="Jump to date"><CalendarDaysIcon className="w-6 h-6 text-slate-600 dark:text-slate-300" /></button><button onClick={onThemeToggle} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors" aria-label="Toggle theme">{theme === 'light' ? <MoonIcon className="w-6 h-6 text-slate-600" /> : <SunIcon className="w-6 h-6 text-yellow-400" />}</button><button onClick={() => setIsSettingsOpen(true)} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors" aria-label="Chat settings"><SettingsIcon className="w-6 h-6 text-slate-600 dark:text-slate-300" /></button><button onClick={onReset} className="px-4 py-2 bg-green-500 text-white text-sm font-semibold rounded-lg hover:bg-green-600 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500">Process Another</button></div></header>
            <div className="flex-shrink-0 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 flex items-center gap-4"><button onClick={() => setActiveTab('messages')} className={`py-3 text-sm font-semibold border-b-2 transition-colors ${activeTab === 'messages' ? 'border-green-500 text-green-600' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'}`}>Messages</button><button onClick={() => setActiveTab('media')} className={`py-3 text-sm font-semibold border-b-2 transition-colors ${activeTab === 'media' ? 'border-green-500 text-green-600' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'}`}>Media</button></div>
            <main className="flex-grow overflow-hidden relative">
                {isJumpingToDate && <JumpToDateLoader />}
                <CalendarPopover isOpen={isCalendarOpen} onClose={() => setIsCalendarOpen(false)} onDateSelect={handleDateSelect} activeDays={activeDays} />
                <div className={`w-full h-full transition-opacity duration-300 ${activeTab === 'messages' ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                    <div ref={scrollContainerRef} className={`h-full p-4 md:p-6 overflow-y-auto ${messageContainerClasses}`} style={messageContainerStyle}>
                        <div className="flex flex-col gap-4 max-w-4xl mx-auto">
                            {hasOlderMessages && (<div ref={topSentinelRef} className="h-1"></div>)}
                            
                            {messageGroups.map((group, groupIndex) => { const firstMessage = group[0]; if (!firstMessage) return null; const dateStr = formatDateSeparator(firstMessage.timestamp_ms); return (<React.Fragment key={`${firstMessage.timestamp_ms}-${groupIndex}`}><div className="flex justify-center my-4 sticky top-2 z-10"><span className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm text-slate-600 dark:text-slate-300 text-xs font-semibold px-3 py-1 rounded-full shadow-sm">{dateStr}</span></div><div className="flex flex-col gap-1">{group.map((message, messageIndex) => { if (message.type === 'system') return <SystemMessageBubble key={message.id} message={message} />; const prevMessage = messageIndex > 0 ? group[messageIndex - 1] : null; const showSender = isGroupChat && (!prevMessage || prevMessage.sender_name !== message.sender_name); return (<MessageBubble key={message.id} message={message} isOwnMessage={message.sender_name === rightAlignedUser} showSender={showSender} searchQuery={isSearching ? debouncedSearchQuery : undefined} theme={chatTheme} createBlobUrl={createBlobUrl} />) })}</div></React.Fragment>);})}

                            {hasNewerMessages && (<div ref={bottomSentinelRef} className="h-1"></div>)}
                        </div>
                    </div>
                </div>
                <div className={`absolute inset-0 transition-opacity duration-300 ${activeTab === 'media' ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                    <MediaGallery chat={chat} onJumpToMessage={handleJumpToMedia} createBlobUrl={createBlobUrl} />
                </div>
                {isSearching && (
                    <SearchResultsSidebar
                        results={searchResults}
                        onJump={handleJumpFromSearch}
                        onClose={() => setSearchQuery('')}
                        searchQuery={debouncedSearchQuery}
                    />
                )}
            </main>
        </div>
    );
};
export default WhatsAppChatViewer;
