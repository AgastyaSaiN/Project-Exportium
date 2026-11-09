
import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import VirtualList, { VirtualListHandle } from '../../../components/VirtualList';
import { Chat, Message, Photo, Video, Audio } from './types';
import LazyMedia from '../../../components/LazyMedia';
import type { MediaSource } from '../../../utils/mediaLoader';
import VirtualGrid from '../../../components/VirtualGrid';
import { LightboxProvider } from '../../../components/Lightbox';
import type { LightboxItem } from '../../../components/Lightbox';
import MediaTile from '../../../components/MediaTile';
import { AttachmentChip, OmittedNote } from '../../../components/Attachments';
import { StarButton, StarProvider, HitNavigator, SearchFilters, NO_FILTERS, passesFilters } from '../../../components/ChatTools';
import type { SearchFilterValue } from '../../../components/ChatTools';
import LibraryPanel from '../../../components/LibraryPanel';
import type { ToolMessage } from '../../../utils/chatData';
import { useExportPrefs } from '../../../utils/storage';
import { focusChatSearch, useChatShortcuts } from '../../../utils/useChatShortcuts';
import CalendarPopover from '../../../components/CalendarPopover';
import WallpaperPicker from '../../../components/WallpaperPicker';
import { resolveWallpaper, storableWallpaper, wallpaperStyle } from '../../../utils/wallpapers';

type ChatRow =
    | { kind: 'date'; key: string; label: string }
    | { kind: 'message'; key: string; message: Message; showSender: boolean; dayLabel: string };
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
const MicrophoneIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" /></svg>);

// --- Helper Functions ---
const formatTimestamp = (timestamp_ms: number) => new Date(timestamp_ms).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
const formatDateSeparator = (timestamp_ms: number) => { const date = new Date(timestamp_ms); const today = new Date(); const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1); if (date.toDateString() === today.toDateString()) return 'Today'; if (date.toDateString() === yesterday.toDateString()) return 'Yesterday'; return date.toLocaleDateString([], { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });};
const THEMES: Record<string, { name: string, gradient: string, ring: string }> = { default: { name: 'Default', gradient: 'bg-gradient-to-br from-emerald-500 to-green-600', ring: 'ring-emerald-500' }, ocean: { name: 'Ocean', gradient: 'bg-gradient-to-br from-blue-500 to-cyan-400', ring: 'ring-blue-500' }, sunset: { name: 'Sunset', gradient: 'bg-gradient-to-br from-amber-500 to-orange-600', ring: 'ring-amber-500' }, amethyst: { name: 'Amethyst', gradient: 'bg-gradient-to-br from-purple-500 to-indigo-600', ring: 'ring-purple-500' }};

