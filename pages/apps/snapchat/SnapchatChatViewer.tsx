
import React, { useState, useMemo, useEffect, useRef } from 'react';
import JSZip from 'jszip';
import { InternalChat, InternalMessage, InternalMedia } from './types';

// Icons
const SearchIcon = (props: any) => (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" /></svg>);
const ArrowLeftIcon = (props: any) => (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" /></svg>);
const PlayIcon = (props: any) => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" {...props}><path fillRule="evenodd" d="M4.5 5.653c0-1.426 1.529-2.33 2.779-1.643l11.54 6.348c1.295.712 1.295 2.573 0 3.285L7.28 19.991c-1.25.687-2.779-.217-2.779-1.643V5.653z" clipRule="evenodd" /></svg>);
const PhotoIcon = (props: any) => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" {...props}><path fillRule="evenodd" d="M1.5 6a2.25 2.25 0 012.25-2.25h16.5A2.25 2.25 0 0122.5 6v12a2.25 2.25 0 01-2.25 2.25H3.75A2.25 2.25 0 011.5 18V6zM3 16.06V18c0 .414.336.75.75.75h16.5A.75.75 0 0021 18v-1.94l-2.69-2.689a1.5 1.5 0 00-2.12 0l-.88.879.97.97a.75.75 0 11-1.06 1.06l-5.16-5.159a1.5 1.5 0 00-2.12 0L3 16.061zm10.125-7.81a1.125 1.125 0 112.25 0 1.125 1.125 0 01-2.25 0z" clipRule="evenodd" /></svg>);
const SettingsIcon = (props: any) => (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-1.007 1.11-1.226.55-.22 1.156-.22 1.706 0 .55.22 1.02.684 1.11 1.226l.08 1.485a2.5 2.5 0 011.82 2.336 2.5 2.5 0 01-.1 1.026l.42 1.696a2.5 2.5 0 01-2.22 3.097l-1.696-.42a2.5 2.5 0 01-1.026-.1 2.5 2.5 0 01-2.336-1.82l-1.485-.08a2.5 2.5 0 01-3.097-2.22l.42-1.696a2.5 2.5 0 01.1-1.026 2.5 2.5 0 011.82-2.336l1.485.08zm-2.478 8.485a.5.5 0 01.378-.85l.74-.185a2.5 2.5 0 012.336 1.82.5.5 0 01-.85.378l-.185.74a2.5 2.5 0 01-1.82-2.336zM12 15.75a3.75 3.75 0 100-7.5 3.75 3.75 0 000 7.5z" /></svg>);
const CloseIcon = (props: any) => (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>);

// Helpers
const formatTime = (ts: number) => new Date(ts).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
const formatDate = (ts: number) => new Date(ts).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });

// Avatar Generator
const Avatar = ({ name }: { name: string }) => {
    const initial = (name || "?").charAt(0).toUpperCase();
    return (
        <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center text-yellow-400 font-bold text-lg border border-gray-600">
            {initial}
        </div>
    );
};

// Message Component
const MessageBubble: React.FC<{ msg: InternalMessage, isOwner: boolean, zip: JSZip | null }> = ({ msg, isOwner, zip }) => {
    const [mediaUrl, setMediaUrl] = useState<string | null>(null);

    useEffect(() => {
        if (msg.media && zip) {
            // Load media from zip on demand
            const loadMedia = async () => {
                const file = zip.file(msg.media!.uri);
                if (file) {
                    const blob = await file.async('blob');
                    setMediaUrl(URL.createObjectURL(blob));
                }
            };
            loadMedia();
        }
    }, [msg.media, zip]);

    // Color Coding based on Type
    // SNAP (Red/Purple) vs CHAT (Blue)
    // Saved Messages usually have gray background
    let borderColor = 'border-l-4 border-blue-500'; // Default Chat
    let bgColor = isOwner ? 'bg-gray-800' : 'bg-gray-800'; // Snapchat uses similar bg for both, alignment differs
    
    if (msg.type === 'IMAGE') borderColor = 'border-l-4 border-red-500';
    if (msg.type === 'VIDEO') borderColor = 'border-l-4 border-purple-500';
    if (msg.isSaved) bgColor = 'bg-gray-700'; // Saved messages darker

    // Alignment
    const alignClass = isOwner ? 'justify-end' : 'justify-start';
    
    return (
        <div className={`flex w-full mb-2 ${alignClass}`}>
            <div className={`max-w-[70%] rounded-lg overflow-hidden ${bgColor} ${borderColor} shadow-sm`}>
                {msg.media && (
                    <div className="relative">
                        {mediaUrl ? (
                            msg.media.type === 'video' ? (
                                <video src={mediaUrl} controls className="w-full max-h-80 object-contain bg-black" />
                            ) : (
                                <img src={mediaUrl} alt="Snap" className="w-full max-h-80 object-cover" />
                            )
                        ) : (
                            <div className="w-48 h-48 bg-gray-900 flex flex-col items-center justify-center text-gray-500">
                                {msg.media.type === 'video' ? <PlayIcon className="w-8 h-8" /> : <PhotoIcon className="w-8 h-8" />}
                                <span className="text-xs mt-2">Loading...</span>
                            </div>
                        )}
                    </div>
                )}
                
                {/* Text Content */}
                {(msg.content || (!msg.media)) && (
                    <div className="px-3 py-2">
                        {msg.content ? (
                            <p className="text-sm text-gray-200 whitespace-pre-wrap">{msg.content}</p>
                        ) : (
                            <p className="text-sm text-gray-500 italic uppercase font-bold text-[10px] tracking-wider">
                                {msg.type}
                            </p>
                        )}
                        <p className="text-[10px] text-gray-500 mt-1 text-right">{formatTime(msg.timestamp)}</p>
                    </div>
                )}
            </div>
        </div>
    );
};

const SettingsModal: React.FC<{ isOpen: boolean; onClose: () => void; currentOwner: string; onOwnerChange: (newOwner: string) => void }> = ({ isOpen, onClose, currentOwner, onOwnerChange }) => {
    const [inputValue, setInputValue] = useState(currentOwner);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-sm p-6 space-y-4" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center">
                    <h3 className="text-xl font-bold text-white">Viewer Settings</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-white">
                        <CloseIcon className="w-6 h-6" />
                    </button>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">My Username (Alignment)</label>
                    <div className="flex gap-2">
                        <input 
                            type="text" 
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            className="flex-1 bg-black border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-yellow-400"
                            placeholder="Enter username..."
                        />
                        <button 
                            onClick={() => { onOwnerChange(inputValue); onClose(); }}
                            className="bg-yellow-400 text-black font-bold px-4 py-2 rounded-lg hover:bg-yellow-300 transition-colors"
                        >
                            Save
                        </button>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                        Messages sent by this username will appear on the right side.
                    </p>
                </div>
            </div>
        </div>
    );
};

