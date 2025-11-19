
import React, { useState, useMemo, useEffect, useRef, useLayoutEffect } from 'react';
import { Chat, Message, SnapchatMedia } from './types';
import { Platform } from '../../../constants';

// --- Icon Components ---
const SettingsIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => ( <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-1.007 1.11-1.226.55-.22 1.156-.22 1.706 0 .55.22 1.02.684 1.11 1.226l.08 1.485a2.5 2.5 0 011.82 2.336 2.5 2.5 0 01-.1 1.026l.42 1.696a2.5 2.5 0 01-2.22 3.097l-1.696-.42a2.5 2.5 0 01-1.026-.1 2.5 2.5 0 01-2.336-1.82l-1.485-.08a2.5 2.5 0 01-3.097-2.22l.42-1.696a2.5 2.5 0 01.1-1.026 2.5 2.5 0 011.82-2.336l1.485.08zm-2.478 8.485a.5.5 0 01.378-.85l.74-.185a2.5 2.5 0 012.336 1.82.5.5 0 01-.85.378l-.185.74a2.5 2.5 0 01-1.82-2.336zM12 15.75a3.75 3.75 0 100-7.5 3.75 3.75 0 000 7.5z" /></svg>);
const CloseIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>);
const SearchIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" /></svg>);
const XCircleIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>);
const CameraIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.776 48.776 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" /><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" /></svg>);
const ArrowLeftIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" /></svg>);
const SpinnerIcon: React.FC<{className?: string}> = ({className}) => (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className={className}><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>);
const PhotoIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" /></svg>);


// --- Helper Functions ---
const formatTimestamp = (timestamp_ms: number) => new Date(timestamp_ms).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
const formatDateSeparator = (timestamp_ms: number) => { const date = new Date(timestamp_ms); const today = new Date(); const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1); if (date.toDateString() === today.toDateString()) return 'Today'; if (date.toDateString() === yesterday.toDateString()) return 'Yesterday'; return date.toLocaleDateString([], { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });};
const getMessagePreview = (message?: Message): string => { if (!message) return '...'; if (message.content) return message.content; if (message.linkedMedia) return message.linkedMedia.type === 'video' ? '📹 Video' : '📷 Photo'; return `[${message.media_type}]`; };

