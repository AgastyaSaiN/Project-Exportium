import React, { useState, useMemo, useEffect, useRef, useLayoutEffect } from 'react';
import { Chat, Message } from './types';
import { Platform } from '../../../constants';

// --- Icon Components ---
const SettingsIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => ( <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-1.007 1.11-1.226.55-.22 1.156-.22 1.706 0 .55.22 1.02.684 1.11 1.226l.08 1.485a2.5 2.5 0 011.82 2.336 2.5 2.5 0 01-.1 1.026l.42 1.696a2.5 2.5 0 01-2.22 3.097l-1.696-.42a2.5 2.5 0 01-1.026-.1 2.5 2.5 0 01-2.336-1.82l-1.485-.08a2.5 2.5 0 01-3.097-2.22l.42-1.696a2.5 2.5 0 01.1-1.026 2.5 2.5 0 011.82-2.336l1.485.08zm-2.478 8.485a.5.5 0 01.378-.85l.74-.185a2.5 2.5 0 012.336 1.82.5.5 0 01-.85.378l-.185.74a2.5 2.5 0 01-1.82-2.336zM12 15.75a3.75 3.75 0 100-7.5 3.75 3.75 0 000 7.5z" /></svg>);
const CloseIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>);
const SearchIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" /></svg>);
const XCircleIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>);
const CameraIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.776 48.776 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" /><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" /></svg>);
const ArrowLeftIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" /></svg>);


// --- Helper Functions ---
const formatTimestamp = (timestamp_ms: number) => new Date(timestamp_ms).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
const formatDateSeparator = (timestamp_ms: number) => { const date = new Date(timestamp_ms); const today = new Date(); const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1); if (date.toDateString() === today.toDateString()) return 'Today'; if (date.toDateString() === yesterday.toDateString()) return 'Yesterday'; return date.toLocaleDateString([], { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });};
const getMessagePreview = (message?: Message): string => { if (!message) return '...'; if (message.content) return message.content; return `[${message.media_type}]`; };

