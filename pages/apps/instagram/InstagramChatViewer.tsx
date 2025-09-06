
import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { Chat, Message, Photo, Video } from './types';

const ArrowLeftIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
    </svg>
);

// --- Helper Functions ---
const formatTimestamp = (timestamp_ms: number) => new Date(timestamp_ms).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' });

const getMessagePreview = (message?: Message): string => {
    if (!message) return '...';
    if (message.content) return message.content;
    if (message.photos?.length) return '📷 Photo';
    if (message.videos?.length) return '📹 Video';
    return 'Unsupported message';
};

const formatDateSeparator = (timestamp_ms: number) => {
    const date = new Date(timestamp_ms);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) return 'Today';
    if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return date.toLocaleDateString([], { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
};

// --- Sub-components ---

const UserAvatar: React.FC<{ name: string }> = React.memo(({ name }) => {
    const initial = name.charAt(0).toUpperCase();
    const colors = ['bg-pink-200 text-pink-700', 'bg-blue-200 text-blue-700', 'bg-green-200 text-green-700', 'bg-purple-200 text-purple-700', 'bg-yellow-200 text-yellow-700'];
    const colorClass = colors[name.charCodeAt(0) % colors.length];
    return (
        <div className={`w-11 h-11 rounded-full ${colorClass} flex items-center justify-center font-bold text-lg flex-shrink-0`}>
            {initial}
        </div>
    );
});

const PhotoDisplay: React.FC<{ photo: Photo }> = ({ photo }) => (
    <a href={photo.blobUrl} target="_blank" rel="noopener noreferrer">
        <img src={photo.blobUrl} alt="Shared content" className="max-w-xs sm:max-w-sm max-h-80 rounded-lg object-contain" />
    </a>
);

const VideoDisplay: React.FC<{ video: Video }> = ({ video }) => (
    <video src={video.blobUrl} controls className="max-w-xs sm:max-w-sm max-h-80 rounded-lg" />
);

const MessageBubble: React.FC<{ message: Message; isOwnMessage: boolean; showSender: boolean }> = ({ message, isOwnMessage, showSender }) => {
    const bubbleColor = isOwnMessage ? 'bg-pink-500 text-white' : 'bg-white text-slate-800 border border-slate-200';
    
    return (
        <div className={`flex flex-col max-w-lg ${isOwnMessage ? 'self-end items-end' : 'self-start items-start'}`}>
            <div className={`px-4 py-2.5 rounded-2xl ${bubbleColor}`}>
                {showSender && <p className="text-xs font-bold text-pink-600 mb-1">{message.sender_name}</p>}
                {message.content && <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>}
                <div className="flex flex-col gap-2 mt-2">
                    {message.photos?.map((photo, index) => <PhotoDisplay key={index} photo={photo} />)}
                    {message.videos?.map((video, index) => <VideoDisplay key={index} video={video} />)}
                </div>
            </div>
            <span className="text-xs text-slate-400 mt-1.5 px-2">{formatTimestamp(message.timestamp_ms)}</span>
        </div>
    );
};

const SkeletonLoader: React.FC = () => (
    <div className="flex-grow p-6 overflow-y-auto bg-slate-50 animate-pulse">
        <div className="flex flex-col gap-6">
            <div className="self-start w-2/3 h-16 bg-slate-200 rounded-lg"></div>
            <div className="self-end w-1/2 h-20 bg-slate-200 rounded-lg"></div>
            <div className="self-start w-1/3 h-12 bg-slate-200 rounded-lg"></div>
            <div className="self-end w-3/4 h-24 bg-slate-200 rounded-lg"></div>
            <div className="self-start w-1/2 h-16 bg-slate-200 rounded-lg"></div>
        </div>
    </div>
);

// --- Main Viewer Component ---
interface InstagramChatViewerProps {
    chats: Chat[];
    ownerName: string;
    onLoadMessages: (chatPath: string) => Promise<Message[]>;
}

const InstagramChatViewer: React.FC<InstagramChatViewerProps> = ({ chats, ownerName, onLoadMessages }) => {
    const [loadedChats, setLoadedChats] = useState<Record<string, Chat>>({});
    const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isSidebarVisible, setIsSidebarVisible] = useState(true);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const mainPanelRef = useRef<HTMLDivElement>(null);
    const dateRefs = useRef<Map<string, HTMLDivElement>>(new Map());
    const [stickyDate, setStickyDate] = useState('');

    const selectedChat = useMemo(() => loadedChats[selectedChatId || ''] || null, [selectedChatId, loadedChats]);

    const handleSelectChat = useCallback(async (chat: Chat) => {
        setIsSidebarVisible(false);
        if (loadedChats[chat.id]) {
            setSelectedChatId(chat.id);
            return;
        }

        setSelectedChatId(chat.id);
        setIsLoading(true);
        setError(null);
        try {
            const messages = await onLoadMessages(chat.path);
            setLoadedChats(prev => ({ ...prev, [chat.id]: { ...chat, messages } }));
        } catch (e) {
            setError(e instanceof Error ? e.message : "An unknown error occurred.");
        } finally {
            setIsLoading(false);
        }
    }, [onLoadMessages, loadedChats]);
    
    useEffect(() => {
        if (chats.length > 0 && !selectedChatId) {
            handleSelectChat(chats[0]);
        }
    }, [chats, selectedChatId, handleSelectChat]);

    useEffect(() => {
        if (!isLoading && selectedChat) {
            messagesEndRef.current?.scrollIntoView();
        }
    }, [isLoading, selectedChat]);
    
     const handleScroll = () => {
        const panel = mainPanelRef.current;
        if (!panel) return;

        let currentDate = '';
        const panelTop = panel.getBoundingClientRect().top;
        
        for (const [date, ref] of dateRefs.current.entries()) {
            const rect = ref.getBoundingClientRect();
             if (rect.top <= panelTop) {
                currentDate = date;
            }
        }
        setStickyDate(currentDate);
    };


    return (
        <div className="flex w-full h-full bg-white overflow-hidden relative">
            {/* Sidebar with Chat List */}
            <aside className={`absolute md:relative w-full md:w-1/3 lg:w-1/4 border-r border-slate-200 flex flex-col transition-transform duration-300 ease-in-out z-10 bg-white h-full ${isSidebarVisible ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}>
                <header className="p-4 border-b border-slate-200">
                    <h2 className="text-xl font-bold text-slate-800">Your Chats</h2>
                    <p className="text-sm text-slate-500">{chats.length} conversations</p>
                </header>
                <div className="flex-grow overflow-y-auto">
                    {chats.map(chat => (
                        <div key={chat.id} onClick={() => handleSelectChat(chat)} className={`p-3 flex items-center cursor-pointer border-l-4 transition-colors duration-200 ${selectedChatId === chat.id ? 'border-pink-500 bg-slate-100' : 'border-transparent hover:bg-slate-50'}`}>
                            <UserAvatar name={chat.title} />
                            <div className="ml-4 truncate flex-grow">
                                <p className="font-semibold text-slate-900">{chat.title}</p>
                                <p className="text-sm text-slate-500 truncate">
                                    {getMessagePreview((loadedChats[chat.id]?.messages || []).slice(-1)[0])}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            </aside>

            {/* Main Chat Window */}
            <main className="flex flex-col w-full h-full">
                {selectedChat ? (
                    <>
                        <header className="p-3 border-b border-slate-200 flex items-center shadow-sm">
                            <button onClick={() => setIsSidebarVisible(true)} className="md:hidden p-2 mr-2 rounded-full hover:bg-slate-100"><ArrowLeftIcon className="w-5 h-5 text-slate-600" /></button>
                             <UserAvatar name={selectedChat.title} />
                            <div className="ml-4">
                               <h3 className="text-xl font-bold text-slate-800">{selectedChat.title}</h3>
                               <p className="text-sm text-slate-500">{selectedChat.participants.map(p => p.name).join(', ')}</p>
                            </div>
                        </header>
                        {isLoading ? <SkeletonLoader /> : error ? (
                             <div className="flex-grow flex items-center justify-center text-center text-red-500 bg-slate-50 p-4"><div><h2 className="text-2xl font-semibold">Error Loading Chat</h2><p className="mt-2">{error}</p></div></div>
                        ) : (
                        <div ref={mainPanelRef} onScroll={handleScroll} className="flex-grow p-6 overflow-y-auto bg-slate-50 relative">
                             <div className="flex flex-col gap-3">
                                {stickyDate && (
                                     <div className="sticky top-0 z-10 flex justify-center py-2">
                                        <span className="bg-slate-200 text-slate-600 text-xs font-semibold px-3 py-1 rounded-full">{stickyDate}</span>
                                    </div>
                                )}
                                {selectedChat.messages.map((msg, index) => {
                                    const prevMsg = selectedChat.messages[index - 1];
                                    const showDateSeparator = !prevMsg || new Date(msg.timestamp_ms).toDateString() !== new Date(prevMsg.timestamp_ms).toDateString();
                                    const dateStr = formatDateSeparator(msg.timestamp_ms);
                                    // FIX: 'isOwnMessage' was used before it was declared. Moved its declaration up.
                                    const isOwnMessage = msg.sender_name === ownerName;
                                    const showSender = !isOwnMessage && (!prevMsg || prevMsg.sender_name !== msg.sender_name || msg.timestamp_ms - prevMsg.timestamp_ms > 300000);

                                    return (<React.Fragment key={msg.timestamp_ms}>
                                        {showDateSeparator && (
                                            // FIX: Corrected ref callback to have a valid return type and handle cleanup.
                                            <div
                                                ref={(ref) => {
                                                    if (ref) {
                                                        dateRefs.current.set(dateStr, ref);
                                                    } else {
                                                        dateRefs.current.delete(dateStr);
                                                    }
                                                }}
                                                className="flex justify-center my-4"
                                            >
                                                <span className="bg-slate-200 text-slate-600 text-xs font-semibold px-3 py-1 rounded-full">{dateStr}</span>
                                            </div>
                                        )}
                                        <MessageBubble message={msg} isOwnMessage={isOwnMessage} showSender={showSender} />
                                    </React.Fragment>);
                                })}
                                <div ref={messagesEndRef} />
                            </div>
                        </div>
                        )}
                    </>
                ) : (
                    <div className="hidden md:flex flex-grow items-center justify-center text-center text-slate-500 bg-slate-50">
                       <div>
                         <h2 className="text-2xl font-semibold">Welcome to your archive viewer</h2>
                         <p className="mt-2">Select a conversation from the left to see your messages.</p>
                       </div>
                    </div>
                )}
            </main>
        </div>
    );
};

export default InstagramChatViewer;