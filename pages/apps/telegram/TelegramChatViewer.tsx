
import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { Chat, Message, TelegramText } from './types';
import { useDebouncedValue } from '../../../utils/useDebouncedValue';
import VirtualList, { VirtualListHandle } from '../../../components/VirtualList';
import LazyMedia from '../../../components/LazyMedia';
import type { MediaSource } from '../../../utils/mediaLoader';
import VirtualGrid from '../../../components/VirtualGrid';
import { LightboxProvider } from '../../../components/Lightbox';
import type { LightboxItem } from '../../../components/Lightbox';
import MediaTile from '../../../components/MediaTile';
import { AttachmentChip } from '../../../components/Attachments';
import { StarButton, StarProvider, HitNavigator, SearchFilters, NO_FILTERS, passesFilters } from '../../../components/ChatTools';
import type { SearchFilterValue } from '../../../components/ChatTools';
import LibraryPanel from '../../../components/LibraryPanel';
import type { ToolMessage } from '../../../utils/chatData';
import { useExportPrefs } from '../../../utils/storage';
import { focusChatSearch, useChatShortcuts } from '../../../utils/useChatShortcuts';
import GlobalSearch from '../../../components/GlobalSearch';
import type { GlobalHit, GlobalSearchFn } from '../../../components/GlobalSearch';
import CalendarPopover from '../../../components/CalendarPopover';
import WallpaperPicker from '../../../components/WallpaperPicker';
import { resolveWallpaper, storableWallpaper, wallpaperStyle } from '../../../utils/wallpapers';

type Theme = 'light' | 'dark';

// --- Icon Components ---
const ArrowLeftIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" /></svg>);
const SettingsIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => ( <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-1.007 1.11-1.226.55-.22 1.156-.22 1.706 0 .55.22 1.02.684 1.11 1.226l.08 1.485a2.5 2.5 0 011.82 2.336 2.5 2.5 0 01-.1 1.026l.42 1.696a2.5 2.5 0 01-2.22 3.097l-1.696-.42a2.5 2.5 0 01-1.026-.1 2.5 2.5 0 01-2.336-1.82l-1.485-.08a2.5 2.5 0 01-3.097-2.22l.42-1.696a2.5 2.5 0 01.1-1.026 2.5 2.5 0 011.82-2.336l1.485.08zm-2.478 8.485a.5.5 0 01.378-.85l.74-.185a2.5 2.5 0 012.336 1.82.5.5 0 01-.85.378l-.185.74a2.5 2.5 0 01-1.82-2.336zM12 15.75a3.75 3.75 0 100-7.5 3.75 3.75 0 000 7.5z" /></svg>);
const CloseIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>);
const SearchIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" /></svg>);
const XCircleIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>);
const CameraIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.776 48.776 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" /><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" /></svg>);
const SunIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" /></svg>);
const MoonIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" /></svg>);
const CalendarDaysIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0h18M-4.5 12h2.25" /><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5a.75.75 0 11-1.5 0 .75.75 0 011.5 0zM8.25 10.5a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" /></svg>);
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
    if (message.sticker_emoji || message.sticker_file) return `${message.sticker_emoji ?? ''} Sticker`.trim();
    if (message.audio_file) return '🎵 Audio';
    if (message.document_file) return `📎 ${message.file_name ?? 'File'}`;
    if (message.location_information) return '📍 Location';
    if (message.poll) return `📊 ${message.poll.question}`;
    if (message.contact_information) return '👤 Contact';
    return 'Unsupported message';
};