interface SnapchatChatViewerProps {
    chats: InternalChat[];
    owner: string;
    zipFile: File | null;
    onBack: () => void;
}

const SnapchatChatViewer: React.FC<SnapchatChatViewerProps> = ({ chats, owner, zipFile, onBack }) => {
    const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [zipInstance, setZipInstance] = useState<JSZip | null>(null);
    const [currentOwner, setCurrentOwner] = useState(owner);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);

    useEffect(() => {
        if (zipFile) {
            JSZip.loadAsync(zipFile).then(setZipInstance);
        }
    }, [zipFile]);

    // Update internal owner state if prop changes (re-upload)
    useEffect(() => {
        setCurrentOwner(owner);
    }, [owner]);

    const filteredChats = useMemo(() => {
        return chats.filter(c => c.participant.toLowerCase().includes(searchTerm.toLowerCase()));
    }, [chats, searchTerm]);

    const selectedChat = useMemo(() => chats.find(c => c.id === selectedChatId), [chats, selectedChatId]);

    return (
        <div className="flex h-screen bg-black text-white overflow-hidden">
            <SettingsModal 
                isOpen={isSettingsOpen} 
                onClose={() => setIsSettingsOpen(false)} 
                currentOwner={currentOwner} 
                onOwnerChange={setCurrentOwner} 
            />

            {/* Sidebar */}
            <div className={`${selectedChatId ? 'hidden md:flex' : 'flex'} flex-col w-full md:w-80 border-r border-gray-800 bg-black`}>
                <div className="p-4 border-b border-gray-800 flex items-center gap-2">
                     <button onClick={onBack} className="p-2 hover:bg-gray-800 rounded-full">
                        <ArrowLeftIcon className="w-5 h-5 text-gray-400" />
                     </button>
                     <h2 className="font-bold text-lg">Chats</h2>
                </div>
                <div className="p-4">
                    <div className="relative">
                        <input 
                            type="text" 
                            placeholder="Search Friends" 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-gray-900 border border-gray-700 rounded-full py-2 pl-10 pr-4 text-sm focus:outline-none focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400 transition-all"
                        />
                        <SearchIcon className="w-4 h-4 text-gray-500 absolute left-3.5 top-2.5" />
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto">
                    {filteredChats.map(chat => (
                        <div 
                            key={chat.id} 
                            onClick={() => setSelectedChatId(chat.id)}
                            className={`flex items-center gap-3 p-3 cursor-pointer hover:bg-gray-900 transition-colors ${selectedChatId === chat.id ? 'bg-gray-900 border-l-4 border-yellow-400' : 'border-l-4 border-transparent'}`}
                        >
                            <Avatar name={chat.participant} />
                            <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-baseline">
                                    <h3 className="font-bold truncate">{chat.participant}</h3>
                                    <span className="text-xs text-gray-500">{formatDate(chat.lastActivity)}</span>
                                </div>
                                <p className="text-xs text-gray-400 truncate">
                                    {chat.messageCount} messages • {chat.mediaCount} media
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Main Chat Area */}
            <div className={`${!selectedChatId ? 'hidden md:flex' : 'flex'} flex-1 flex-col bg-gray-950`}>
                {selectedChat ? (
                    <>
                        <div className="h-16 border-b border-gray-800 flex items-center justify-between px-4 bg-gray-900/50 backdrop-blur-sm">
                            <div className="flex items-center gap-3">
                                <button onClick={() => setSelectedChatId(null)} className="md:hidden p-2 -ml-2 hover:bg-gray-800 rounded-full">
                                    <ArrowLeftIcon className="w-5 h-5" />
                                </button>
                                <Avatar name={selectedChat.participant} />
                                <div>
                                    <h2 className="font-bold">{selectedChat.participant}</h2>
                                </div>
                            </div>
                            <button 
                                onClick={() => setIsSettingsOpen(true)}
                                className="p-2 hover:bg-gray-800 rounded-full text-gray-400 hover:text-white transition-colors"
                            >
                                <SettingsIcon className="w-6 h-6" />
                            </button>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto p-4 space-y-1">
                            {/* Messages */}
                            {(() => {
                                const messages = [];
                                let lastDate = '';
                                
                                for (const msg of selectedChat.messages) {
                                    const dateStr = formatDate(msg.timestamp);
                                    if (dateStr !== lastDate) {
                                        messages.push(
                                            <div key={`date-${dateStr}`} className="flex justify-center my-4">
                                                <span className="bg-gray-800 text-gray-400 text-xs px-3 py-1 rounded-full font-bold uppercase tracking-wider">{dateStr}</span>
                                            </div>
                                        );
                                        lastDate = dateStr;
                                    }
                                    messages.push(
                                        <MessageBubble 
                                            key={msg.id} 
                                            msg={msg} 
                                            isOwner={msg.sender === currentOwner} 
                                            zip={zipInstance} 
                                        />
                                    );
                                }
                                return messages;
                            })()}
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-gray-600">
                        <div className="w-24 h-24 bg-gray-900 rounded-full flex items-center justify-center mb-4">
                            <svg className="w-12 h-12 text-yellow-400" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12.002 2.006C7.584 2.006 4 5.592 4 10.005v.553c0 3.328 1.463 6.324 3.82 8.256.002.002.004.004.006.005a.707.707 0 00.708-.002c.22-.16.37-.41.37-.68V16.5c0-.414.336-.75.75-.75h6.69c.414 0 .75.336.75.75v1.64c0 .268.15.52.37.68.002.001.003.003.005.004a.707.707 0 00.708 0c2.357-1.933 3.82-4.928 3.82-8.256v-.553c0-4.413-3.584-8-7.998-8zM9.001 9.505c-.828 0-1.5-.895-1.5-2s.672-2 1.5-2 1.5.895 1.5 2-.672 2-1.5 2zm6 0c-.828 0-1.5-.895-1.5-2s.672-2 1.5-2 1.5.895 1.5 2-.672 2-1.5 2z" />
                            </svg>
                        </div>
                        <p className="text-lg font-medium">Select a conversation to start viewing</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default SnapchatChatViewer;
