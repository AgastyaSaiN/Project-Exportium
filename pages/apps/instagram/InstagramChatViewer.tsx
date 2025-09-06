import React, { useState, useMemo, useEffect, useRef, useCallback, useLayoutEffect } from 'react';
import { Chat, Message, Photo, Video } from './types';

const MESSAGES_PER_PAGE = 50;
type LoadingStrategy = 'infinite' | 'full';

// --- Icon Components ---

const ArrowLeftIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
    </svg>
);

const SpinnerIcon: React.FC<{className?: string}> = ({className}) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className={className}>
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);

const SettingsIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-1.007 1.11-1.226.55-.22 1.156-.22 1.706 0 .55.22 1.02.684 1.11 1.226l.08 1.485a2.5 2.5 0 011.82 2.336 2.5 2.5 0 01-.1 1.026l.42 1.696a2.5 2.5 0 01-2.22 3.097l-1.696-.42a2.5 2.5 0 01-1.026-.1 2.5 2.5 0 01-2.336-1.82l-1.485-.08a2.5 2.5 0 01-3.097-2.22l.42-1.696a2.5 2.5 0 01.1-1.026 2.5 2.5 0 011.82-2.336l1.485.08zm-2.478 8.485a.5.5 0 01.378-.85l.74-.185a2.5 2.5 0 012.336 1.82.5.5 0 01-.85.378l-.185.74a2.5 2.5 0 01-1.82-2.336zM12 15.75a3.75 3.75 0 100-7.5 3.75 3.75 0 000 7.5z" />
    </svg>
);


const CloseIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
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

const SettingsModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    currentStrategy: LoadingStrategy;
    onStrategyChange: (strategy: LoadingStrategy) => void;
}> = ({ isOpen, onClose, currentStrategy, onStrategyChange }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-30" onClick={onClose}>
            <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md mx-4" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold text-slate-800">Display Settings</h2>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-slate-100"><CloseIcon className="w-6 h-6 text-slate-500" /></button>
                </div>
                <div className="space-y-4">
                    <p className="text-sm text-slate-600">Choose how messages are loaded into the conversation view.</p>
                    <div
                        onClick={() => onStrategyChange('infinite')}
                        className={`p-4 border rounded-lg cursor-pointer transition-all ${currentStrategy === 'infinite' ? 'border-pink-500 bg-pink-50 ring-2 ring-pink-200' : 'border-slate-300 hover:border-slate-400'}`}
                    >
                        <h3 className="font-semibold text-slate-800">Incremental Loading</h3>
                        <p className="text-sm text-slate-500 mt-1">Loads {MESSAGES_PER_PAGE} messages at a time as you scroll. Best for performance.</p>
                    </div>
                    <div
                        onClick={() => onStrategyChange('full')}
                        className={`p-4 border rounded-lg cursor-pointer transition-all ${currentStrategy === 'full' ? 'border-pink-500 bg-pink-50 ring-2 ring-pink-200' : 'border-slate-300 hover:border-slate-400'}`}
                    >
                        <h3 className="font-semibold text-slate-800">Load All Messages</h3>
                        <p className="text-sm text-slate-500 mt-1">Loads the entire conversation at once. Useful for searching, but may cause lag on very large chats.</p>
                    </div>
                </div>
            </div>
        </div>
    );
};


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
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [loadingStrategy, setLoadingStrategy] = useState<LoadingStrategy>('infinite');
    
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const topSentinelRef = useRef<HTMLDivElement>(null);
    const dateRefs = useRef<Map<string, HTMLDivElement>>(new Map());
    
    const [stickyDate, setStickyDate] = useState('');
    const [displayedMessageCount, setDisplayedMessageCount] = useState(MESSAGES_PER_PAGE);
    const scrollState = useRef({ isRestoring: false, oldScrollHeight: 0 });

    const selectedChat = useMemo(() => loadedChats[selectedChatId || ''] || null, [selectedChatId, loadedChats]);

    const { displayedMessages, hasMoreMessages } = useMemo(() => {
        if (!selectedChat?.messages) return { displayedMessages: [], hasMoreMessages: false };
        const totalMessages = selectedChat.messages.length;
        const messages = selectedChat.messages.slice(Math.max(0, totalMessages - displayedMessageCount));
        const hasMore = loadingStrategy === 'infinite' && displayedMessageCount < totalMessages;
        return {
            displayedMessages: messages,
            hasMoreMessages: hasMore,
        };
    }, [selectedChat, displayedMessageCount, loadingStrategy]);

    const handleStrategyChange = (newStrategy: LoadingStrategy) => {
        setLoadingStrategy(newStrategy);
        if (selectedChat) {
            if (newStrategy === 'infinite') {
                setDisplayedMessageCount(MESSAGES_PER_PAGE);
            } else {
                setDisplayedMessageCount(Number.MAX_SAFE_INTEGER);
            }
        }
    };

    const handleSelectChat = useCallback(async (chat: Chat) => {
        setIsSidebarVisible(false);
        if (loadingStrategy === 'infinite') {
            setDisplayedMessageCount(MESSAGES_PER_PAGE);
        } else {
            setDisplayedMessageCount(Number.MAX_SAFE_INTEGER);
        }

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
    }, [onLoadMessages, loadedChats, loadingStrategy]);
    
    useEffect(() => {
        if (chats.length > 0 && !selectedChatId) {
            handleSelectChat(chats[0]);
        }
    }, [chats, selectedChatId, handleSelectChat]);

    const loadMoreMessages = useCallback(() => {
        if (isLoading || !hasMoreMessages) return;
        const container = scrollContainerRef.current;
        if (!container) return;

        scrollState.current = { isRestoring: true, oldScrollHeight: container.scrollHeight };
        const totalMessages = selectedChat?.messages?.length || 0;
        setDisplayedMessageCount(prev => Math.min(totalMessages, prev + MESSAGES_PER_PAGE));
    }, [isLoading, hasMoreMessages, selectedChat?.messages.length]);

    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting) {
                    loadMoreMessages();
                }
            },
            { root: scrollContainerRef.current, threshold: 0.5 }
        );

        const sentinel = topSentinelRef.current;
        if (sentinel && hasMoreMessages) {
             observer.observe(sentinel);
        }
        return () => { if (sentinel) observer.unobserve(sentinel); };
    }, [loadMoreMessages, hasMoreMessages]);


    useLayoutEffect(() => {
        const container = scrollContainerRef.current;
        if (!container) return;

        if (scrollState.current.isRestoring) {
            container.scrollTop = container.scrollHeight - scrollState.current.oldScrollHeight;
            scrollState.current.isRestoring = false;
        } else {
            container.scrollTop = container.scrollHeight;
        }
    }, [displayedMessages]);

     const handleScroll = () => {
        const panel = scrollContainerRef.current;
        if (!panel) return;

        let currentDate = '';
        const panelTop = panel.getBoundingClientRect().top;
        
        for (const [date, ref] of dateRefs.current.entries()) {
            if(ref) {
                 const rect = ref.getBoundingClientRect();
                 if (rect.top <= panelTop) {
                    currentDate = date;
                }
            }
        }
        setStickyDate(currentDate);
    };

    return (
        <div className="flex w-full h-full bg-white overflow-hidden relative">
            <SettingsModal 
                isOpen={isSettingsOpen}
                onClose={() => setIsSettingsOpen(false)}
                currentStrategy={loadingStrategy}
                onStrategyChange={handleStrategyChange}
            />
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

            <main className="flex flex-col w-full h-full">
                {selectedChat ? (
                    <>
                        <header className="p-3 border-b border-slate-200 flex items-center justify-between shadow-sm">
                           <div className="flex items-center min-w-0">
                                <button onClick={() => setIsSidebarVisible(true)} className="md:hidden p-2 mr-2 rounded-full hover:bg-slate-100"><ArrowLeftIcon className="w-5 h-5 text-slate-600" /></button>
                                 <UserAvatar name={selectedChat.title} />
                                <div className="ml-4 truncate">
                                   <h3 className="text-xl font-bold text-slate-800 truncate">{selectedChat.title}</h3>
                                   <p className="text-sm text-slate-500 truncate">{selectedChat.participants.map(p => p.name).join(', ')}</p>
                                </div>
                           </div>
                           <div className="flex-shrink-0 ml-2">
                                <button
                                    onClick={() => setIsSettingsOpen(true)}
                                    className="p-2 rounded-full hover:bg-slate-200 transition-colors"
                                    aria-label="Chat settings"
                                >
                                    <SettingsIcon className="w-6 h-6 text-slate-600" />
                                </button>
                           </div>
                        </header>
                        {isLoading ? <SkeletonLoader /> : error ? (
                             <div className="flex-grow flex items-center justify-center text-center text-red-500 bg-slate-50 p-4"><div><h2 className="text-2xl font-semibold">Error Loading Chat</h2><p className="mt-2">{error}</p></div></div>
                        ) : (
                        <div ref={scrollContainerRef} onScroll={handleScroll} className="flex-grow p-6 overflow-y-auto bg-slate-50 relative">
                             <div className="flex flex-col gap-3">
                                {stickyDate && (
                                     <div className="sticky top-0 z-10 flex justify-center py-2">
                                        <span className="bg-slate-200 text-slate-600 text-xs font-semibold px-3 py-1 rounded-full">{stickyDate}</span>
                                    </div>
                                )}
                                {hasMoreMessages && (
                                    <div ref={topSentinelRef} className="flex justify-center p-4">
                                        <SpinnerIcon className="w-8 h-8 text-slate-400 animate-spin" />
                                    </div>
                                )}
                                {displayedMessages.map((msg, displayedIndex) => {
                                    const fullMessages = selectedChat.messages;
                                    const startingIndex = Math.max(0, fullMessages.length - displayedMessageCount);
                                    const fullIndex = startingIndex + displayedIndex;
                                    const prevMsg = fullMessages[fullIndex - 1];

                                    const showDateSeparator = !prevMsg || new Date(msg.timestamp_ms).toDateString() !== new Date(prevMsg.timestamp_ms).toDateString();
                                    const dateStr = formatDateSeparator(msg.timestamp_ms);
                                    const isOwnMessage = msg.sender_name === ownerName;
                                    const showSender = !isOwnMessage && (!prevMsg || prevMsg.sender_name !== msg.sender_name || msg.timestamp_ms - prevMsg.timestamp_ms > 300000);

                                    return (<React.Fragment key={`${msg.timestamp_ms}-${fullIndex}`}>
                                        {showDateSeparator && (
                                            <div
                                                ref={(ref) => {
                                                    if (ref) dateRefs.current.set(dateStr, ref);
                                                    else dateRefs.current.delete(dateStr);
                                                }}
                                                className="flex justify-center my-4"
                                            >
                                                <span className="bg-slate-200 text-slate-600 text-xs font-semibold px-3 py-1 rounded-full">{dateStr}</span>
                                            </div>
                                        )}
                                        <MessageBubble message={msg} isOwnMessage={isOwnMessage} showSender={showSender} />
                                    </React.Fragment>);
                                })}
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