// --- Sub-components ---
const HighlightedText: React.FC<{ text: string; highlight: string }> = ({ text, highlight }) => { if (!highlight.trim()) { return <>{text}</>; } const regex = new RegExp(`(${highlight.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'); const parts = text.split(regex); return (<>{parts.map((part, i) => regex.test(part) ? (<mark key={i} className="bg-sky-200 dark:bg-sky-500 text-slate-900 rounded px-0.5 py-0">{part}</mark>) : (part))}</>);};
const UserAvatar: React.FC<{ name: string; className?: string; imageUrl?: string | null; onClick?: (e: React.MouseEvent<HTMLDivElement>) => void; }> = React.memo(({ name, className = '', imageUrl, onClick }) => { const initial = (name || " ").charAt(0).toUpperCase(); const colors = ['bg-pink-200 text-pink-700', 'bg-blue-200 text-blue-700', 'bg-green-200 text-green-700', 'bg-purple-200 text-purple-700', 'bg-yellow-200 text-yellow-700']; const colorClass = colors[name.charCodeAt(0) % colors.length]; const content = imageUrl ? (<img src={imageUrl} alt={name} className={`rounded-full object-cover w-full h-full ${className}`} />) : (<div className={`rounded-full ${colorClass} flex items-center justify-center font-bold w-full h-full ${className}`}>{initial}</div>); return (<div className={`relative flex-shrink-0 ${onClick ? 'cursor-pointer' : ''} ${className}`} onClick={onClick}>{content}{onClick && (<div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity"><CameraIcon className="w-1/2 h-1/2 text-white" /></div>)}</div>);});
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

const ReplyPreview: React.FC<{ replyToId: number, messageById: Map<number, Message>, onJump: (id: number) => void }> = ({ replyToId, messageById, onJump }) => {
    const originalMessage = messageById.get(replyToId);
    
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
    createBlobUrl: MediaSource;
    messageById: Map<number, Message>;
    onJumpToMessage: (id: number) => void;
}> = ({ message, isOwnMessage, showSender, searchQuery, createBlobUrl, messageById, onJumpToMessage }) => { 
    const bubbleColor = isOwnMessage ? `bg-sky-100 dark:bg-sky-800/60` : 'bg-white dark:bg-slate-700'; 
    const senderColor = useMemo(() => { const name = message.from || ''; let hash = 0; for (let i = 0; i < name.length; i++) { hash = name.charCodeAt(i) + ((hash << 5) - hash); } const colors = ['text-red-500', 'text-blue-500', 'text-green-500', 'text-purple-500', 'text-orange-500', 'text-pink-500']; return colors[Math.abs(hash) % colors.length]; }, [message.from]); 

    return (
        <div id={`message-${message.id}`} className={`group relative flex flex-col max-w-lg shadow-sm rounded-lg px-3 py-2 ${bubbleColor} ${isOwnMessage ? 'self-end' : 'self-start'}`}> 
            <StarButton id={message.id} />
            {!isOwnMessage && showSender && (<p className={`text-sm font-bold mb-1 ${senderColor}`}>{message.from}</p>)} 
            
            {message.reply_to_message_id && (
                <ReplyPreview replyToId={message.reply_to_message_id} messageById={messageById} onJump={onJumpToMessage} />
            )}

            {message.photo && <LazyMedia uri={message.photo} media={createBlobUrl} kind="image" className="max-w-xs sm:max-w-sm max-h-80 rounded-lg mb-1" natural />} 
            {message.video_file && <LazyMedia uri={message.video_file} media={createBlobUrl} kind="video" className="max-w-xs sm:max-w-sm max-h-80 rounded-lg mb-1" natural />} 
            
            {message.sticker_file
                ? <LazyMedia uri={message.sticker_file} media={createBlobUrl} kind="image" className="w-32 h-32 object-contain" natural enlargeable={false} />
                : message.sticker_emoji && <div className="text-6xl text-center my-2">{message.sticker_emoji}</div>}
            {message.voice_message && <LazyMedia uri={message.voice_message} media={createBlobUrl} kind="audio" />}
            {message.audio_file && <LazyMedia uri={message.audio_file} media={createBlobUrl} kind="audio" />}
            {message.document_file && <AttachmentChip uri={message.document_file} name={message.file_name} media={createBlobUrl} />}
            {message.location_information && (
                <p className="text-sm">📍 Location: {message.location_information.latitude.toFixed(5)}, {message.location_information.longitude.toFixed(5)}</p>
            )}
            {message.contact_information && (
                <div className="text-sm rounded-lg border border-current/20 px-3 py-2">
                    <p className="font-semibold">{[message.contact_information.first_name, message.contact_information.last_name].filter(Boolean).join(' ') || 'Contact'}</p>
                    {message.contact_information.phone_number && <p className="opacity-80">{message.contact_information.phone_number}</p>}
                </div>
            )}
            {message.poll && (
                <div className="text-sm rounded-lg border border-current/20 px-3 py-2">
                    <p className="font-semibold">📊 {message.poll.question}</p>
                    <ul className="mt-1 space-y-0.5">
                        {message.poll.answers.map((answer, index) => (
                            <li key={index} className="flex justify-between gap-4"><span>{answer.chosen ? '✓ ' : ''}{answer.text}</span><span className="opacity-70">{answer.voters}</span></li>
                        ))}
                    </ul>
                </div>
            )}
            
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


interface Participant {
    name: string;
    id: string;
}

const SettingsModal: React.FC<{ isOpen: boolean; onClose: () => void; currentParticipants: Set<Participant>; currentRightAlignedId: string; onRightAlignmentChange: (id: string) => void; wallpaper: string | null; onWallpaperChange: (value: string | null) => void; }> = ({ isOpen, onClose, currentParticipants, currentRightAlignedId, onRightAlignmentChange, wallpaper, onWallpaperChange }) => {
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
                    <div>
                        <h3 className="font-semibold text-slate-800 dark:text-slate-200 mb-2">Chat Wallpaper</h3>
                        <WallpaperPicker value={wallpaper} onChange={onWallpaperChange} ringClass="ring-sky-500" tone="sky" dark={document.documentElement.classList.contains('dark')} />
                    </div>
                </div>
            </div>
        </div>
    );
};

interface MediaItem { uri: string; type: 'photo' | 'video'; messageId: number; timestamp: number; }

interface GalleryFilters { type: 'all' | 'photo' | 'video'; }

const MediaGallery: React.FC<{ chat: Chat | undefined, onJump: (id: number) => void, createBlobUrl: MediaSource, filters: GalleryFilters, onFiltersChange: (next: GalleryFilters) => void, scrollMemory: { current: number } }> = ({ chat, onJump, createBlobUrl, filters, onFiltersChange, scrollMemory }) => {
    const filter = filters.type;
    const setFilter = (type: GalleryFilters['type']) => { scrollMemory.current = 0; onFiltersChange({ ...filters, type }); };
    
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

    const galleryItems = useMemo<LightboxItem[]>(() => filteredItems.map(item => ({ uri: item.uri, kind: item.type === 'video' ? 'video' : 'image', timestamp: item.timestamp, ref: item.messageId })), [filteredItems]);

    return (
        <LightboxProvider items={galleryItems} media={createBlobUrl} onShowInChat={(item) => onJump(item.ref as number)}>
        <div className="h-full flex flex-col bg-slate-50 dark:bg-slate-900">
             <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex gap-2">
                {['all', 'photo', 'video'].map(f => (
                    <button 
                        key={f}
                        onClick={() => setFilter(f as typeof filter)}
                        className={`px-4 py-1 rounded-full text-sm font-medium capitalize ${filter === f ? 'bg-sky-500 text-white' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300'}`}
                    >
                        {f}s
                    </button>
                ))}
            </div>
            <div className="flex-grow min-h-0 p-4">
                <VirtualGrid
                        className="h-full"
                        initialScrollTop={scrollMemory.current}
                        onScrollTopChange={(scrollTop) => { scrollMemory.current = scrollTop; }}
                        count={filteredItems.length}
                        getCellKey={(index) => `${filteredItems[index].messageId}-${filteredItems[index].uri}`}
                        renderCell={(index) => {
                            const item = filteredItems[index];
                            return <MediaTile uri={item.uri} kind={item.type === 'video' ? 'video' : 'image'} media={createBlobUrl} onShowInChat={() => onJump(item.messageId)} />;
                        }}
                    />
            </div>
        </div>
        </LightboxProvider>
    );
};