// --- Sub-components ---
const HighlightedText: React.FC<{ text: string; highlight: string }> = ({ text, highlight }) => { if (!highlight.trim()) { return <>{text}</>; } const regex = new RegExp(`(${highlight.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'); const parts = text.split(regex); return (<>{parts.map((part, i) => regex.test(part) ? (<mark key={i} className="bg-yellow-200 dark:bg-yellow-500 text-slate-900 rounded px-0.5 py-0">{part}</mark>) : (part))}</>);};
const UserAvatar: React.FC<{ name: string; className?: string; imageUrl?: string | null; onClick?: (e: React.MouseEvent<HTMLDivElement>) => void; }> = React.memo(({ name, className = '', imageUrl, onClick }) => { const initial = name.charAt(0).toUpperCase(); const colors = ['bg-pink-200 text-pink-700', 'bg-blue-200 text-blue-700', 'bg-green-200 text-green-700', 'bg-purple-200 text-purple-700', 'bg-yellow-200 text-yellow-700']; const colorClass = colors[name.charCodeAt(0) % colors.length]; const content = imageUrl ? (<img src={imageUrl} alt={name} className={`rounded-full object-cover w-full h-full ${className}`} />) : (<div className={`rounded-full ${colorClass} flex items-center justify-center font-bold w-full h-full ${className}`}>{initial}</div>); return (<div className={`relative flex-shrink-0 ${onClick ? 'cursor-pointer' : ''} ${className}`} onClick={onClick}>{content}{onClick && (<div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity"><CameraIcon className="w-1/2 h-1/2 text-white" /></div>)}</div>);});
const MediaDisplay: React.FC<{ media: Photo | Video | Audio, isVideo: boolean, isAudio?: boolean, createBlobUrl: MediaSource }> = ({ media, isVideo, isAudio, createBlobUrl }) => (
    <LazyMedia uri={media.uri} media={createBlobUrl} kind={isAudio ? 'audio' : isVideo ? 'video' : 'image'} className={isAudio ? "w-full min-w-[200px]" : "max-w-xs sm:max-w-sm max-h-80 rounded-lg"} natural />
);
const SystemMessageBubble: React.FC<{ message: Message }> = ({ message }) => (<div className="flex justify-center my-2"><div className="bg-blue-100/80 dark:bg-slate-700/80 backdrop-blur-sm text-slate-600 dark:text-slate-300 text-xs font-medium px-3 py-1 rounded-full shadow-sm">{message.content}</div></div>);
const MessageBubble: React.FC<{ message: Message; isOwnMessage: boolean; showSender: boolean; searchQuery?: string; theme: string; createBlobUrl: MediaSource; }> = ({ message, isOwnMessage, showSender, searchQuery, theme, createBlobUrl }) => { const themed = isOwnMessage && theme !== 'default' && !!THEMES[theme]; const bubbleColor = isOwnMessage ? (themed ? THEMES[theme].gradient : `bg-emerald-100 dark:bg-emerald-900/70`) : 'bg-white dark:bg-slate-700'; const senderColor = useMemo(() => { if (!message.sender_name) return ''; let hash = 0; for (let i = 0; i < message.sender_name.length; i++) { hash = message.sender_name.charCodeAt(i) + ((hash << 5) - hash); } const colors = ['text-red-500', 'text-blue-500', 'text-green-500', 'text-purple-500', 'text-orange-500', 'text-pink-500']; return colors[Math.abs(hash) % colors.length]; }, [message.sender_name]); return (<div id={`message-${message.id}`} className={`group relative flex flex-col max-w-lg mobile:max-w-[85%] shadow-sm rounded-lg px-3 py-2 ${bubbleColor} ${isOwnMessage ? 'self-end' : 'self-start'}`}> <StarButton id={message.id} />{!isOwnMessage && showSender && (<p className={`text-sm font-bold mb-1 ${senderColor}`}>{message.sender_name}</p>)} {message.photo && <MediaDisplay media={message.photo} isVideo={false} createBlobUrl={createBlobUrl} />} {message.video && <MediaDisplay media={message.video} isVideo={true} createBlobUrl={createBlobUrl} />} {message.audio && <div className="flex items-center gap-2 mb-1"><MicrophoneIcon className="w-5 h-5 text-slate-500" /><MediaDisplay media={message.audio} isVideo={false} isAudio={true} createBlobUrl={createBlobUrl} /></div>} {message.document && <AttachmentChip uri={message.document.uri} name={message.document.name} media={createBlobUrl} />} {message.omitted && <OmittedNote kind={message.omitted} />} {message.content && !message.content.startsWith('📷') && !message.content.startsWith('📹') && !message.content.startsWith('🎤') && <p className={`whitespace-pre-wrap leading-relaxed ${themed ? 'text-white' : 'text-slate-800 dark:text-slate-200'} ${(message.photo || message.video || message.audio) ? 'mt-2' : ''}`}><HighlightedText text={message.content} highlight={searchQuery || ''} /></p>} <div className={`self-end text-xs mt-1 ${themed ? 'text-white/70' : 'text-slate-400 dark:text-slate-500'}`}>{formatTimestamp(message.timestamp_ms)}</div></div>);};
const SettingsModal: React.FC<{ isOpen: boolean; onClose: () => void; showAvatars: boolean; onShowAvatarsChange: (show: boolean) => void; currentTheme: string; onThemeChange: (theme: string) => void; wallpaper: string | null; onWallpaperChange: (value: string | null) => void; onUploadBackground: () => void; participants: { name: string }[]; currentAlignment: string; onAlignmentChange: (name: string) => void; customAvatars: Record<string, string>; }> = ({ isOpen, onClose, showAvatars, onShowAvatarsChange, currentTheme, onThemeChange, wallpaper, onWallpaperChange, onUploadBackground, participants, currentAlignment, onAlignmentChange, customAvatars }) => { if (!isOpen) return null; return (<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-30" onClick={onClose}><div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl p-6 w-full max-w-md mx-4" onClick={e => e.stopPropagation()}><div className="flex justify-between items-center mb-6"><h2 className="text-xl font-bold text-slate-800 dark:text-slate-200">Display Settings</h2><button onClick={onClose} className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700"><CloseIcon className="w-6 h-6 text-slate-500 dark:text-slate-400" /></button></div><div className="space-y-6"><div><h3 className="font-semibold text-slate-800 dark:text-slate-200 mb-2">Message Alignment</h3><p className="text-sm text-slate-500 dark:text-slate-400 mb-3">Choose which user's messages appear on the right.</p><div className="space-y-2 max-h-40 overflow-y-auto pr-2">{participants.map(p => (<div key={p.name} onClick={() => onAlignmentChange(p.name)} className={`p-3 border rounded-lg cursor-pointer transition-all flex items-center gap-3 ${currentAlignment === p.name ? 'border-green-500 bg-green-50 dark:bg-green-900/20 ring-2 ring-green-200 dark:border-green-500' : 'border-slate-300 dark:border-slate-600 hover:border-slate-400 dark:hover:border-slate-500'}`}><UserAvatar name={p.name} className="w-8 h-8" imageUrl={customAvatars[p.name]} /><span className="font-semibold text-slate-800 dark:text-slate-200">{p.name}</span></div>))}</div></div><div><h3 className="font-semibold text-slate-800 dark:text-slate-200 mb-3">Appearance</h3><div className="flex items-center justify-between p-4 border border-slate-300 dark:border-slate-600 rounded-lg mb-3"><label htmlFor="showAvatars" className="font-semibold text-slate-800 dark:text-slate-200 cursor-pointer">Show Avatars</label><button id="showAvatars" role="switch" aria-checked={showAvatars} onClick={() => onShowAvatarsChange(!showAvatars)} className={`${showAvatars ? 'bg-green-500' : 'bg-slate-300 dark:bg-slate-600'} relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 dark:focus:ring-offset-slate-800`}><span className={`${showAvatars ? 'translate-x-6' : 'translate-x-1'} inline-block h-4 w-4 transform rounded-full bg-white transition-transform`} /></button></div><div className="p-4 border border-slate-300 dark:border-slate-600 rounded-lg"><h4 className="font-semibold text-slate-800 dark:text-slate-200 mb-3">Chat Wallpaper</h4><WallpaperPicker value={wallpaper} onChange={onWallpaperChange} onUpload={onUploadBackground} ringClass="ring-green-500" tone="green" dark={document.documentElement.classList.contains('dark')} /></div></div><div><h3 className="font-semibold text-slate-800 dark:text-slate-200 mb-3">Chat Theme</h3><div className="flex items-center justify-around p-3 border border-slate-300 dark:border-slate-600 rounded-lg">{Object.entries(THEMES).map(([themeKey, { name, gradient, ring }]) => (<button key={themeKey} title={name} onClick={() => onThemeChange(themeKey)} className={`w-8 h-8 rounded-full ${gradient} transition-all duration-200 ${currentTheme === themeKey ? `ring-2 ring-offset-2 ${ring} dark:ring-offset-slate-800` : 'ring-0'}`} />))}</div></div></div></div></div>);};
const SearchResultsSidebar: React.FC<{ results: Message[], onJump: (messageId: string) => void, onClose: () => void, searchQuery: string, filters?: React.ReactNode }> = ({ results, onJump, onClose, searchQuery, filters }) => ( <div className="absolute top-0 right-0 h-full w-full md:w-1/2 lg:w-1/3 bg-white/80 dark:bg-slate-800/80 backdrop-blur-md shadow-2xl border-l border-slate-200 dark:border-slate-700 flex flex-col animate-[slide-in_0.3s_ease-out]"> <style>{`@keyframes slide-in { from { transform: translateX(100%); } to { transform: translateX(0); } }`}</style> <div className="flex-shrink-0 p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center"> <h3 className="font-bold text-lg text-slate-800 dark:text-slate-200">Search Results <span className="text-sm font-normal text-slate-500">({results.length})</span></h3> <div className="flex items-center gap-2">{filters}<button onClick={onClose} className="p-1 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700"><CloseIcon className="w-6 h-6" /></button></div> </div> <div className="flex-grow overflow-y-auto"> {results.length > 0 ? ( results.slice(0, 300).map(msg => ( <div key={msg.id} onClick={() => onJump(msg.id)} className="p-4 border-b border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700/50 cursor-pointer"> <p className="font-semibold text-slate-800 dark:text-slate-200 text-sm">{msg.sender_name}</p> <p className="text-slate-600 dark:text-slate-400 text-sm truncate"><HighlightedText text={msg.content} highlight={searchQuery} /></p> <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">{new Date(msg.timestamp_ms).toLocaleString()}</p> </div> )) ) : ( <div className="p-4 text-center text-slate-500 dark:text-slate-400"> No messages found. </div> )} </div> </div>);
interface GalleryFilters { type: 'all' | 'photos' | 'videos'; sender: string; }
const MediaGallery: React.FC<{ chat: Chat | null, onJumpToMessage: (item: MediaItem) => void, createBlobUrl: MediaSource, filters: GalleryFilters, onFiltersChange: (next: GalleryFilters) => void, scrollMemory: { current: number } }> = ({ chat, onJumpToMessage, createBlobUrl, filters, onFiltersChange, scrollMemory }) => { const mediaTypeFilter = filters.type; const senderFilter = filters.sender; const setMediaTypeFilter = (type: GalleryFilters['type']) => { scrollMemory.current = 0; onFiltersChange({ ...filters, type }); }; const setSenderFilter = (sender: string) => { scrollMemory.current = 0; onFiltersChange({ ...filters, sender }); }; const allMedia = useMemo((): MediaItem[] => { if (!chat?.messages) return []; return chat.messages.flatMap(msg => { const media: MediaItem[] = []; if (msg.photo) { media.push({ ...msg.photo, type: 'photo', sender: msg.sender_name, timestamp_ms: msg.timestamp_ms, messageId: msg.id }); } if (msg.video) { media.push({ ...msg.video, type: 'video', sender: msg.sender_name, timestamp_ms: msg.timestamp_ms, messageId: msg.id }); } return media; }).sort((a, b) => b.timestamp_ms - a.timestamp_ms); }, [chat]); const filteredMedia = useMemo(() => { return allMedia.filter(item => { const typeMatch = mediaTypeFilter === 'all' || (mediaTypeFilter === 'photos' && item.type === 'photo') || (mediaTypeFilter === 'videos' && item.type === 'video'); const senderMatch = senderFilter === 'all' || item.sender === senderFilter; return typeMatch && senderMatch; }); }, [allMedia, mediaTypeFilter, senderFilter]); const participants = useMemo(() => { if (!chat?.participants) return []; const names = new Set(chat.participants.map(p => p.name)); return Array.from(names); }, [chat]); const galleryItems: LightboxItem[] = filteredMedia.map(item => ({ uri: item.uri, kind: item.type === 'video' ? 'video' : 'image', sender: item.sender, timestamp: item.timestamp_ms, ref: item })); return (<LightboxProvider items={galleryItems} media={createBlobUrl} onShowInChat={(item) => onJumpToMessage(item.ref as MediaItem)}><div className="flex flex-col h-full bg-slate-50 dark:bg-slate-900"><div className="flex-shrink-0 p-3 border-b border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm flex flex-wrap gap-4 items-center"><div className="flex items-center"><span className="text-sm font-semibold text-slate-600 dark:text-slate-400 mr-3">Type:</span><div className="inline-flex rounded-md shadow-sm" role="group"><button onClick={() => setMediaTypeFilter('all')} type="button" className={`px-4 py-1 text-sm font-medium rounded-l-lg border ${mediaTypeFilter === 'all' ? 'bg-green-500 text-white border-green-500 z-10' : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600'}`}>All</button><button onClick={() => setMediaTypeFilter('photos')} type="button" className={`px-4 py-1 text-sm font-medium border-t border-b ${mediaTypeFilter === 'photos' ? 'bg-green-500 text-white border-green-500 z-10' : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600'}`}>Photos</button><button onClick={() => setMediaTypeFilter('videos')} type="button" className={`px-4 py-1 text-sm font-medium rounded-r-lg border ${mediaTypeFilter === 'videos' ? 'bg-green-500 text-white border-green-500 z-10' : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600'}`}>Videos</button></div></div><div className="flex items-center"><label htmlFor="sender-filter" className="text-sm font-semibold text-slate-600 dark:text-slate-400 mr-3">Sender:</label><select id="sender-filter" value={senderFilter} onChange={e => setSenderFilter(e.target.value)} className="rounded-md border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 shadow-sm focus:border-green-500 focus:ring-green-500 text-sm py-1"><option value="all">All Senders</option>{participants.map(name => <option key={name} value={name}>{name}</option>)}</select></div></div><div className="flex-grow min-h-0 p-2 sm:p-4">{filteredMedia.length > 0 ? (<VirtualGrid
                        className="h-full"
                        initialScrollTop={scrollMemory.current}
                        onScrollTopChange={(scrollTop) => { scrollMemory.current = scrollTop; }}
                        count={filteredMedia.length}
                        getCellKey={(index) => `${filteredMedia[index].messageId}-${filteredMedia[index].uri}`}
                        renderCell={(index) => {
                            const item = filteredMedia[index];
                            return <MediaTile uri={item.uri} kind={item.type === 'video' ? 'video' : 'image'} media={createBlobUrl} onShowInChat={() => onJumpToMessage(item)} />;
                        }}
                    />) : (<div className="flex items-center justify-center h-full text-center p-4"><div><div className="mx-auto w-16 h-16 text-slate-300 dark:text-slate-600 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center"><PhotoIcon className="w-8 h-8"/></div><h3 className="mt-4 text-lg font-semibold text-slate-700 dark:text-slate-300">No Media Found</h3><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">No media matches your current filters.</p></div></div>)}</div></div></LightboxProvider>);};

// --- Main Viewer Component ---
interface WhatsAppChatViewerProps { chat: Chat; ownerName: string; exportKey?: string; onReset: () => void; theme: Theme; onThemeToggle: () => void; createBlobUrl: MediaSource;}
const WhatsAppChatViewer: React.FC<WhatsAppChatViewerProps> = ({ chat, ownerName, exportKey, onReset, theme, onThemeToggle, createBlobUrl }) => {
    const [prefs, updatePrefs] = useExportPrefs(exportKey);
    const chatKey = 'chat';
    const [searchQuery, setSearchQuery] = useState('');
    const debouncedSearchQuery = useDebounce(searchQuery, 250);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [showAvatars, setShowAvatars] = useState(prefs.showAvatars ?? true);
    const [activeTab, setActiveTab] = useState<'messages' | 'media' | 'library'>('messages');
    const [customAvatars, setCustomAvatars] = useState<Record<string, string>>({});
    const [chatTheme, setChatTheme] = useState<string>(prefs.chatTheme?.[chatKey] ?? 'default');
    const [chatBackground, setChatBackground] = useState<string | null>(resolveWallpaper(prefs.wallpaper?.[chatKey]));
    const [rightAlignedUser, setRightAlignedUser] = useState<string>(prefs.alignment?.[chatKey] ?? ownerName);
    const [isCalendarOpen, setIsCalendarOpen] = useState(false);
    
    const listRef = useRef<VirtualListHandle>(null);
    const [galleryFilters, setGalleryFilters] = useState<GalleryFilters>({ type: 'all', sender: 'all' });
    const galleryScroll = useRef(0);
    const avatarInputRef = useRef<HTMLInputElement>(null);
    const backgroundInputRef = useRef<HTMLInputElement>(null);
    const userForAvatarChange = useRef<string | null>(null);

    const [searchFilters, setSearchFilters] = useState<SearchFilterValue>(NO_FILTERS);
    const isSearching = useMemo(() => debouncedSearchQuery.trim().length > 0, [debouncedSearchQuery]);
    const isGroupChat = useMemo(() => chat.participants.length > 1, [chat.participants]);
    
    const activeDays = useMemo(() => { const days = new Set<string>(); chat.messages.forEach(msg => { const date = new Date(msg.timestamp_ms); days.add(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`); }); return days; }, [chat.messages]);
    const searchResults = useMemo(() => { if (!isSearching) return []; const lowercasedQuery = debouncedSearchQuery.toLowerCase(); return chat.messages.filter(msg => msg.type === 'message' && msg.content && msg.content.toLowerCase().includes(lowercasedQuery) && passesFilters(searchFilters, msg.sender_name, msg.timestamp_ms)); }, [isSearching, debouncedSearchQuery, chat.messages, searchFilters]);
    
    // One flat list of date separators and messages: the virtual list windows over all of it.
    const { rows, rowIndexByMessageId } = useMemo(() => {
        const out: ChatRow[] = [];
        const indexById = new Map<string, number>();
        let lastDay = -1;
        let dayLabel = '';
        let prev: Message | null = null;
        for (const message of chat.messages) {
            const d = new Date(message.timestamp_ms);
            const day = d.getFullYear() * 10000 + d.getMonth() * 100 + d.getDate();
            if (day !== lastDay) {
                dayLabel = formatDateSeparator(message.timestamp_ms);
                out.push({ kind: 'date', key: `date-${message.id}`, label: dayLabel });
                lastDay = day;
                prev = null;
            }
            indexById.set(message.id, out.length);
            out.push({
                kind: 'message',
                key: message.id,
                message,
                showSender: isGroupChat && (!prev || prev.sender_name !== message.sender_name),
                dayLabel,
            });
            prev = message;
        }
        return { rows: out, rowIndexByMessageId: indexById };
    }, [chat.messages, isGroupChat]);

    useEffect(() => { const styleId = 'whatsapp-viewer-animations'; if (document.getElementById(styleId)) return; const style = document.createElement('style'); style.id = styleId; style.innerHTML = `@keyframes loading-bar { 0% { transform: translateX(-100%); } 100% { transform: translateX(100%); } } @keyframes highlight-animation { 0% { background-color: rgba(22, 163, 74, 0.3); } 100% { background-color: transparent; } } .highlight-message > div { animation: highlight-animation 2.5s ease-out; }`; document.head.appendChild(style); }, []);
    
    const changeWallpaper = (value: string | null) => { setChatBackground(value); updatePrefs(p => ({ ...p, wallpaper: { ...p.wallpaper, [chatKey]: storableWallpaper(value) } })); };
    const handleAvatarChangeClick = (userName: string) => { userForAvatarChange.current = userName; avatarInputRef.current?.click(); };
    const handleAvatarFileSelected = (event: React.ChangeEvent<HTMLInputElement>) => { const file = event.target.files?.[0]; const userName = userForAvatarChange.current; if (!file || !userName) return; const reader = new FileReader(); reader.onload = (e) => { const dataUrl = e.target?.result as string; if (dataUrl) setCustomAvatars(prev => ({...prev, [userName]: dataUrl})); }; reader.readAsDataURL(file); if(event.target) event.target.value = '';};
    const handleBackgroundChangeClick = () => { backgroundInputRef.current?.click(); };
    const handleBackgroundFileSelected = (event: React.ChangeEvent<HTMLInputElement>) => { const file = event.target.files?.[0]; if (!file) return; const reader = new FileReader(); reader.onload = (e) => { const dataUrl = e.target?.result as string; if (dataUrl) changeWallpaper(dataUrl); }; reader.readAsDataURL(file); if (event.target) event.target.value = ''; };
    
    // Scrolls the message into range (it may be anywhere in a huge chat), then flashes it once it mounts.
    const jumpToMessage = useCallback((messageId: string) => {
        const rowIndex = rowIndexByMessageId.get(messageId);
        if (rowIndex === undefined) return;
        listRef.current?.scrollToIndex(rowIndex, 'center');
        let attempts = 0;
        const highlight = () => {
            const element = document.getElementById(`message-${messageId}`);
            if (!element) {
                if (++attempts < 30) requestAnimationFrame(highlight);
                return;
            }
            element.classList.add('highlight-message');
            setTimeout(() => element.classList.remove('highlight-message'), 2500);
        };
        requestAnimationFrame(highlight);
    }, [rowIndexByMessageId]);

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
            jumpToMessage(message.id);
        } else if (chat.messages.length > 0) {
            const lastMessage = chat.messages[chat.messages.length - 1];
            jumpToMessage(lastMessage.id);
        }
    };
    
    const handleJumpToMedia = useCallback((item: MediaItem) => {
        if (!rowIndexByMessageId.has(item.messageId)) return;
        setActiveTab('messages');
        jumpToMessage(item.messageId);
    }, [rowIndexByMessageId, jumpToMessage]);

    const handleJumpFromSearch = (messageId: string) => {
        if (!rowIndexByMessageId.has(messageId)) return;
        const ids = searchResults.map(m => m.id);
        setHitNav({ ids, index: Math.max(0, ids.indexOf(messageId)) });
        setSearchQuery('');
        jumpToMessage(messageId);
    };
    
    const starredIds = useMemo(() => new Set(prefs.stars?.[chatKey] ?? []), [prefs.stars]);
    const toggleStar = useCallback((id: string) => updatePrefs(p => {
        const current = new Set(p.stars?.[chatKey] ?? []);
        if (current.has(id)) current.delete(id); else current.add(id);
        return { ...p, stars: { ...p.stars, [chatKey]: Array.from(current) } };
    }), [updatePrefs]);

    const toolMessages = useMemo<ToolMessage[]>(() => chat.messages.map(m => ({
        id: m.id, sender: m.sender_name, ts: m.timestamp_ms, text: m.content,
        files: m.document ? [{ uri: m.document.uri, name: m.document.name }] : undefined,
    })), [chat.messages]);

    // After jumping to a search result in context, ↑/↓ step through the other matches.
    const [hitNav, setHitNav] = useState<{ ids: string[]; index: number } | null>(null);
    const stepHit = (delta: number) => {
        if (!hitNav) return;
        const index = Math.min(hitNav.ids.length - 1, Math.max(0, hitNav.index + delta));
        setHitNav({ ...hitNav, index });
        jumpToMessage(hitNav.ids[index]);
    };

    // Remember where the reader was, and return there next time (not while searching).
    const savedRow = !isSearching && prefs.positions?.[chatKey] ? rowIndexByMessageId.get(prefs.positions[chatKey]) : undefined;
    const rememberPosition = useCallback((rowIndex: number) => {
        if (isSearching) return;
        const row = rows[rowIndex];
        const id = row?.kind === 'message' ? row.message.id : rows[rowIndex + 1]?.kind === 'message' ? (rows[rowIndex + 1] as Extract<ChatRow, { kind: 'message' }>).message.id : undefined;
        if (id) updatePrefs(p => (p.positions?.[chatKey] === id ? p : { ...p, positions: { ...p.positions, [chatKey]: id } }));
    }, [isSearching, rows, updatePrefs]);

    useChatShortcuts({
        onFind: () => { setActiveTab('messages'); focusChatSearch(); },
        onGoToDate: () => setIsCalendarOpen(true),
        onTop: () => listRef.current?.scrollToTop(),
        onBottom: () => listRef.current?.scrollToBottom(),
        onEscape: () => { if (hitNav) { setHitNav(null); return true; } if (searchQuery) { setSearchQuery(''); return true; } return false; },
    }, activeTab === 'messages');

    // Every photo/video in the chat, oldest first: what the arrows page through from a chat bubble.
    const chatMediaItems = useMemo<LightboxItem[]>(() => {
        const items: LightboxItem[] = [];
        for (const message of chat.messages) {
            if (message.photo) items.push({ uri: message.photo.uri, kind: 'image', sender: message.sender_name, timestamp: message.timestamp_ms, ref: message.id });
            if (message.video) items.push({ uri: message.video.uri, kind: 'video', sender: message.sender_name, timestamp: message.timestamp_ms, ref: message.id });
        }
        return items;
    }, [chat.messages]);

    const messageContainerStyle = wallpaperStyle(chatBackground, { tone: 'green', dark: theme === 'dark' }) ?? {};
    const messageContainerClasses = chatBackground ? '' : "bg-slate-100 dark:bg-slate-800 bg-[url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAARMAAAARCAYAAAA/I2DMAAAABGdBTUEAALGPC/xhBQAAAAlwSFlzAAAOxAAADsQBlSsOGwAAABh0RVh0U29mdHdhcmUAcGFpbnQubmV0IDQuMS41ZEdYUgAAAIlJREFUWEft0EEKwDAIBMG4/2VzYy+BI2sppVSA8B3tTyvVAAAAAADgzhx7mYwVEQAAADBAAKsJz4h02sIQAAAAsmADe3SKpE8ZAAAAAAAAAICk2hEAAAAsyQCAw7MDAQAAgAgAABjJAIBcMwMAAADA7QAAgC9/pEaET7WBAAAAAElFTSuQmCC')]";

    // On the phone the header shows who you are talking to (like WhatsApp), never your own name or the file name.
    const isPhone = typeof document !== 'undefined' && document.documentElement.classList.contains('native-mobile');
    const others = chat.participants.map(p => p.name).filter(name => name !== rightAlignedUser);
    const headerTitle = isPhone && others.length === 1 ? others[0] : chat.title;
    const headerSubtitle = isPhone ? (others.length > 1 ? others.join(', ') : '') : chat.participants.map(p => p.name).join(', ');

    return (
        <StarProvider starred={starredIds} onToggle={toggleStar}>
        <LightboxProvider items={chatMediaItems} media={createBlobUrl} onShowInChat={(item) => { setActiveTab('messages'); jumpToMessage(item.ref as string); }}>
        <div className="flex flex-col w-screen h-screen mobile:h-[100dvh] mobile:pt-[max(env(safe-area-inset-top),28px)] bg-white dark:bg-slate-900">
            <input type="file" ref={avatarInputRef} className="hidden" accept="image/png, image/jpeg, image/gif" onChange={handleAvatarFileSelected}/>
            <input type="file" ref={backgroundInputRef} className="hidden" accept="image/png, image/jpeg, image/gif" onChange={handleBackgroundFileSelected}/>
            <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} showAvatars={showAvatars} onShowAvatarsChange={(show) => { setShowAvatars(show); updatePrefs(p => ({ ...p, showAvatars: show })); }} currentTheme={chatTheme} onThemeChange={(name) => { setChatTheme(name); updatePrefs(p => ({ ...p, chatTheme: { ...p.chatTheme, [chatKey]: name } })); }} onUploadBackground={handleBackgroundChangeClick} wallpaper={chatBackground} onWallpaperChange={changeWallpaper} participants={chat.participants} currentAlignment={rightAlignedUser} onAlignmentChange={(name) => { setRightAlignedUser(name); updatePrefs(p => ({ ...p, alignment: { ...p.alignment, [chatKey]: name } })); }} customAvatars={customAvatars} />
            <header className="flex-shrink-0 bg-white dark:bg-slate-800 p-3 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center shadow-sm z-20 mobile:flex-wrap mobile:gap-x-2 mobile:gap-y-2 mobile:px-2"><div onClick={() => { if (document.documentElement.classList.contains('native-mobile')) setActiveTab(t => (t === 'library' ? 'messages' : 'library')); }} className="flex items-center min-w-0 mobile:order-2 mobile:flex-1">{showAvatars && <UserAvatar name={headerTitle} className="w-11 h-11 text-lg" imageUrl={customAvatars[chat.title]} onClick={(e) => { e.stopPropagation(); handleAvatarChangeClick(chat.title); }} />}<div className="ml-3 truncate"><h1 className="text-xl font-bold text-slate-800 dark:text-slate-200 truncate">{headerTitle}</h1>{headerSubtitle && <p className="text-sm text-slate-500 dark:text-slate-400 truncate">{headerSubtitle}</p>}</div></div><div className="flex items-center gap-2 mobile:contents">{activeTab === 'messages' && <div className="relative mobile:order-4 mobile:basis-full"><span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none"><SearchIcon className="w-5 h-5 text-slate-400 dark:text-slate-500" /></span><input type="text" data-chat-search placeholder="Search..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full max-w-[120px] sm:max-w-[200px] mobile:max-w-none rounded-full border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 py-1.5 pl-10 pr-8 text-sm text-slate-800 dark:text-slate-200 focus:bg-white dark:focus:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-green-500 transition-all duration-300" />{searchQuery && (<button onClick={() => setSearchQuery('')} className="absolute inset-y-0 right-0 flex items-center pr-2 group"><XCircleIcon className="w-5 h-5 text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-colors" /></button>)}</div>}<button onClick={() => setIsCalendarOpen(o => !o)} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors mobile:order-3" aria-label="Jump to date"><CalendarDaysIcon className="w-6 h-6 text-slate-600 dark:text-slate-300" /></button><button onClick={onThemeToggle} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors mobile:order-3" aria-label="Toggle theme">{theme === 'light' ? <MoonIcon className="w-6 h-6 text-slate-600" /> : <SunIcon className="w-6 h-6 text-yellow-400" />}</button><button onClick={() => setIsSettingsOpen(true)} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors mobile:order-3" aria-label="Chat settings"><SettingsIcon className="w-6 h-6 text-slate-600 dark:text-slate-300" /></button><button onClick={onReset} className="px-4 py-2 bg-green-500 text-white text-sm font-semibold rounded-lg hover:bg-green-600 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 mobile:order-1 mobile:px-3"><span className="mobile:hidden">Process Another</span><span className="hidden mobile:inline">‹ Back</span></button></div></header>
            <div className="flex-shrink-0 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 flex items-center gap-4 mobile:order-last mobile:border-b-0 mobile:border-t mobile:px-0 mobile:gap-0 mobile:pb-[max(env(safe-area-inset-bottom),20px)]"><button onClick={() => setActiveTab('messages')} className={`py-3 text-sm font-semibold border-b-2 transition-colors mobile:flex-1 mobile:py-3.5 ${activeTab === 'messages' ? 'border-green-500 text-green-600' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'}`}>Messages</button><button onClick={() => setActiveTab('media')} className={`py-3 text-sm font-semibold border-b-2 transition-colors mobile:flex-1 mobile:py-3.5 ${activeTab === 'media' ? 'border-green-500 text-green-600' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'}`}>Media</button><button onClick={() => setActiveTab('library')} className={`py-3 text-sm font-semibold border-b-2 transition-colors mobile:flex-1 mobile:py-3.5 ${activeTab === 'library' ? 'border-green-500 text-green-600' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'}`}>Library{starredIds.size ? ` (${starredIds.size})` : ''}</button></div>
            <main className="flex-grow overflow-hidden relative">
                <CalendarPopover tone="green" startAt={chat.messages[chat.messages.length - 1]?.timestamp_ms} isOpen={isCalendarOpen} onClose={() => setIsCalendarOpen(false)} onDateSelect={handleDateSelect} activeDays={activeDays} />
                <div className={`w-full h-full transition-opacity duration-300 ${activeTab === 'messages' ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                    <VirtualList
                        ref={listRef}
                        className={`h-full p-4 md:p-6 mobile:p-2 ${messageContainerClasses}`}
                        style={messageContainerStyle}
                        contentClassName="max-w-4xl mx-auto"
                        count={rows.length}
                        resetKey={chat.id}
                        startIndex={savedRow ?? null}
                        onFirstVisibleChange={rememberPosition}
                        getScrubLabel={(index) => (rows[index].kind === 'date' ? rows[index].label : rows[index].dayLabel)}
                        getRowKey={(index) => rows[index].key}
                        getStickyLabel={(index) => (rows[index].kind === 'date' ? undefined : rows[index].dayLabel)}
                        estimateSize={72}
                        gap={4}
                        renderRow={(index) => {
                            const row = rows[index];
                            if (row.kind === 'date') {
                                return <div className="flex justify-center my-4"><span className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm text-slate-600 dark:text-slate-300 text-xs font-semibold px-3 py-1 rounded-full shadow-sm">{row.label}</span></div>;
                            }
                            if (row.message.type === 'system') return <SystemMessageBubble message={row.message} />;
                            return <MessageBubble message={row.message} isOwnMessage={row.message.sender_name === rightAlignedUser} showSender={row.showSender} searchQuery={isSearching ? debouncedSearchQuery : undefined} theme={chatTheme} createBlobUrl={createBlobUrl} />;
                        }}
                    />
                </div>
                <div className={`absolute inset-0 transition-opacity duration-300 ${activeTab === 'media' ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                    {activeTab === 'media' && <MediaGallery chat={chat} onJumpToMessage={handleJumpToMedia} createBlobUrl={createBlobUrl} filters={galleryFilters} onFiltersChange={setGalleryFilters} scrollMemory={galleryScroll} />}
                </div>
                <div className={`absolute inset-0 transition-opacity duration-300 ${activeTab === 'library' ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                    {activeTab === 'library' && (
                        <LibraryPanel messages={toolMessages} starred={starredIds} onToggleStar={toggleStar} media={createBlobUrl} chatTitle={chat.title} accent="bg-green-500"
                            onJump={(id) => { setActiveTab('messages'); jumpToMessage(id); }} />
                    )}
                </div>
                {hitNav && activeTab === 'messages' && (
                    <HitNavigator position={hitNav.index + 1} total={hitNav.ids.length} onPrev={() => stepHit(-1)} onNext={() => stepHit(1)} onClose={() => setHitNav(null)} />
                )}
                {isSearching && (
                    <SearchResultsSidebar
                        results={searchResults}
                        onJump={handleJumpFromSearch}
                        onClose={() => setSearchQuery('')}
                        searchQuery={debouncedSearchQuery}
                        filters={<SearchFilters senders={chat.participants.map(p => p.name)} value={searchFilters} onChange={setSearchFilters} />}
                    />
                )}
            </main>
        </div>
        </LightboxProvider>
        </StarProvider>
    );
};
export default WhatsAppChatViewer;
