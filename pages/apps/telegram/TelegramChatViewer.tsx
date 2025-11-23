
import React, { useState, useMemo, useEffect, useRef, useLayoutEffect, useCallback } from 'react';
import { Chat, Message, Photo, Video, TelegramText } from './types';

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
    if (message.sticker_emoji) return `${message.sticker_emoji} Sticker`;
    if (message.file) return '📎 File';
    return 'Unsupported message';
};

// --- Sub-components ---
const HighlightedText: React.FC<{ text: string; highlight: string }> = ({ text, highlight }) => { if (!highlight.trim()) { return <>{text}</>; } const regex = new RegExp(`(${highlight.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'); const parts = text.split(regex); return (<>{parts.map((part, i) => regex.test(part) ? (<mark key={i} className="bg-sky-200 dark:bg-sky-500 text-slate-900 rounded px-0.5 py-0">{part}</mark>) : (part))}</>);};
const UserAvatar: React.FC<{ name: string; className?: string; imageUrl?: string | null; onClick?: (e: React.MouseEvent<HTMLDivElement>) => void; }> = React.memo(({ name, className = '', imageUrl, onClick }) => { const initial = (name || " ").charAt(0).toUpperCase(); const colors = ['bg-pink-200 text-pink-700', 'bg-blue-200 text-blue-700', 'bg-green-200 text-green-700', 'bg-purple-200 text-purple-700', 'bg-yellow-200 text-yellow-700']; const colorClass = colors[name.charCodeAt(0) % colors.length]; const content = imageUrl ? (<img src={imageUrl} alt={name} className={`rounded-full object-cover w-full h-full ${className}`} />) : (<div className={`rounded-full ${colorClass} flex items-center justify-center font-bold w-full h-full ${className}`}>{initial}</div>); return (<div className={`relative flex-shrink-0 ${onClick ? 'cursor-pointer' : ''} ${className}`} onClick={onClick}>{content}{onClick && (<div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity"><CameraIcon className="w-1/2 h-1/2 text-white" /></div>)}</div>);});
const useIntersectionObserver = (options: IntersectionObserverInit) => { const [entry, setEntry] = useState<IntersectionObserverEntry | null>(null); const observer = useRef<IntersectionObserver | null>(null); const ref = useRef(null); useEffect(() => { const node = ref.current; if (!node) return; observer.current = new IntersectionObserver(([entry]) => { if (entry.isIntersecting) { setEntry(entry); if (observer.current) { observer.current.unobserve(node); } } }, options); observer.current.observe(node); return () => { if (observer.current) { observer.current.disconnect(); } }; }, [options]); return [ref, entry] as const;};
const LazyMedia: React.FC<{ uri: string, createBlobUrl: (uri: string) => Promise<string | undefined>, isVideo: boolean, className?: string }> = ({ uri, createBlobUrl, isVideo, className }) => { const [blobUrl, setBlobUrl] = useState<string | null>(null); const [isLoading, setIsLoading] = useState(false); const [ref, entry] = useIntersectionObserver({ threshold: 0.1, rootMargin: '200px' }); useEffect(() => { if (entry?.isIntersecting && !blobUrl && !isLoading) { setIsLoading(true); createBlobUrl(uri).then(url => { if (url) { setBlobUrl(url); } }).finally(() => { setIsLoading(false); }); } }, [entry, uri, createBlobUrl, blobUrl, isLoading]); if (blobUrl) { if (isVideo) { return <video src={blobUrl} controls className={className} />; } return <img src={blobUrl} alt="A photo shared in the chat" className={className} />; } const placeholderClass = isVideo ? 'aspect-video' : 'aspect-square'; return (<div ref={ref} className={`${className} ${placeholderClass} bg-slate-200 dark:bg-slate-700 flex items-center justify-center`}>{isLoading ? <SpinnerIcon className="w-6 h-6 text-slate-400 animate-spin" /> : <PhotoIcon className="w-8 h-8 text-slate-400" />}</div>);};

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

const MessageBubble: React.FC<{ message: Message; isOwnMessage: boolean; showSender: boolean; searchQuery?: string; createBlobUrl: (uri: string) => Promise<string | undefined>; }> = ({ message, isOwnMessage, showSender, searchQuery, createBlobUrl }) => { const bubbleColor = isOwnMessage ? `bg-sky-100 dark:bg-sky-800/60` : 'bg-white dark:bg-slate-700'; const senderColor = useMemo(() => { const name = message.from || ''; let hash = 0; for (let i = 0; i < name.length; i++) { hash = name.charCodeAt(i) + ((hash << 5) - hash); } const colors = ['text-red-500', 'text-blue-500', 'text-green-500', 'text-purple-500', 'text-orange-500', 'text-pink-500']; return colors[Math.abs(hash) % colors.length]; }, [message.from]); return (<div id={`message-${message.id}`} className={`group relative flex flex-col max-w-lg shadow-sm rounded-lg px-3 py-2 ${bubbleColor} ${isOwnMessage ? 'self-end' : 'self-start'}`}> {!isOwnMessage && showSender && (<p className={`text-sm font-bold mb-1 ${senderColor}`}>{message.from}</p>)} {message.photo && <LazyMedia uri={message.photo} createBlobUrl={createBlobUrl} isVideo={false} className="max-w-xs sm:max-w-sm max-h-80 rounded-lg" />} {message.video_file && <LazyMedia uri={message.video_file} createBlobUrl={createBlobUrl} isVideo={true} className="max-w-xs sm:max-w-sm max-h-80 rounded-lg" />} <div className={`whitespace-pre-wrap leading-relaxed text-slate-800 dark:text-slate-200 ${(message.photo || message.video_file) ? 'mt-2' : ''}`}>{renderTelegramText(message.text, searchQuery || '')}</div> <div className="self-end text-xs text-slate-400 dark:text-slate-500 mt-1">{formatTimestamp(new Date(message.date).getTime())}</div></div>);};

const SettingsModal: React.FC<{ isOpen: boolean; onClose: () => void; currentParticipants: Set<{name: string, id: string}>; currentRightAlignedId: string; onRightAlignmentChange: (id: string) => void; }> = ({ isOpen, onClose, currentParticipants, currentRightAlignedId, onRightAlignmentChange }) => {
    if (!isOpen) return null;

    const participantsList = Array.from(currentParticipants);

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
                            {participantsList.map(p => (
                                <div
                                    key={p.id}
                                    onClick={() => onRightAlignmentChange(p.id)}
                                    className={`p-3 border rounded-lg cursor-pointer transition-all flex items-center gap-3 ${currentRightAlignedId === p.id ? 'border-sky-500 bg-sky-50 dark:bg-sky-900/20 ring-2 ring-sky-200 dark:border-sky-500' : 'border-slate-300 dark:border-slate-600 hover:border-slate-400 dark:hover:border-slate-500'}`}
                                >
                                    <UserAvatar name={p.name} className="w-8 h-8" />
                                    <div className="flex-grow min-w-0">
                                        <p className="font-semibold text-slate-800 dark:text-slate-200 truncate">{p.name}</p>
                                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{p.id}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
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
    
    // Identity State
    const [rightAlignedId, setRightAlignedId] = useState<string>(ownerId);
    
    // Update local alignment state if prop changes (e.g. re-upload)
    useEffect(() => {
        setRightAlignedId(ownerId);
    }, [ownerId]);

    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const avatarInputRef = useRef<HTMLInputElement>(null);
    const userForAvatarChange = useRef<string | null>(null);

    const selectedChat = useMemo(() => chats.find(c => c.id === selectedChatId), [selectedChatId, chats]);
    const isSearching = useMemo(() => searchQuery.trim().length > 0, [searchQuery]);
    
    const filteredChats = useMemo(() => {
        if (!chatSearchQuery.trim()) {
            return chats;
        }
        return chats.filter(chat =>
            chat.name.toLowerCase().includes(chatSearchQuery.toLowerCase())
        );
    }, [chats, chatSearchQuery]);

    // Extract unique participants for the settings modal from the current chat
    const currentChatParticipants = useMemo(() => {
        const participants = new Set<{name: string, id: string}>();
        if (selectedChat) {
            selectedChat.messages.forEach(msg => {
                if (msg.from && msg.from_id) {
                    participants.add({ name: msg.from, id: msg.from_id });
                }
            });
        }
        // Deduplicate by ID
        const unique = new Map<string, {name: string, id: string}>();
        participants.forEach(p => unique.set(p.id, p));
        return new Set(unique.values());
    }, [selectedChat]);

    const { messageGroups, searchResultCount } = useMemo(() => { if(!selectedChat) return {messageGroups:[], searchResultCount: null}; const sourceMessages = selectedChat.messages; const filteredMessages = isSearching ? sourceMessages.filter(msg => { const text = getMessagePreview(msg); return text && text.toLowerCase().includes(searchQuery.toLowerCase());}) : sourceMessages; const resultCount = isSearching ? filteredMessages.length : null; const groups: Message[][] = []; if (filteredMessages.length > 0) { let currentGroup: Message[] = [filteredMessages[0]]; for (let i = 1; i < filteredMessages.length; i++) { const newDate = new Date(filteredMessages[i].date).toDateString() !== new Date(filteredMessages[i-1].date).toDateString(); if (!newDate) { currentGroup.push(filteredMessages[i]); } else { groups.push(currentGroup); currentGroup = [filteredMessages[i]]; } } groups.push(currentGroup); } return { messageGroups: groups, searchResultCount: resultCount }; }, [selectedChat, isSearching, searchQuery]);
    useLayoutEffect(() => { const container = scrollContainerRef.current; if(container) { container.scrollTop = container.scrollHeight; } }, [selectedChat, messageGroups]);
    
    const handleSelectChat = (chatId: number) => { setSelectedChatId(chatId); setSearchQuery(''); setIsSidebarVisible(false); };
    const handleAvatarChangeClick = (userName: string) => { userForAvatarChange.current = userName; avatarInputRef.current?.click(); };
    const handleAvatarFileSelected = (event: React.ChangeEvent<HTMLInputElement>) => { const file = event.target.files?.[0]; const userName = userForAvatarChange.current; if (!file || !userName) return; const reader = new FileReader(); reader.onload = (e) => { const dataUrl = e.target?.result as string; if (dataUrl) setCustomAvatars(prev => ({...prev, [userName]: dataUrl})); }; reader.readAsDataURL(file); if(event.target) event.target.value = '';};

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

            <aside className={`absolute md:relative w-full md:w-1/3 lg:w-1/4 border-r border-slate-200 dark:border-slate-700 flex flex-col transition-transform duration-300 ease-in-out z-10 bg-white dark:bg-slate-800 h-full ${isSidebarVisible ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}>
                <header className="p-4 border-b border-slate-200 dark:border-slate-700 space-y-3">
                    <div>
                        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200">Your Chats</h2>
                        <p className="text-sm text-slate-500 dark:text-slate-400">{chats.length} conversations</p>
                    </div>
                    <div className="relative">
                        <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                            <SearchIcon className="w-5 h-5 text-slate-400 dark:text-slate-500" />
                        </span>
                        <input
                            type="text"
                            placeholder="Search chats..."
                            value={chatSearchQuery}
                            onChange={(e) => setChatSearchQuery(e.target.value)}
                            className="w-full rounded-md border border-slate-300 dark:border-slate-600 bg-slate-100 dark:bg-slate-700 py-1.5 pl-10 pr-4 text-sm text-slate-800 dark:text-slate-200 focus:bg-white dark:focus:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-sky-500 transition-all duration-300"
                        />
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
                    ) : (
                         <div className="p-4 text-center text-slate-500 dark:text-slate-400">
                            <p className="text-sm">
                                {chatSearchQuery ? `No chats matching "${chatSearchQuery}"` : "No chats found."}
                            </p>
                        </div>
                    )}
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
                               <div className="relative"><span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none"><SearchIcon className="w-5 h-5 text-slate-400 dark:text-slate-500" /></span><input type="text" placeholder="Search..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full max-w-[120px] sm:max-w-[200px] rounded-full border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 py-1.5 pl-10 pr-8 text-sm text-slate-800 dark:text-slate-200 focus:bg-white dark:focus:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-sky-500 transition-all duration-300" />{isSearching && (<button onClick={() => setSearchQuery('')} className="absolute inset-y-0 right-0 flex items-center pr-2 group"><XCircleIcon className="w-5 h-5 text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-colors" /></button>)}</div>
                               <button onClick={onThemeToggle} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors" aria-label="Toggle theme">{theme === 'light' ? <MoonIcon className="w-6 h-6 text-slate-600" /> : <SunIcon className="w-6 h-6 text-yellow-400" />}</button>
                               <button onClick={() => setIsSettingsOpen(true)} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors" aria-label="Chat settings"><SettingsIcon className="w-6 h-6 text-slate-600 dark:text-slate-300" /></button>
                               <button onClick={onReset} className="px-4 py-2 bg-sky-500 text-white text-sm font-semibold rounded-lg hover:bg-sky-600 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500">Process Another</button>
                           </div>
                        </header>
                        
                        <div className="flex-grow overflow-hidden relative">
                            <div ref={scrollContainerRef} className="h-full p-4 md:p-6 overflow-y-auto bg-slate-100 dark:bg-slate-800 bg-[url('https://uploads-ssl.webflow.com/5a979516ab15960001a2d59a/5ab17498c368380001b8d787_seamless-pattern-with-telegram-l-c63e29f0302489a24d2621742417a58a.png')] dark:bg-[url('https://uploads-ssl.webflow.com/5a979516ab15960001a2d59a/5ab17498c368380001b8d787_seamless-pattern-with-telegram-l-c63e29f0302489a24d2621742417a58a.png')] bg-repeat bg-center" style={{'--tw-bg-opacity': theme === 'dark' ? 0.05 : 0.1} as React.CSSProperties}>
                                <div className="flex flex-col gap-4 max-w-4xl mx-auto">{isSearching && (<div className="text-center my-2 sticky top-2 z-10"><p className="text-sm text-slate-500 dark:text-slate-400 bg-slate-200/70 dark:bg-slate-700/70 backdrop-blur-sm inline-block px-3 py-1 rounded-full">{searchResultCount === 0 ? 'No messages found.' : `Found ${searchResultCount} message${searchResultCount !== 1 ? 's' : ''}.`}</p></div>)}{messageGroups.map((group, groupIndex) => { const firstMessage = group[0]; if (!firstMessage) return null; const dateStr = formatDateSeparator(new Date(firstMessage.date).getTime()); return (<React.Fragment key={`${firstMessage.date_unixtime}-${groupIndex}`}><div className="flex justify-center my-4 sticky top-2 z-10"><span className="bg-slate-200 dark:bg-slate-900/80 backdrop-blur-sm text-slate-600 dark:text-slate-300 text-xs font-semibold px-3 py-1 rounded-full shadow-sm">{dateStr}</span></div><div className="flex flex-col gap-1">{group.map((message, messageIndex) => { const prevMessage = messageIndex > 0 ? group[messageIndex - 1] : null; const showSender = isGroupChat && (!prevMessage || prevMessage.from_id !== message.from_id); return (<MessageBubble key={message.id} message={message} isOwnMessage={message.from_id === rightAlignedId} showSender={showSender} searchQuery={isSearching ? searchQuery : undefined} createBlobUrl={createBlobUrl} />) })}</div></React.Fragment>);})}</div>
                            </div>
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