// --- Sub-components ---
const HighlightedText: React.FC<{ text: string; highlight: string }> = ({ text, highlight }) => { if (!highlight.trim()) { return <>{text}</>; } const regex = new RegExp(`(${highlight.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'); const parts = text.split(regex); return (<>{parts.map((part, i) => regex.test(part) ? (<mark key={i} className="bg-yellow-400 text-slate-900 rounded px-0.5 py-0">{part}</mark>) : (part))}</>);};
const UserAvatar: React.FC<{ name: string; className?: string; imageUrl?: string | null; onClick?: (e: React.MouseEvent<HTMLDivElement>) => void; }> = React.memo(({ name, className = '', imageUrl, onClick }) => { const initial = name.charAt(0).toUpperCase(); const colors = ['bg-pink-200 text-pink-700', 'bg-blue-200 text-blue-700', 'bg-green-200 text-green-700', 'bg-purple-200 text-purple-700', 'bg-yellow-200 text-yellow-700']; const colorClass = colors[name.charCodeAt(0) % colors.length]; const content = imageUrl ? (<img src={imageUrl} alt={name} className={`rounded-full object-cover w-full h-full ${className}`} />) : (<div className={`rounded-full ${colorClass} flex items-center justify-center font-bold w-full h-full ${className}`}>{initial}</div>); return (<div className={`relative flex-shrink-0 ${onClick ? 'cursor-pointer' : ''} ${className}`} onClick={onClick}>{content}{onClick && (<div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity"><CameraIcon className="w-1/2 h-1/2 text-white" /></div>)}</div>);});
const useIntersectionObserver = (options: IntersectionObserverInit) => { const [entry, setEntry] = useState<IntersectionObserverEntry | null>(null); const observer = useRef<IntersectionObserver | null>(null); const ref = useRef(null); useEffect(() => { const node = ref.current; if (!node) return; observer.current = new IntersectionObserver(([entry]) => { if (entry.isIntersecting) { setEntry(entry); if (observer.current) { observer.current.unobserve(node); } } }, options); observer.current.observe(node); return () => { if (observer.current) { observer.current.disconnect(); } }; }, [options]); return [ref, entry] as const;};
const LazyMedia: React.FC<{ item: SnapchatMedia, className?: string }> = ({ item, className }) => { const [isLoaded, setIsLoaded] = useState(false); const [ref, entry] = useIntersectionObserver({ threshold: 0.1, rootMargin: '200px' }); useEffect(() => { if (entry?.isIntersecting && !isLoaded) { setIsLoaded(true); } }, [entry, isLoaded]); if (isLoaded) { if (item.type === 'video') { return <video src={item.blobUrl} controls className={className} />; } return <img src={item.blobUrl} alt={item.path} className={className} />; } const placeholderClass = item.type === 'video' ? 'aspect-video' : 'aspect-square'; return (<div ref={ref} className={`${className} ${placeholderClass} bg-slate-800 flex items-center justify-center`}><SpinnerIcon className="w-6 h-6 text-slate-600" /></div>);};

const getPlaceholderForMessage = (message: Message): {text: string, style: string} => {
    const baseStyle = 'text-slate-400 italic';
    const type = message.media_type || 'TEXT';

    switch (type) {
        case 'MEDIA': return { text: 'Snap (Media not found)', style: `${baseStyle} text-blue-400` };
        case 'VIDEO': return { text: 'Video Snap (Media not found)', style: `${baseStyle} text-red-400` };
        case 'AUDIO': return { text: 'Audio Note', style: `${baseStyle} text-purple-400` };
        case 'NOTE': return { text: 'Video Note (Media not found)', style: `${baseStyle} text-teal-400` };
        case 'STICKER': return { text: 'Sticker', style: `${baseStyle} text-yellow-400` };
        case 'STATUS': return { text: 'Status Update', style: `${baseStyle} text-green-400` };
        case 'STATUSSAVETOCAMERAROLL': return { text: 'Saved a Status', style: `${baseStyle} text-green-400` };
        case 'SAVED_CHAT_MEDIA': return { text: 'Saved Media (Not Found)', style: `${baseStyle} text-indigo-400` };
        case 'SCREENSHOT': return { text: 'Screenshot', style: `${baseStyle} text-orange-400` };
        case 'SNAP': return { text: 'Snap (Media not found)', style: `${baseStyle} text-blue-400` };
        case 'IMAGE': return { text: 'Image (Media not found)', style: `${baseStyle} text-blue-400` };
        case 'TEXT': return { text: '', style: 'text-slate-200' };
        default: 
            let f = type;
            try {
                f = type.includes('_') ? type.toLowerCase().replace(/_/g, ' ').split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') : (type.toLowerCase().charAt(0).toUpperCase() + type.toLowerCase().slice(1)); 
            } catch (e) {
                f = String(type);
            }
            return { text: `[${f}]`, style: baseStyle };
    }
};

const MessageBubble: React.FC<{ message: Message; isOwnMessage: boolean; searchQuery?: string; className?: string; }> = ({ message, isOwnMessage, searchQuery, className }) => {
    const hasContent = message.content && message.content.trim().length > 0;
    const hasMedia = !!message.linkedMedia;
    const bubbleColor = isOwnMessage ? `bg-slate-700` : 'bg-slate-800';

    if (!hasContent && !hasMedia) {
        const { text, style } = getPlaceholderForMessage(message);
        if (!text) return null; // Don't render empty bubbles if no text and no media type text
        return (
            <div id={`message-${message.id}`} className={`group relative flex flex-col max-w-lg shadow-sm rounded-lg px-3 py-1.5 ${bubbleColor} ${isOwnMessage ? 'self-end' : 'self-start'} ${className ?? ''}`}>
                <p className={`whitespace-pre-wrap leading-relaxed ${style}`}><HighlightedText text={text} highlight={searchQuery || ''} /></p>
                <div className="self-end text-[10px] text-slate-500 mt-1">{formatTimestamp(message.timestamp_ms)}</div>
            </div>
        );
    }
    
    return (
        <div id={`message-${message.id}`} className={`group relative flex flex-col max-w-lg shadow-sm rounded-lg ${isOwnMessage ? 'self-end' : 'self-start'} ${className ?? ''}`}>
            <div className={`overflow-hidden rounded-lg ${bubbleColor}`}>
                {hasMedia && <LazyMedia item={message.linkedMedia!} className="w-full max-w-xs" />}
                <div className="px-3 py-1.5">
                    {hasContent && (
                        <p className={`whitespace-pre-wrap leading-relaxed text-slate-200 ${hasMedia ? 'pt-1' : ''}`}>
                            <HighlightedText text={message.content!} highlight={searchQuery || ''} />
                        </p>
                    )}
                    <div className="text-right text-[10px] text-slate-500 mt-1">{formatTimestamp(message.timestamp_ms)}</div>
                </div>
            </div>
        </div>
    );
};

const SettingsModal: React.FC<{ isOpen: boolean; onClose: () => void; participants: { name: string }[]; currentAlignment: string; onAlignmentChange: (name: string) => void; customAvatars: Record<string, string>; }> = ({ isOpen, onClose, participants, currentAlignment, onAlignmentChange, customAvatars }) => { if (!isOpen) return null; return (<div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-30" onClick={onClose}><div className="bg-slate-800 rounded-xl shadow-2xl p-6 w-full max-w-md mx-4" onClick={e => e.stopPropagation()}><div className="flex justify-between items-center mb-6"><h2 className="text-xl font-bold text-slate-200">Display Settings</h2><button onClick={onClose} className="p-1 rounded-full hover:bg-slate-700"><CloseIcon className="w-6 h-6 text-slate-400" /></button></div><div className="space-y-6"><div><h3 className="font-semibold text-slate-200 mb-2">Message Alignment</h3><p className="text-sm text-slate-400 mb-3">Choose which user's messages appear on the right.</p><div className="space-y-2 max-h-40 overflow-y-auto pr-2">{participants.map(p => (<div key={p.name} onClick={() => onAlignmentChange(p.name)} className={`p-3 border rounded-lg cursor-pointer transition-all flex items-center gap-3 ${currentAlignment === p.name ? 'border-yellow-500 bg-yellow-900/20 ring-2 ring-yellow-200 border-yellow-500' : 'border-slate-600 hover:border-slate-500'}`}><UserAvatar name={p.name} className="w-8 h-8" imageUrl={customAvatars[p.name]} /><span className="font-semibold text-slate-200">{p.name}</span></div>))}</div></div></div></div></div>);};

const MediaGallery: React.FC<{chat: Chat | null}> = ({chat}) => {
    const [filter, setFilter] = useState<'all' | 'image' | 'video'>('all');
    
    const media = useMemo(() => {
        if (!chat) return [];
        return chat.messages
            .map(msg => msg.linkedMedia)
            .filter((m): m is SnapchatMedia => m !== undefined && m.type !== 'sticker')
            .sort((a,b) => (b.date || 0) - (a.date || 0));
    }, [chat]);
    
    const filteredMedia = useMemo(() => media.filter(m => filter === 'all' || m.type === filter), [media, filter]);

    return (
        <div className="flex flex-col h-full bg-slate-900">
             <div className="flex-shrink-0 p-3 border-b border-slate-700 bg-slate-900/80 backdrop-blur-sm flex gap-4 items-center">
                <div className="inline-flex rounded-md shadow-sm" role="group">
                    <button onClick={() => setFilter('all')} type="button" className={`px-4 py-1 text-sm font-medium rounded-l-lg border ${filter === 'all' ? 'bg-yellow-400 text-slate-900 border-yellow-400 z-10' : 'bg-slate-800 text-slate-200 border-slate-600 hover:bg-slate-700'}`}>All</button>
                    <button onClick={() => setFilter('image')} type="button" className={`px-4 py-1 text-sm font-medium border-t border-b ${filter === 'image' ? 'bg-yellow-400 text-slate-900 border-yellow-400 z-10' : 'bg-slate-800 text-slate-200 border-slate-600 hover:bg-slate-700'}`}>Photos</button>
                    <button onClick={() => setFilter('video')} type="button" className={`px-4 py-1 text-sm font-medium rounded-r-lg border ${filter === 'video' ? 'bg-yellow-400 text-slate-900 border-yellow-400 z-10' : 'bg-slate-800 text-slate-200 border-slate-600 hover:bg-slate-700'}`}>Videos</button>
                </div>
            </div>
            <div className="flex-grow p-2 sm:p-4 overflow-y-auto">
                {filteredMedia.length > 0 ? (
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-2">
                        {filteredMedia.map(item => (
                             <div key={item.path} className="bg-slate-800 rounded-md overflow-hidden relative group">
                                <LazyMedia item={item} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                                {item.date && <p className="absolute bottom-1 left-2 text-white text-xs font-bold drop-shadow-md opacity-0 group-hover:opacity-100 transition-opacity">{new Date(item.date).toLocaleDateString()}</p>}
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="flex items-center justify-center h-full text-center p-4">
                        <div>
                            <div className="mx-auto w-16 h-16 text-slate-600 bg-slate-800 rounded-full flex items-center justify-center"><PhotoIcon className="w-8 h-8"/></div>
                            <h3 className="mt-4 text-lg font-semibold text-slate-300">No Media Found</h3>
                            <p className="mt-1 text-sm text-slate-400">No linked media for this chat that matches your filters.</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

const StickerGallery: React.FC<{stickers: SnapchatMedia[]}> = ({stickers}) => (
     <div className="flex flex-col h-full bg-slate-900">
         <div className="flex-grow p-2 sm:p-4 overflow-y-auto">
            {stickers.length > 0 ? (
                 <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 xl:grid-cols-12 gap-2">
                    {stickers.map(item => (
                        <div key={item.path} className="bg-slate-800 rounded-md overflow-hidden relative group flex items-center justify-center aspect-square">
                            <LazyMedia item={item} className="max-w-full max-h-full object-contain" />
                        </div>
                    ))}
                </div>
            ) : (
                <div className="flex items-center justify-center h-full text-center p-4">
                    <div>
                        <div className="mx-auto w-16 h-16 text-slate-600 bg-slate-800 rounded-full flex items-center justify-center"><PhotoIcon className="w-8 h-8"/></div>
                        <h3 className="mt-4 text-lg font-semibold text-slate-300">No Stickers Found</h3>
                        <p className="mt-1 text-sm text-slate-400">No stickers were found in your archive.</p>
                    </div>
                </div>
            )}
         </div>
     </div>
)


// --- Main Viewer Component ---
interface SnapchatChatViewerProps { chats: Chat[]; stickers: SnapchatMedia[]; ownerName: string; onReset: () => void; platform: Platform; }
const SnapchatChatViewer: React.FC<SnapchatChatViewerProps> = ({ chats, stickers, ownerName, onReset, platform }) => {
    const [selectedChatId, setSelectedChatId] = useState<string | null>(chats[0]?.id || null);
    const [searchQuery, setSearchQuery] = useState('');
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [customAvatars, setCustomAvatars] = useState<Record<string, string>>({});
    const [rightAlignedUser, setRightAlignedUser] = useState<string>(ownerName);
    const [isSidebarVisible, setIsSidebarVisible] = useState(true);
    const [activeTab, setActiveTab] = useState<'messages' | 'media' | 'stickers'>('messages');

    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const avatarInputRef = useRef<HTMLInputElement>(null);
    const userForAvatarChange = useRef<string | null>(null);

    // Update rightAlignedUser when ownerName prop changes (e.g. from Summary screen edit)
    useEffect(() => {
        setRightAlignedUser(ownerName);
    }, [ownerName]);

    const selectedChat = useMemo(() => chats.find(c => c.id === selectedChatId), [selectedChatId, chats]);
    const isSearching = useMemo(() => searchQuery.trim().length > 0, [searchQuery]);
    
    // Case-insensitive comparison for ownership
    const isOwner = (sender: string) => {
        return sender.trim().toLowerCase() === rightAlignedUser.trim().toLowerCase();
    };

    const { messageGroups, searchResultCount } = useMemo(() => { if(!selectedChat) return {messageGroups:[], searchResultCount: null}; const sourceMessages = selectedChat.messages; const filteredMessages = isSearching ? sourceMessages.filter(msg => (msg.content && msg.content.toLowerCase().includes(searchQuery.toLowerCase())) || (getPlaceholderForMessage(msg).text.toLowerCase().includes(searchQuery.toLowerCase()))) : sourceMessages; const resultCount = isSearching ? filteredMessages.length : null; const groups: Message[][] = []; if (filteredMessages.length > 0) { let currentGroup: Message[] = [filteredMessages[0]]; for (let i = 1; i < filteredMessages.length; i++) { const newDate = new Date(filteredMessages[i].timestamp_ms).toDateString() !== new Date(filteredMessages[i-1].timestamp_ms).toDateString(); if (!newDate) { currentGroup.push(filteredMessages[i]); } else { groups.push(currentGroup); currentGroup = [filteredMessages[i]]; } } groups.push(currentGroup); } return { messageGroups: groups, searchResultCount: resultCount }; }, [selectedChat, isSearching, searchQuery]);
    useLayoutEffect(() => { const container = scrollContainerRef.current; if(container) { container.scrollTop = container.scrollHeight; } }, [selectedChat, messageGroups]);
    
    const handleSelectChat = (chatId: string) => { setSelectedChatId(chatId); setSearchQuery(''); setIsSidebarVisible(false); setActiveTab('messages'); };
    const handleAvatarChangeClick = (userName: string) => { userForAvatarChange.current = userName; avatarInputRef.current?.click(); };
    const handleAvatarFileSelected = (event: React.ChangeEvent<HTMLInputElement>) => { const file = event.target.files?.[0]; const userName = userForAvatarChange.current; if (!file || !userName) return; const reader = new FileReader(); reader.onload = (e) => { const dataUrl = e.target?.result as string; if (dataUrl) setCustomAvatars(prev => ({...prev, [userName]: dataUrl})); }; reader.readAsDataURL(file); if(event.target) event.target.value = '';};

    return (
        <div className="flex w-full h-full bg-slate-900 overflow-hidden relative">
            <input type="file" ref={avatarInputRef} className="hidden" accept="image/png, image/jpeg, image/gif" onChange={handleAvatarFileSelected}/>
            <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} participants={selectedChat?.participants || []} currentAlignment={rightAlignedUser} onAlignmentChange={setRightAlignedUser} customAvatars={customAvatars} />
            
            <aside className={`absolute md:relative w-full md:w-1/3 lg:w-1/4 border-r border-slate-700 flex flex-col transition-transform duration-300 ease-in-out z-10 bg-slate-900 h-full ${isSidebarVisible ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}>
                <header className="p-4 border-b border-slate-700"><h2 className="text-xl font-bold text-slate-200">Saved Chats</h2><p className="text-sm text-slate-400">{chats.length} conversations</p></header>
                <div className="flex-grow overflow-y-auto">
                    {chats.map(chat => (
                        <div key={chat.id} onClick={() => handleSelectChat(chat.id)} className={`p-3 flex items-center cursor-pointer border-l-4 transition-colors duration-200 ${selectedChatId === chat.id ? 'border-yellow-400 bg-slate-800' : 'border-transparent hover:bg-slate-800/60'}`}>
                            <UserAvatar name={chat.title} className="w-11 h-11 text-lg" imageUrl={customAvatars[chat.title]} onClick={(e) => { e.stopPropagation(); handleAvatarChangeClick(chat.title); }} />
                            <div className="ml-4 truncate flex-grow"><p className="font-semibold text-slate-100">{chat.title}</p><p className="text-sm text-slate-400 truncate">{getMessagePreview(chat.messages.slice(-1)[0])}</p></div>
                        </div>
                    ))}
                </div>
            </aside>

            <main className="flex flex-col w-full h-full">
                {selectedChat ? (
                    <>
                        <header className="p-3 border-b border-slate-700 flex items-center justify-between shadow-sm gap-4 bg-slate-900">
                           <div className="flex items-center min-w-0">
                                <button onClick={() => setIsSidebarVisible(true)} className="md:hidden p-2 mr-2 rounded-full hover:bg-slate-700"><ArrowLeftIcon className="w-5 h-5 text-slate-300" /></button>
                                <UserAvatar name={selectedChat.title} className="w-11 h-11 text-lg" imageUrl={customAvatars[selectedChat.title]} onClick={(e) => { e.stopPropagation(); handleAvatarChangeClick(selectedChat.title); }}/>
                                <div className="ml-4 truncate"><h3 className="text-xl font-bold text-slate-200 truncate">{selectedChat.title}</h3></div>
                           </div>
                           <div className="flex-shrink-0 flex items-center gap-2">
                               {activeTab === 'messages' && <div className="relative"><span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none"><SearchIcon className="w-5 h-5 text-slate-500" /></span><input type="text" placeholder="Search..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full max-w-[120px] sm:max-w-[200px] rounded-full border border-slate-600 bg-slate-800 py-1.5 pl-10 pr-8 text-sm text-slate-200 focus:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-yellow-400 transition-all duration-300" />{isSearching && (<button onClick={() => setSearchQuery('')} className="absolute inset-y-0 right-0 flex items-center pr-2 group"><XCircleIcon className="w-5 h-5 text-slate-500 group-hover:text-slate-300 transition-colors" /></button>)}</div>}
                                <button onClick={() => setIsSettingsOpen(true)} className="p-2 rounded-full hover:bg-slate-700 transition-colors" aria-label="Chat settings"><SettingsIcon className="w-6 h-6 text-slate-300" /></button>
                                <button onClick={onReset} className="px-4 py-2 bg-yellow-400 text-slate-900 text-sm font-semibold rounded-lg hover:bg-yellow-500 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-400">Process Another</button>
                           </div>
                        </header>
                         <div className="flex-shrink-0 border-b border-slate-700 bg-slate-900 px-4 flex items-center gap-4">
                             <button onClick={() => setActiveTab('messages')} className={`py-3 text-sm font-semibold border-b-2 transition-colors ${activeTab === 'messages' ? 'border-yellow-400 text-yellow-400' : 'border-transparent text-slate-400 hover:text-slate-200'}`}>Messages</button>
                             <button onClick={() => setActiveTab('media')} className={`py-3 text-sm font-semibold border-b-2 transition-colors ${activeTab === 'media' ? 'border-yellow-400 text-yellow-400' : 'border-transparent text-slate-400 hover:text-slate-200'}`}>Media</button>
                             <button onClick={() => setActiveTab('stickers')} className={`py-3 text-sm font-semibold border-b-2 transition-colors ${activeTab === 'stickers' ? 'border-yellow-400 text-yellow-400' : 'border-transparent text-slate-400 hover:text-slate-200'}`}>Stickers</button>
                        </div>
                        
                        <div className="flex-grow overflow-hidden relative">
                            <div className={`w-full h-full transition-opacity duration-300 ${activeTab === 'messages' ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                                <div ref={scrollContainerRef} className="h-full p-4 md:p-6 overflow-y-auto bg-slate-900">
                                    <div className="flex flex-col gap-4 max-w-4xl mx-auto">{isSearching && (<div className="text-center my-2 sticky top-2 z-10"><p className="text-sm text-slate-400 bg-slate-700/70 backdrop-blur-sm inline-block px-3 py-1 rounded-full">{searchResultCount === 0 ? 'No messages found.' : `Found ${searchResultCount} message${searchResultCount !== 1 ? 's' : ''}.`}</p></div>)}{messageGroups.map((group, groupIndex) => { const firstMessage = group[0]; if (!firstMessage) return null; const dateStr = formatDateSeparator(firstMessage.timestamp_ms); return (<React.Fragment key={`${firstMessage.timestamp_ms}-${groupIndex}`}><div className="flex justify-center my-4 sticky top-2 z-10"><span className="bg-slate-700 text-slate-300 text-xs font-semibold px-3 py-1 rounded-full shadow-sm">{dateStr}</span></div><div className="flex flex-col">{group.map((message, messageIndex) => { const prevMessage = messageIndex > 0 ? group[messageIndex - 1] : null; const senderHasChanged = !prevMessage || prevMessage.sender_name !== message.sender_name; const marginTopClass = senderHasChanged ? 'mt-3' : 'mt-0.5'; return (<MessageBubble key={message.id} message={message} isOwnMessage={isOwner(message.sender_name)} searchQuery={isSearching ? searchQuery : undefined} className={marginTopClass}/>); })}</div></React.Fragment>);})}</div>
                                </div>
                            </div>
                             <div className={`absolute inset-0 transition-opacity duration-300 ${activeTab === 'media' ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}><MediaGallery chat={selectedChat} /></div>
                             <div className={`absolute inset-0 transition-opacity duration-300 ${activeTab === 'stickers' ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}><StickerGallery stickers={stickers} /></div>
                        </div>
                    </>
                ) : (
                    <div className="hidden md:flex flex-grow items-center justify-center text-center text-slate-400 bg-slate-900">
                       <div><h2 className="text-2xl font-semibold">Welcome to your Snapchat archive</h2><p className="mt-2">Select a conversation to begin.</p></div>
                    </div>
                )}
            </main>
        </div>
    );
};
export default SnapchatChatViewer;