// --- Sub-components ---
const HighlightedText: React.FC<{ text: string; highlight: string }> = ({ text, highlight }) => { if (!highlight.trim()) { return <>{text}</>; } const regex = new RegExp(`(${highlight.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'); const parts = text.split(regex); return (<>{parts.map((part, i) => regex.test(part) ? (<mark key={i} className="bg-yellow-400 text-slate-900 rounded px-0.5 py-0">{part}</mark>) : (part))}</>);};
const UserAvatar: React.FC<{ name: string; className?: string; imageUrl?: string | null; onClick?: (e: React.MouseEvent<HTMLDivElement>) => void; }> = React.memo(({ name, className = '', imageUrl, onClick }) => { const initial = name.charAt(0).toUpperCase(); const colors = ['bg-pink-200 text-pink-700', 'bg-blue-200 text-blue-700', 'bg-green-200 text-green-700', 'bg-purple-200 text-purple-700', 'bg-yellow-200 text-yellow-700']; const colorClass = colors[name.charCodeAt(0) % colors.length]; const content = imageUrl ? (<img src={imageUrl} alt={name} className={`rounded-full object-cover w-full h-full ${className}`} />) : (<div className={`rounded-full ${colorClass} flex items-center justify-center font-bold w-full h-full ${className}`}>{initial}</div>); return (<div className={`relative flex-shrink-0 ${onClick ? 'cursor-pointer' : ''} ${className}`} onClick={onClick}>{content}{onClick && (<div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity"><CameraIcon className="w-1/2 h-1/2 text-white" /></div>)}</div>);});

const formatSnapContent = (message: Message): {text: string, style: string} => {
    const textStyle = 'text-slate-200';
    const baseStyle = 'text-slate-400 italic';

    // Prioritize showing content if it exists, regardless of media type.
    if (message.content) {
        return { text: message.content, style: textStyle };
    }

    // If no content, show a descriptive placeholder based on media type.
    switch (message.media_type) {
        case 'MEDIA': return { text: 'Snap', style: `${baseStyle} text-blue-400` };
        case 'VIDEO': return { text: 'Video Snap', style: `${baseStyle} text-red-400` };
        case 'AUDIO': return { text: 'Audio Note', style: `${baseStyle} text-purple-400` };
        case 'NOTE': return { text: 'Video Note', style: `${baseStyle} text-teal-400` };
        case 'STICKER': return { text: 'Sticker', style: `${baseStyle} text-yellow-400` };
        case 'TEXT': return { text: '', style: textStyle }; // Handles empty text messages
        default: return { text: `[${message.media_type}]`, style: baseStyle };
    }
};

const MessageBubble: React.FC<{ message: Message; isOwnMessage: boolean; searchQuery?: string; className?: string; }> = ({ message, isOwnMessage, searchQuery, className }) => {
    const {text, style} = formatSnapContent(message);
    const bubbleColor = isOwnMessage ? `bg-slate-700` : 'bg-slate-800';
    return (<div id={`message-${message.id}`} className={`group relative flex flex-col max-w-lg shadow-sm rounded-lg px-3 py-1.5 ${bubbleColor} ${isOwnMessage ? 'self-end' : 'self-start'} ${className ?? ''}`}>
        <p className={`whitespace-pre-wrap leading-relaxed ${style}`}><HighlightedText text={text} highlight={searchQuery || ''} /></p>
        <div className="self-end text-[10px] text-slate-500 mt-1">{formatTimestamp(message.timestamp_ms)}</div>
    </div>);
};

const SettingsModal: React.FC<{ isOpen: boolean; onClose: () => void; participants: { name: string }[]; currentAlignment: string; onAlignmentChange: (name: string) => void; customAvatars: Record<string, string>; }> = ({ isOpen, onClose, participants, currentAlignment, onAlignmentChange, customAvatars }) => { if (!isOpen) return null; return (<div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-30" onClick={onClose}><div className="bg-slate-800 rounded-xl shadow-2xl p-6 w-full max-w-md mx-4" onClick={e => e.stopPropagation()}><div className="flex justify-between items-center mb-6"><h2 className="text-xl font-bold text-slate-200">Display Settings</h2><button onClick={onClose} className="p-1 rounded-full hover:bg-slate-700"><CloseIcon className="w-6 h-6 text-slate-400" /></button></div><div className="space-y-6"><div><h3 className="font-semibold text-slate-200 mb-2">Message Alignment</h3><p className="text-sm text-slate-400 mb-3">Choose which user's messages appear on the right.</p><div className="space-y-2 max-h-40 overflow-y-auto pr-2">{participants.map(p => (<div key={p.name} onClick={() => onAlignmentChange(p.name)} className={`p-3 border rounded-lg cursor-pointer transition-all flex items-center gap-3 ${currentAlignment === p.name ? 'border-yellow-500 bg-yellow-900/20 ring-2 ring-yellow-200 border-yellow-500' : 'border-slate-600 hover:border-slate-500'}`}><UserAvatar name={p.name} className="w-8 h-8" imageUrl={customAvatars[p.name]} /><span className="font-semibold text-slate-200">{p.name}</span></div>))}</div></div></div></div></div>);};


// --- Main Viewer Component ---
interface SnapchatChatViewerProps { chats: Chat[]; ownerName: string; onReset: () => void; platform: Platform; }
const SnapchatChatViewer: React.FC<SnapchatChatViewerProps> = ({ chats, ownerName, onReset, platform }) => {
    const [selectedChatId, setSelectedChatId] = useState<string | null>(chats[0]?.id || null);
    const [searchQuery, setSearchQuery] = useState('');
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [customAvatars, setCustomAvatars] = useState<Record<string, string>>({});
    const [rightAlignedUser, setRightAlignedUser] = useState<string>(ownerName);
    const [isSidebarVisible, setIsSidebarVisible] = useState(true);

    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const avatarInputRef = useRef<HTMLInputElement>(null);
    const userForAvatarChange = useRef<string | null>(null);

    const selectedChat = useMemo(() => chats.find(c => c.id === selectedChatId), [selectedChatId, chats]);
    const isSearching = useMemo(() => searchQuery.trim().length > 0, [searchQuery]);
    const { messageGroups, searchResultCount } = useMemo(() => { if(!selectedChat) return {messageGroups:[], searchResultCount: null}; const sourceMessages = selectedChat.messages; const filteredMessages = isSearching ? sourceMessages.filter(msg => (msg.content && msg.content.toLowerCase().includes(searchQuery.toLowerCase())) || (formatSnapContent(msg).text.toLowerCase().includes(searchQuery.toLowerCase()))) : sourceMessages; const resultCount = isSearching ? filteredMessages.length : null; const groups: Message[][] = []; if (filteredMessages.length > 0) { let currentGroup: Message[] = [filteredMessages[0]]; for (let i = 1; i < filteredMessages.length; i++) { const newDate = new Date(filteredMessages[i].timestamp_ms).toDateString() !== new Date(filteredMessages[i-1].timestamp_ms).toDateString(); if (!newDate) { currentGroup.push(filteredMessages[i]); } else { groups.push(currentGroup); currentGroup = [filteredMessages[i]]; } } groups.push(currentGroup); } return { messageGroups: groups, searchResultCount: resultCount }; }, [selectedChat, isSearching, searchQuery]);
    useLayoutEffect(() => { const container = scrollContainerRef.current; if(container) { container.scrollTop = container.scrollHeight; } }, [selectedChat, messageGroups]);
    
    const handleSelectChat = (chatId: string) => { setSelectedChatId(chatId); setSearchQuery(''); setIsSidebarVisible(false); };
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
                               <div className="relative"><span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none"><SearchIcon className="w-5 h-5 text-slate-500" /></span><input type="text" placeholder="Search..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full max-w-[120px] sm:max-w-[200px] rounded-full border border-slate-600 bg-slate-800 py-1.5 pl-10 pr-8 text-sm text-slate-200 focus:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-yellow-400 transition-all duration-300" />{isSearching && (<button onClick={() => setSearchQuery('')} className="absolute inset-y-0 right-0 flex items-center pr-2 group"><XCircleIcon className="w-5 h-5 text-slate-500 group-hover:text-slate-300 transition-colors" /></button>)}</div>
                                <button onClick={() => setIsSettingsOpen(true)} className="p-2 rounded-full hover:bg-slate-700 transition-colors" aria-label="Chat settings"><SettingsIcon className="w-6 h-6 text-slate-300" /></button>
                                <button onClick={onReset} className="px-4 py-2 bg-yellow-400 text-slate-900 text-sm font-semibold rounded-lg hover:bg-yellow-500 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-400">Process Another</button>
                           </div>
                        </header>
                        
                        <div className="flex-grow overflow-hidden relative">
                            <div ref={scrollContainerRef} className="h-full p-4 md:p-6 overflow-y-auto bg-slate-900">
                                <div className="flex flex-col gap-4 max-w-4xl mx-auto">{isSearching && (<div className="text-center my-2 sticky top-2 z-10"><p className="text-sm text-slate-400 bg-slate-700/70 backdrop-blur-sm inline-block px-3 py-1 rounded-full">{searchResultCount === 0 ? 'No messages found.' : `Found ${searchResultCount} message${searchResultCount !== 1 ? 's' : ''}.`}</p></div>)}{messageGroups.map((group, groupIndex) => { const firstMessage = group[0]; if (!firstMessage) return null; const dateStr = formatDateSeparator(firstMessage.timestamp_ms); return (<React.Fragment key={`${firstMessage.timestamp_ms}-${groupIndex}`}><div className="flex justify-center my-4 sticky top-2 z-10"><span className="bg-slate-700 text-slate-300 text-xs font-semibold px-3 py-1 rounded-full shadow-sm">{dateStr}</span></div>
                                <div className="flex flex-col">
                                    {group.map((message, messageIndex) => {
                                        const prevMessage = messageIndex > 0 ? group[messageIndex - 1] : null;
                                        const senderHasChanged = !prevMessage || prevMessage.sender_name !== message.sender_name;
                                        const marginTopClass = senderHasChanged ? 'mt-3' : 'mt-0.5';

                                        return (
                                            <MessageBubble
                                                key={message.id}
                                                message={message}
                                                isOwnMessage={message.sender_name === rightAlignedUser}
                                                searchQuery={isSearching ? searchQuery : undefined}
                                                className={marginTopClass}
                                            />
                                        );
                                    })}
                                </div>
                                </React.Fragment>);})}</div>
                            </div>
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