// --- Main Viewer Component ---
type ChatRow =
    | { kind: 'date'; key: string; label: string }
    | { kind: 'message'; key: string; message: Message; showSender: boolean; dayLabel: string };
interface TelegramChatViewerProps { chats: Chat[]; ownerId: string; exportKey?: string; createBlobUrl: MediaSource; theme: Theme; onThemeToggle: () => void; onReset: () => void; }
const TelegramChatViewer: React.FC<TelegramChatViewerProps> = ({ chats, ownerId, exportKey, createBlobUrl, theme, onThemeToggle, onReset }) => {
    const [prefs, updatePrefs] = useExportPrefs(exportKey);
    const [selectedChatId, setSelectedChatId] = useState<number | null>(chats[0]?.id || null);
    const [searchQuery, setSearchQuery] = useState('');
    const [chatSearchQuery, setChatSearchQuery] = useState('');
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [wallpaper, setWallpaper] = useState<string | null>(resolveWallpaper(prefs.wallpaper?.all));
    const [customAvatars, setCustomAvatars] = useState<Record<string, string>>({});
    const [isSidebarVisible, setIsSidebarVisible] = useState(true);
    const [activeTab, setActiveTab] = useState<'messages' | 'media' | 'library'>('messages');
    const [isCalendarOpen, setIsCalendarOpen] = useState(false);
    
    // Identity State
    const [rightAlignedId, setRightAlignedId] = useState<string>(prefs.alignment?.all ?? ownerId);
    
    useEffect(() => { setRightAlignedId(prefs.alignment?.all ?? ownerId); }, [ownerId]); // eslint-disable-line react-hooks/exhaustive-deps

    const listRef = useRef<VirtualListHandle>(null);
    const [galleryFilters, setGalleryFilters] = useState<GalleryFilters>({ type: 'all' });
    const galleryScroll = useRef(0);
    const avatarInputRef = useRef<HTMLInputElement>(null);
    const userForAvatarChange = useRef<string | null>(null);

    const selectedChat = useMemo(() => chats.find(c => c.id === selectedChatId), [selectedChatId, chats]);
    const debouncedSearchQuery = useDebouncedValue(searchQuery);
    const isSearching = useMemo(() => debouncedSearchQuery.trim().length > 0, [debouncedSearchQuery]);

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

    const isGroupChat = useMemo(() => selectedChat?.type.includes('group') || selectedChat?.type.includes('channel'), [selectedChat]);

    const messageById = useMemo(() => new Map((selectedChat?.messages ?? []).map(m => [m.id, m] as const)), [selectedChat]);

    // Search the whole chat, then flatten into date separators and messages for the virtual list.
    const [isGlobalSearchOpen, setIsGlobalSearchOpen] = useState(false);
    const [searchFilters, setSearchFilters] = useState<SearchFilterValue>(NO_FILTERS);
    const { rows, searchResultCount, rowIndexByMessageId, hitIds } = useMemo(() => {
        const out: ChatRow[] = [];
        const indexById = new Map<string, number>();
        if (!selectedChat) return { rows: out, searchResultCount: null, rowIndexByMessageId: indexById, hitIds: [] as string[] };
        const lowerQuery = debouncedSearchQuery.toLowerCase();
        const matched = isSearching
            ? selectedChat.messages.filter(msg => { const text = getMessagePreview(msg); return text && text.toLowerCase().includes(lowerQuery) && passesFilters(searchFilters, msg.from, new Date(msg.date).getTime()); })
            : selectedChat.messages;
        let lastDay = -1;
        let dayLabel = '';
        let prev: Message | null = null;
        for (const message of matched) {
            const d = new Date(message.date);
            const day = d.getFullYear() * 10000 + d.getMonth() * 100 + d.getDate();
            if (day !== lastDay) {
                dayLabel = formatDateSeparator(d.getTime());
                out.push({ kind: 'date', key: `date-${message.id}`, label: dayLabel });
                lastDay = day;
                prev = null;
            }
            indexById.set(String(message.id), out.length);
            out.push({ kind: 'message', key: `m-${message.id}`, message, showSender: !!isGroupChat && (!prev || prev.from_id !== message.from_id), dayLabel });
            prev = message;
        }
        return { rows: out, searchResultCount: isSearching ? matched.length : null, rowIndexByMessageId: indexById, hitIds: isSearching ? matched.map(m => String(m.id)) : ([] as string[]) };
    }, [selectedChat, isSearching, debouncedSearchQuery, isGroupChat, searchFilters]);

    const handleSelectChat = (chatId: number) => { setSelectedChatId(chatId); setSearchQuery(''); setIsSidebarVisible(false); setActiveTab('messages'); };
    const handleAvatarChangeClick = (userName: string) => { userForAvatarChange.current = userName; avatarInputRef.current?.click(); };
    const handleAvatarFileSelected = (event: React.ChangeEvent<HTMLInputElement>) => { const file = event.target.files?.[0]; const userName = userForAvatarChange.current; if (!file || !userName) return; const reader = new FileReader(); reader.onload = (e) => { const dataUrl = e.target?.result as string; if (dataUrl) setCustomAvatars(prev => ({...prev, [userName]: dataUrl})); }; reader.readAsDataURL(file); if(event.target) event.target.value = '';};
    
    const performJump = (id: number) => {
        const index = rows.findIndex(row => row.kind === 'message' && row.message.id === id);
        if (index === -1) {
            alert("Message not found in current view (try clearing search)");
            return;
        }
        // The row may be far outside the rendered window: scroll it into range, then highlight once it mounts.
        listRef.current?.scrollToIndex(index, 'center');
        let attempts = 0;
        const highlight = () => {
            const element = document.getElementById(`message-${id}`);
            if (!element) {
                if (++attempts < 30) requestAnimationFrame(highlight);
                return;
            }
            element.classList.add('bg-yellow-100', 'dark:bg-yellow-900/30');
            setTimeout(() => element.classList.remove('bg-yellow-100', 'dark:bg-yellow-900/30'), 2000);
        };
        requestAnimationFrame(highlight);
    };

    const searchAllChats = useCallback<GlobalSearchFn>(async (query, onProgress, signal) => {
        const needle = query.toLowerCase();
        const found: GlobalHit[] = [];
        for (let c = 0; c < chats.length; c++) {
            const chat = chats[c];
            onProgress(c, chats.length);
            for (let i = chat.messages.length - 1; i >= 0 && found.length < 400; i--) {
                const message = chat.messages[i];
                const text = typeof message.text === 'string' ? message.text : message.text.map(part => (typeof part === 'string' ? part : part.text)).join('');
                if (text && text.toLowerCase().includes(needle)) {
                    found.push({ chatId: String(chat.id), chatTitle: chat.name, messageId: String(message.id), sender: message.from, ts: new Date(message.date).getTime(), text });
                }
                if (i % 20000 === 0) { await new Promise(resolve => setTimeout(resolve, 0)); if (signal.aborted) return found; }
            }
            if (found.length >= 400) break;
        }
        onProgress(chats.length, chats.length);
        return found;
    }, [chats]);

    const openGlobalHit = (hit: GlobalHit) => {
        setIsGlobalSearchOpen(false);
        setSearchQuery('');
        if (String(selectedChatId) !== hit.chatId) setSelectedChatId(Number(hit.chatId));
        setPendingJump(Number(hit.messageId));
        setActiveTab('messages');
    };

    // The message list is only mounted on the Messages tab, so a jump from elsewhere waits for it.
    const [pendingJump, setPendingJump] = useState<number | null>(null);
    const jumpToMessage = (id: number) => {
        if (activeTab === 'messages' && !isSearching) performJump(id);
        else { setPendingJump(id); setActiveTab('messages'); }
    };
    useEffect(() => {
        // Wait for the message to be in the list: after opening another chat it is not there at first.
        if (pendingJump === null || activeTab !== 'messages' || isSearching || !rowIndexByMessageId.has(String(pendingJump))) return;
        const frame = requestAnimationFrame(() => { performJump(pendingJump); setPendingJump(null); });
        return () => cancelAnimationFrame(frame);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pendingJump, activeTab, isSearching, rows]);

    // Clicking a search result goes to it in context; ↑/↓ then step through the other matches.
    const [hitNav, setHitNav] = useState<{ ids: string[]; index: number } | null>(null);
    const handleJumpFromSearch = (id: number) => {
        setHitNav({ ids: hitIds, index: Math.max(0, hitIds.indexOf(String(id))) });
        setSearchQuery('');
        setPendingJump(id);
    };
    const stepHit = (delta: number) => {
        if (!hitNav) return;
        const index = Math.min(hitNav.ids.length - 1, Math.max(0, hitNav.index + delta));
        setHitNav({ ...hitNav, index });
        jumpToMessage(Number(hitNav.ids[index]));
    };

    const handleDateSelect = (date: Date) => {
        if (!selectedChat) return;
        const targetDate = date.toDateString();
        const msg = selectedChat.messages.find(m => new Date(m.date).toDateString() === targetDate);
        if (msg) jumpToMessage(msg.id);
    };

    const chatKey = selectedChat ? String(selectedChat.id) : '';
    const starredIds = useMemo(() => new Set(prefs.stars?.[chatKey] ?? []), [prefs.stars, chatKey]);
    const toggleStar = useCallback((id: string) => updatePrefs(p => {
        const current = new Set(p.stars?.[chatKey] ?? []);
        if (current.has(id)) current.delete(id); else current.add(id);
        return { ...p, stars: { ...p.stars, [chatKey]: Array.from(current) } };
    }), [updatePrefs, chatKey]);

    const toolMessages = useMemo<ToolMessage[]>(() => (selectedChat?.messages ?? []).map(m => {
        const parts = typeof m.text === 'string' ? [m.text] : m.text.map(part => (typeof part === 'string' ? part : [part.text, part.href].filter(Boolean).join(' ')));
        return {
            id: String(m.id), sender: m.from, ts: new Date(m.date).getTime(), text: parts.join(''),
            files: m.document_file ? [{ uri: m.document_file, name: m.file_name ?? m.document_file.split('/').pop() ?? 'file' }] : undefined,
        };
    }), [selectedChat]);

    // Remember where the reader was in each chat, and return there next time (not while searching).
    const savedRow = !isSearching && chatKey && prefs.positions?.[chatKey] ? rowIndexByMessageId.get(prefs.positions[chatKey]) : undefined;
    const rememberPosition = useCallback((rowIndex: number) => {
        if (isSearching || !chatKey) return;
        const row = rows[rowIndex];
        const next = rows[rowIndex + 1];
        const id = row?.kind === 'message' ? String(row.message.id) : next?.kind === 'message' ? String(next.message.id) : undefined;
        if (id) updatePrefs(p => (p.positions?.[chatKey] === id ? p : { ...p, positions: { ...p.positions, [chatKey]: id } }));
    }, [isSearching, rows, updatePrefs, chatKey]);

    useChatShortcuts({
        onGlobalFind: () => setIsGlobalSearchOpen(true),
        onFind: () => { setActiveTab('messages'); focusChatSearch(); },
        onGoToDate: () => setIsCalendarOpen(true),
        onTop: () => listRef.current?.scrollToTop(),
        onBottom: () => listRef.current?.scrollToBottom(),
        onEscape: () => { if (hitNav) { setHitNav(null); return true; } if (searchQuery) { setSearchQuery(''); return true; } return false; },
    }, activeTab === 'messages');

    // Every photo/video in the open chat, oldest first: what the arrows page through from a chat bubble.
    const chatMediaItems = useMemo<LightboxItem[]>(() => {
        const items: LightboxItem[] = [];
        for (const message of selectedChat?.messages ?? []) {
            const timestamp = new Date(message.date).getTime();
            if (message.photo) items.push({ uri: message.photo, kind: 'image', sender: message.from, timestamp, ref: message.id });
            if (message.video_file) items.push({ uri: message.video_file, kind: 'video', sender: message.from, timestamp, ref: message.id });
        }
        return items;
    }, [selectedChat]);

    useEffect(() => { galleryScroll.current = 0; }, [selectedChatId]);

    return (
        <StarProvider starred={starredIds} onToggle={toggleStar}>
        <LightboxProvider items={chatMediaItems} media={createBlobUrl} onShowInChat={(item) => jumpToMessage(item.ref as number)}>
        <div className="flex w-full h-full bg-white dark:bg-slate-900 overflow-hidden relative">
            <input type="file" ref={avatarInputRef} className="hidden" accept="image/png, image/jpeg, image/gif" onChange={handleAvatarFileSelected}/>
            
            <SettingsModal 
                isOpen={isSettingsOpen} 
                onClose={() => setIsSettingsOpen(false)} 
                currentParticipants={currentChatParticipants}
                currentRightAlignedId={rightAlignedId}
                wallpaper={wallpaper}
                onWallpaperChange={(value) => { setWallpaper(value); updatePrefs(p => ({ ...p, wallpaper: { ...p.wallpaper, all: storableWallpaper(value) } })); }}
                onRightAlignmentChange={(id) => { setRightAlignedId(id); updatePrefs(p => ({ ...p, alignment: { ...p.alignment, all: id } })); }}
            />

            <CalendarPopover tone="sky" startAt={selectedChat?.messages.length ? new Date(selectedChat.messages[selectedChat.messages.length - 1].date).getTime() : undefined} isOpen={isCalendarOpen} onClose={() => setIsCalendarOpen(false)} onDateSelect={handleDateSelect} activeDays={activeDays} />

            <aside className={`absolute md:relative w-full md:w-1/3 lg:w-1/4 border-r border-slate-200 dark:border-slate-700 flex flex-col transition-transform duration-300 ease-in-out z-10 bg-white dark:bg-slate-800 h-full ${isSidebarVisible ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}>
                <header className="p-4 border-b border-slate-200 dark:border-slate-700 space-y-3">
                    <div>
                        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200">Your Chats</h2>
                        <p className="text-sm text-slate-500 dark:text-slate-400">{chats.length} conversations</p>
                        <button type="button" onClick={() => setIsGlobalSearchOpen(true)} className="mt-3 w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                        <span>Search all chats</span><kbd className="text-xs opacity-60">Ctrl+Shift+F</kbd>
                    </button>
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
                               <div className="relative"><span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none"><SearchIcon className="w-5 h-5 text-slate-400 dark:text-slate-500" /></span><input type="text" data-chat-search placeholder="Search messages..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full max-w-[120px] sm:max-w-[200px] rounded-full border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 py-1.5 pl-10 pr-8 text-sm text-slate-800 dark:text-slate-200 focus:bg-white dark:focus:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-sky-500 transition-all duration-300" />{isSearching && (<button onClick={() => setSearchQuery('')} className="absolute inset-y-0 right-0 flex items-center pr-2 group"><XCircleIcon className="w-5 h-5 text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-colors" /></button>)}</div>
                               <button onClick={() => setIsCalendarOpen(o => !o)} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"><CalendarDaysIcon className="w-6 h-6 text-slate-600 dark:text-slate-300" /></button>
                               <button onClick={onThemeToggle} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">{theme === 'light' ? <MoonIcon className="w-6 h-6 text-slate-600" /> : <SunIcon className="w-6 h-6 text-yellow-400" />}</button>
                               <button onClick={() => setIsSettingsOpen(true)} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"><SettingsIcon className="w-6 h-6 text-slate-600 dark:text-slate-300" /></button>
                               <button onClick={onReset} className="px-4 py-2 bg-sky-500 text-white text-sm font-semibold rounded-lg hover:bg-sky-600 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500">Process Another</button>
                           </div>
                        </header>

                        <div className="flex-shrink-0 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 flex items-center gap-4">
                            <button onClick={() => setActiveTab('messages')} className={`py-3 text-sm font-semibold border-b-2 transition-colors ${activeTab === 'messages' ? 'border-sky-500 text-sky-600' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'}`}>Messages</button>
                            <button onClick={() => setActiveTab('media')} className={`py-3 text-sm font-semibold border-b-2 transition-colors ${activeTab === 'media' ? 'border-sky-500 text-sky-600' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'}`}>Media</button>
                            <button onClick={() => setActiveTab('library')} className={`py-3 text-sm font-semibold border-b-2 transition-colors ${activeTab === 'library' ? 'border-sky-500 text-sky-600' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'}`}>Library{starredIds.size ? ` (${starredIds.size})` : ''}</button>
                        </div>
                        
                        <div className="flex-grow overflow-hidden relative">
                            {activeTab === 'messages' ? (
                                <div className="h-full flex flex-col bg-slate-100 dark:bg-slate-800" style={{ '--tw-bg-opacity': theme === 'dark' ? 0.05 : 0.1, ...wallpaperStyle(wallpaper, { tone: 'sky', dark: theme === 'dark' }) } as React.CSSProperties}>
                                    {isSearching && (
                                        <div className="flex-shrink-0 flex items-center justify-center gap-3 py-2">
                                            <p className="text-sm text-slate-500 dark:text-slate-400 bg-slate-200/70 dark:bg-slate-700/70 backdrop-blur-sm inline-block px-3 py-1 rounded-full">
                                                {searchResultCount === 0 ? 'No messages found.' : `Found ${searchResultCount} message${searchResultCount !== 1 ? 's' : ''}.`}
                                            </p>
                                            <SearchFilters senders={Array.from(new Set(selectedChat.messages.map(msg => msg.from).filter((n): n is string => !!n)))} value={searchFilters} onChange={setSearchFilters} />
                                        </div>
                                    )}
                                    <VirtualList
                                        ref={listRef}
                                        className="flex-1 min-h-0 p-4 md:p-6"
                                        contentClassName="max-w-4xl mx-auto"
                                        count={rows.length}
                                        resetKey={`${selectedChat.id}|${debouncedSearchQuery}`}
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
                                                return <div className="flex justify-center my-4"><span className="bg-slate-200 dark:bg-slate-900/80 backdrop-blur-sm text-slate-600 dark:text-slate-300 text-xs font-semibold px-3 py-1 rounded-full shadow-sm">{row.label}</span></div>;
                                            }
                                            const bubble = <MessageBubble message={row.message} isOwnMessage={row.message.from_id === rightAlignedId} showSender={row.showSender} searchQuery={isSearching ? debouncedSearchQuery : undefined} createBlobUrl={createBlobUrl} messageById={messageById} onJumpToMessage={jumpToMessage} />;
                                            return isSearching ? <div className="cursor-pointer" onClick={() => handleJumpFromSearch(row.message.id)}>{bubble}</div> : bubble;
                                        }}
                                    />
                                </div>
                            ) : activeTab === 'media' ? (
                                <MediaGallery chat={selectedChat} onJump={jumpToMessage} createBlobUrl={createBlobUrl} filters={galleryFilters} onFiltersChange={setGalleryFilters} scrollMemory={galleryScroll} />
                            ) : (
                                <LibraryPanel messages={toolMessages} starred={starredIds} onToggleStar={toggleStar} media={createBlobUrl} chatTitle={selectedChat.name} accent="bg-sky-500" onJump={(id) => jumpToMessage(Number(id))} />
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
        {isGlobalSearchOpen && <GlobalSearch search={searchAllChats} onOpen={openGlobalHit} onClose={() => setIsGlobalSearchOpen(false)} accent="bg-sky-500" />}
        {hitNav && activeTab === 'messages' && (
            <HitNavigator position={hitNav.index + 1} total={hitNav.ids.length} onPrev={() => stepHit(-1)} onNext={() => stepHit(1)} onClose={() => setHitNav(null)} />
        )}
        </LightboxProvider>
        </StarProvider>
    );
};
export default TelegramChatViewer;
