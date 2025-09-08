import React, { useState, useMemo, useEffect, useRef, useCallback, useLayoutEffect } from 'react';
import { Chat, Message, Photo, Video } from './types';

const MESSAGES_PER_PAGE = 50;
type LoadingStrategy = 'infinite' | 'full';
type Theme = 'light' | 'dark';

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

const SearchIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
    </svg>
);

const XCircleIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);

const PhotoIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
    </svg>
);

const ChatBubbleIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.76 9.76 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.455.09-.91.09-1.365 0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
    </svg>
);

const ExpandIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M20.25 20.25v-4.5m0 4.5h-4.5m4.5 0L15 15" />
    </svg>
);

const PlayCircleIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.91 11.672a.375.375 0 010 .656l-5.603 3.113a.375.375 0 01-.557-.328V8.887c0-.286.307-.466.557-.327l5.603 3.112z" />
    </svg>
);

const SunIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
    </svg>
);
  
const MoonIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />
    </svg>
);

const CameraIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.776 48.776 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" />
    </svg>
);


// --- Helper Functions ---
const formatTimestamp = (timestamp_ms: number) => new Date(timestamp_ms).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

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

// IMPORTANT: By including the full class name string here, we ensure Tailwind's JIT compiler
// recognizes and generates the necessary CSS for these dynamic gradient classes.
const THEMES: Record<string, { name: string, gradient: string, ring: string }> = {
    default: { name: 'Default', gradient: 'bg-gradient-to-br from-pink-500 to-rose-500', ring: 'ring-pink-500' },
    ocean: { name: 'Ocean', gradient: 'bg-gradient-to-br from-blue-500 to-cyan-400', ring: 'ring-blue-500' },
    sunset: { name: 'Sunset', gradient: 'bg-gradient-to-br from-amber-500 to-orange-600', ring: 'ring-amber-500' },
    forest: { name: 'Forest', gradient: 'bg-gradient-to-br from-green-500 to-emerald-500', ring: 'ring-green-500' },
    amethyst: { name: 'Amethyst', gradient: 'bg-gradient-to-br from-purple-500 to-indigo-600', ring: 'ring-purple-500' }
};


// --- Sub-components ---

const HighlightedText: React.FC<{ text: string; highlight: string }> = ({ text, highlight }) => {
    if (!highlight.trim()) {
        return <>{text}</>;
    }
    const regex = new RegExp(`(${highlight.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);
    return (
        <>
            {parts.map((part, i) =>
                regex.test(part) ? (
                    <mark key={i} className="bg-yellow-200 dark:bg-yellow-500 text-slate-900 rounded px-0.5 py-0">
                        {part}
                    </mark>
                ) : (
                    part
                )
            )}
        </>
    );
};


const UserAvatar: React.FC<{ name: string; className?: string; imageUrl?: string | null; onClick?: (e: React.MouseEvent<HTMLDivElement>) => void; }> = React.memo(({ name, className = '', imageUrl, onClick }) => {
    const initial = name.charAt(0).toUpperCase();
    const colors = ['bg-pink-200 text-pink-700', 'bg-blue-200 text-blue-700', 'bg-green-200 text-green-700', 'bg-purple-200 text-purple-700', 'bg-yellow-200 text-yellow-700'];
    const colorClass = colors[name.charCodeAt(0) % colors.length];

    const content = imageUrl ? (
        <img src={imageUrl} alt={name} className={`rounded-full object-cover w-full h-full ${className}`} />
    ) : (
        <div className={`rounded-full ${colorClass} flex items-center justify-center font-bold w-full h-full ${className}`}>
            {initial}
        </div>
    );

    return (
        <div
            className={`relative flex-shrink-0 ${onClick ? 'cursor-pointer' : ''} ${className}`}
            onClick={onClick}
        >
            <div className="w-full h-full">{content}</div>
            {onClick && (
                <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                    <CameraIcon className="w-1/2 h-1/2 text-white" />
                </div>
            )}
        </div>
    );
});

const useIntersectionObserver = (options: IntersectionObserverInit) => {
    const [entry, setEntry] = useState<IntersectionObserverEntry | null>(null);
    const observer = useRef<IntersectionObserver | null>(null);
    const ref = useRef(null);

    useEffect(() => {
        const node = ref.current;
        if (!node) return;

        observer.current = new IntersectionObserver(([entry]) => {
            if (entry.isIntersecting) {
                setEntry(entry);
                if (observer.current) {
                    observer.current.unobserve(node);
                }
            }
        }, options);

        observer.current.observe(node);

        return () => {
            if (observer.current) {
                observer.current.disconnect();
            }
        };
    }, [options]);

    return [ref, entry] as const;
};

const LazyMedia: React.FC<{ uri: string, createBlobUrl: (uri: string) => Promise<string | undefined>, isVideo: boolean, className?: string }> = ({ uri, createBlobUrl, isVideo, className }) => {
    const [blobUrl, setBlobUrl] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [ref, entry] = useIntersectionObserver({ threshold: 0.1, rootMargin: '200px' });

    useEffect(() => {
        if (entry?.isIntersecting && !blobUrl && !isLoading) {
            setIsLoading(true);
            createBlobUrl(uri).then(url => {
                if (url) {
                    setBlobUrl(url);
                }
            }).finally(() => {
                setIsLoading(false);
            });
        }
    }, [entry, uri, createBlobUrl, blobUrl, isLoading]);

    if (blobUrl) {
        if (isVideo) {
            return <video src={blobUrl} controls className={className} />;
        }
        return <img src={blobUrl} alt="A photo shared in the chat" className={className} />;
    }
    
    const placeholderClass = isVideo ? 'aspect-video' : '';

    return (
        <div ref={ref} className={`${className} ${placeholderClass} bg-slate-200 dark:bg-slate-700 flex items-center justify-center`}>
            {isLoading ? <SpinnerIcon className="w-6 h-6 text-slate-400 animate-spin" /> : <PhotoIcon className="w-8 h-8 text-slate-400" />}
        </div>
    );
};


const PhotoGrid: React.FC<{ photos: Photo[], createBlobUrl: (uri: string) => Promise<string | undefined> }> = ({ photos, createBlobUrl }) => {
    const gridClasses = [
        '', // 0
        'grid-cols-1', // 1
        'grid-cols-2', // 2
        'grid-cols-2 grid-rows-2', // 3, special case below
        'grid-cols-2 grid-rows-2', // 4
    ];
    const count = photos.length;
    let gridClass = count < gridClasses.length ? gridClasses[count] : 'grid-cols-3 grid-rows-auto';
    if (count === 3) gridClass = 'grid-cols-2 grid-rows-2';

    return (
        <div className={`grid gap-1 ${gridClass} max-w-sm`}>
            {photos.map((photo, index) => {
                let itemClass = '';
                if (count === 3 && index === 0) itemClass = 'row-span-2';

                return (
                    <div key={photo.uri} className={`overflow-hidden rounded-md aspect-square ${itemClass}`}>
                        <LazyMedia uri={photo.uri} createBlobUrl={createBlobUrl} isVideo={false} className="w-full h-full object-cover" />
                    </div>
                )
            })}
        </div>
    );
};


const VideoDisplay: React.FC<{ video: Video, createBlobUrl: (uri: string) => Promise<string | undefined> }> = ({ video, createBlobUrl }) => (
     <LazyMedia uri={video.uri} createBlobUrl={createBlobUrl} isVideo={true} className="max-w-xs sm:max-w-sm max-h-80 rounded-lg" />
);

const MessageBubble: React.FC<{
    message: Message;
    isOwnMessage: boolean;
    isFirstInGroup: boolean;
    isLastInGroup: boolean;
    searchQuery?: string;
    isSearching: boolean;
    onJumpFromSearch?: (messageId: string) => void;
    theme: string;
    createBlobUrl: (uri: string) => Promise<string | undefined>;
}> = ({ message, isOwnMessage, isFirstInGroup, isLastInGroup, searchQuery, isSearching, onJumpFromSearch, theme, createBlobUrl }) => {
    const themeClasses = THEMES[theme]?.gradient || THEMES.default.gradient;
    const bubbleColor = isOwnMessage ? `${themeClasses} text-white` : 'bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 shadow-sm';
    
    const roundingClasses = isOwnMessage
        ? `${isFirstInGroup ? 'rounded-t-2xl' : ''} ${isLastInGroup ? 'rounded-b-2xl' : ''} rounded-l-2xl`
        : `${isFirstInGroup ? 'rounded-t-2xl' : ''} ${isLastInGroup ? 'rounded-b-2xl' : ''} rounded-r-2xl`;
    
    return (
        <div
            id={`message-${message.id}`}
            className={`group flex items-end gap-2 max-w-lg ${isOwnMessage ? 'self-end' : 'self-start'} ${isSearching ? 'cursor-pointer' : ''}`}
            onClick={isSearching ? () => onJumpFromSearch?.(message.id) : undefined}
        >
            <div className={`px-4 py-2.5 ${bubbleColor} ${roundingClasses}`}>
                {message.content && <p className="whitespace-pre-wrap leading-relaxed"><HighlightedText text={message.content} highlight={searchQuery || ''} /></p>}
                <div className={`flex flex-col gap-2 ${message.content ? 'mt-2' : ''}`}>
                    {message.photos && message.photos.length > 0 && <PhotoGrid photos={message.photos} createBlobUrl={createBlobUrl}/>}
                    {message.videos?.map((video, index) => <VideoDisplay key={index} video={video} createBlobUrl={createBlobUrl}/>)}
                </div>
            </div>
             <span className="text-xs text-slate-400 dark:text-slate-500 mb-1 hidden group-hover:block">{formatTimestamp(message.timestamp_ms)}</span>
        </div>
    );
};

const MessageGroup: React.FC<{
    messages: Message[];
    isOwnMessage: boolean;
    showAvatar: boolean;
    searchQuery?: string;
    isSearching: boolean;
    onJumpFromSearch?: (messageId: string) => void;
    customAvatarUrl?: string | null;
    onAvatarClick?: () => void;
    theme: string;
    createBlobUrl: (uri: string) => Promise<string | undefined>;
}> = ({ messages, isOwnMessage, showAvatar, searchQuery, isSearching, onJumpFromSearch, customAvatarUrl, onAvatarClick, theme, createBlobUrl }) => {
    if (!messages.length) return null;
    const senderName = messages[0].sender_name;

    return (
        <div className={`flex flex-col gap-0.5 w-full ${isOwnMessage ? 'items-end' : 'items-start'} opacity-0 animate-[fade-in_0.5s_ease-out_forwards]`}>
            <div className={`flex gap-3 ${isOwnMessage ? 'flex-row-reverse' : 'flex-row'}`}>
                {!isOwnMessage && showAvatar && <UserAvatar name={senderName} className="w-9 h-9 self-end" imageUrl={customAvatarUrl} onClick={onAvatarClick ? (e) => { e.stopPropagation(); onAvatarClick(); } : undefined} />}
                <div className="flex flex-col gap-0.5">
                    {!isOwnMessage && showAvatar && <p className="text-sm font-bold text-slate-700 dark:text-slate-300 ml-3 mb-1">{senderName}</p>}
                    {messages.map((msg, index) => (
                        <MessageBubble
                            key={msg.id}
                            message={msg}
                            isOwnMessage={isOwnMessage}
                            isFirstInGroup={index === 0}
                            isLastInGroup={index === messages.length - 1}
                            searchQuery={searchQuery}
                            isSearching={isSearching}
                            onJumpFromSearch={onJumpFromSearch}
                            theme={theme}
                            createBlobUrl={createBlobUrl}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
}

const SkeletonLoader: React.FC = () => (
    <div className="flex-grow p-6 overflow-y-auto bg-slate-50 dark:bg-slate-800/50 animate-pulse">
        <div className="flex flex-col gap-6">
            <div className="self-start w-2/3 h-16 bg-slate-200 dark:bg-slate-700 rounded-lg"></div>
            <div className="self-end w-1/2 h-20 bg-slate-200 dark:bg-slate-700 rounded-lg"></div>
            <div className="self-start w-1/3 h-12 bg-slate-200 dark:bg-slate-700 rounded-lg"></div>
            <div className="self-end w-3/4 h-24 bg-slate-200 dark:bg-slate-700 rounded-lg"></div>
            <div className="self-start w-1/2 h-16 bg-slate-200 dark:bg-slate-700 rounded-lg"></div>
        </div>
    </div>
);

const SettingsModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    currentStrategy: LoadingStrategy;
    onStrategyChange: (strategy: LoadingStrategy) => void;
    showAvatars: boolean;
    onShowAvatarsChange: (show: boolean) => void;
    currentTheme: string;
    onThemeChange: (theme: string) => void;
    onUploadBackground: () => void;
    onRemoveBackground: () => void;
    participants: { name: string }[];
    currentAlignment: string;
    onAlignmentChange: (name: string) => void;
    customAvatars: Record<string, string>;

}> = ({ 
    isOpen, onClose, currentStrategy, onStrategyChange, showAvatars, onShowAvatarsChange, currentTheme, onThemeChange, onUploadBackground, onRemoveBackground,
    participants, currentAlignment, onAlignmentChange, customAvatars
}) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-30" onClick={onClose}>
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl p-6 w-full max-w-md mx-4" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200">Display Settings</h2>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700"><CloseIcon className="w-6 h-6 text-slate-500 dark:text-slate-400" /></button>
                </div>
                
                <div className="space-y-6">
                    <div>
                        <h3 className="font-semibold text-slate-800 dark:text-slate-200 mb-2">Message Alignment</h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">Choose which user's messages appear on the right.</p>
                        <div className="space-y-2 max-h-40 overflow-y-auto pr-2">
                            {participants.map(p => (
                                <div
                                    key={p.name}
                                    onClick={() => onAlignmentChange(p.name)}
                                    className={`p-3 border rounded-lg cursor-pointer transition-all flex items-center gap-3 ${currentAlignment === p.name ? 'border-pink-500 bg-pink-50 dark:bg-pink-900/20 ring-2 ring-pink-200 dark:border-pink-500' : 'border-slate-300 dark:border-slate-600 hover:border-slate-400 dark:hover:border-slate-500'}`}
                                >
                                    <UserAvatar name={p.name} className="w-8 h-8" imageUrl={customAvatars[p.name]} />
                                    <span className="font-semibold text-slate-800 dark:text-slate-200">{p.name}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div>
                        <h3 className="font-semibold text-slate-800 dark:text-slate-200 mb-3">Appearance</h3>
                         <div className="flex items-center justify-between p-4 border border-slate-300 dark:border-slate-600 rounded-lg mb-3">
                            <label htmlFor="showAvatars" className="font-semibold text-slate-800 dark:text-slate-200 cursor-pointer">Show Avatars</label>
                            <button
                                id="showAvatars"
                                role="switch"
                                aria-checked={showAvatars}
                                onClick={() => onShowAvatarsChange(!showAvatars)}
                                className={`${showAvatars ? 'bg-pink-500' : 'bg-slate-300 dark:bg-slate-600'} relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-pink-500 focus:ring-offset-2 dark:focus:ring-offset-slate-800`}
                            >
                                <span className={`${showAvatars ? 'translate-x-6' : 'translate-x-1'} inline-block h-4 w-4 transform rounded-full bg-white transition-transform`} />
                            </button>
                        </div>
                         <div className="p-4 border border-slate-300 dark:border-slate-600 rounded-lg">
                            <h4 className="font-semibold text-slate-800 dark:text-slate-200 mb-3">Chat Background</h4>
                            <div className="flex gap-2">
                                <button onClick={onUploadBackground} className="flex-1 px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-700 rounded-md hover:bg-slate-200 dark:hover:bg-slate-600 transition">Upload Image</button>
                                <button onClick={onRemoveBackground} className="flex-1 px-4 py-2 text-sm font-semibold text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30 rounded-md hover:bg-red-200 dark:hover:bg-red-900/50 transition">Remove</button>
                            </div>
                        </div>
                    </div>
                     <div>
                        <h3 className="font-semibold text-slate-800 dark:text-slate-200 mb-3">Chat Theme</h3>
                        <div className="flex items-center justify-around p-3 border border-slate-300 dark:border-slate-600 rounded-lg">
                            {Object.entries(THEMES).map(([themeKey, { name, gradient, ring }]) => (
                                <button
                                    key={themeKey}
                                    title={name}
                                    onClick={() => onThemeChange(themeKey)}
                                    className={`w-8 h-8 rounded-full ${gradient} transition-all duration-200 ${currentTheme === themeKey ? `ring-2 ring-offset-2 ${ring} dark:ring-offset-slate-800` : 'ring-0'}`}
                                />
                            ))}
                        </div>
                    </div>
                    <div>
                        <h3 className="font-semibold text-slate-800 dark:text-slate-200 mb-2">Message Loading</h3>
                        <div className="space-y-2">
                             <div
                                onClick={() => onStrategyChange('infinite')}
                                className={`p-4 border rounded-lg cursor-pointer transition-all ${currentStrategy === 'infinite' ? 'border-pink-500 bg-pink-50 dark:bg-pink-900/20 ring-2 ring-pink-200 dark:border-pink-500' : 'border-slate-300 dark:border-slate-600 hover:border-slate-400 dark:hover:border-slate-500'}`}
                            >
                                <h4 className="font-semibold text-slate-800 dark:text-slate-200">Incremental Loading</h4>
                                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Loads {MESSAGES_PER_PAGE} messages at a time as you scroll. Best for performance.</p>
                            </div>
                            <div
                                onClick={() => onStrategyChange('full')}
                                className={`p-4 border rounded-lg cursor-pointer transition-all ${currentStrategy === 'full' ? 'border-pink-500 bg-pink-50 dark:bg-pink-900/20 ring-2 ring-pink-200 dark:border-pink-500' : 'border-slate-300 dark:border-slate-600 hover:border-slate-400 dark:hover:border-slate-500'}`}
                            >
                                <h4 className="font-semibold text-slate-800 dark:text-slate-200">Load All Messages</h4>
                                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Loads the entire conversation at once. Useful for searching, but may cause lag on very large chats.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

type MediaItem = (Photo | Video) & { type: 'photo' | 'video', sender: string, timestamp_ms: number, messageId: string, blobUrl?: string };

const MediaGallery: React.FC<{ chat: Chat | null, onJumpToMessage: (item: MediaItem) => void, createBlobUrl: (uri: string) => Promise<string | undefined> }> = ({ chat, onJumpToMessage, createBlobUrl }) => {
    const [mediaTypeFilter, setMediaTypeFilter] = useState<'all' | 'photos' | 'videos'>('all');
    const [senderFilter, setSenderFilter] = useState<string>('all');

    const allMedia = useMemo((): MediaItem[] => {
        if (!chat?.messages) return [];
        return chat.messages.flatMap(msg => {
            const photos: MediaItem[] = (msg.photos || []).map(p => ({ ...p, type: 'photo', sender: msg.sender_name, timestamp_ms: msg.timestamp_ms, messageId: msg.id }));
            const videos: MediaItem[] = (msg.videos || []).map(v => ({ ...v, type: 'video', sender: msg.sender_name, timestamp_ms: msg.timestamp_ms, messageId: msg.id }));
            return [...photos, ...videos];
        }).sort((a, b) => b.timestamp_ms - a.timestamp_ms);
    }, [chat]);

    const filteredMedia = useMemo(() => {
        return allMedia.filter(item => {
            const typeMatch = mediaTypeFilter === 'all' || (mediaTypeFilter === 'photos' && item.type === 'photo') || (mediaTypeFilter === 'videos' && item.type === 'video');
            const senderMatch = senderFilter === 'all' || item.sender === senderFilter;
            return typeMatch && senderMatch;
        });
    }, [allMedia, mediaTypeFilter, senderFilter]);

    const participants = useMemo(() => {
        if (!chat?.participants) return [];
        const names = new Set(chat.participants.map(p => p.name));
        return Array.from(names);
    }, [chat]);

    return (
        <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-900">
            <div className="flex-shrink-0 p-3 border-b border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm flex flex-wrap gap-4 items-center">
                <div className="flex items-center">
                    <span className="text-sm font-semibold text-slate-600 dark:text-slate-400 mr-3">Type:</span>
                    <div className="inline-flex rounded-md shadow-sm" role="group">
                        <button onClick={() => setMediaTypeFilter('all')} type="button" className={`px-4 py-1 text-sm font-medium rounded-l-lg border ${mediaTypeFilter === 'all' ? 'bg-pink-500 text-white border-pink-500 z-10' : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600'}`}>All</button>
                        <button onClick={() => setMediaTypeFilter('photos')} type="button" className={`px-4 py-1 text-sm font-medium border-t border-b ${mediaTypeFilter === 'photos' ? 'bg-pink-500 text-white border-pink-500 z-10' : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600'}`}>Photos</button>
                        <button onClick={() => setMediaTypeFilter('videos')} type="button" className={`px-4 py-1 text-sm font-medium rounded-r-lg border ${mediaTypeFilter === 'videos' ? 'bg-pink-500 text-white border-pink-500 z-10' : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600'}`}>Videos</button>
                    </div>
                </div>
                 <div className="flex items-center">
                     <label htmlFor="sender-filter" className="text-sm font-semibold text-slate-600 dark:text-slate-400 mr-3">Sender:</label>
                    <select id="sender-filter" value={senderFilter} onChange={e => setSenderFilter(e.target.value)} className="rounded-md border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 shadow-sm focus:border-pink-500 focus:ring-pink-500 text-sm py-1">
                        <option value="all">All Senders</option>
                        {participants.map(name => <option key={name} value={name}>{name}</option>)}
                    </select>
                </div>
            </div>
            <div className="flex-grow p-2 sm:p-4 overflow-y-auto">
                {filteredMedia.length > 0 ? (
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-2">
                        {filteredMedia.map(item => (
                             <div key={item.uri} className="aspect-square bg-slate-200 dark:bg-slate-800 rounded-md overflow-hidden relative group">
                                <LazyMedia uri={item.uri} createBlobUrl={createBlobUrl} isVideo={item.type === 'video'} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110" />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                                <div
                                    onClick={() => onJumpToMessage(item)}
                                    className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300 cursor-pointer"
                                >
                                    <ChatBubbleIcon className="w-8 h-8"/>
                                    <span className="text-xs font-bold mt-1">View in Chat</span>
                                </div>
                                <a href={item.blobUrl} target="_blank" rel="noopener noreferrer" aria-label="Open fullscreen" className="absolute top-1.5 right-1.5 p-1.5 bg-black/40 rounded-full text-white hover:bg-black/60 transition-colors opacity-0 group-hover:opacity-100">
                                    <ExpandIcon className="w-4 h-4" />
                                </a>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="flex items-center justify-center h-full text-center p-4">
                        <div>
                            <div className="mx-auto w-16 h-16 text-slate-300 dark:text-slate-600 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center">
                                <PhotoIcon className="w-8 h-8"/>
                            </div>
                            <h3 className="mt-4 text-lg font-semibold text-slate-700 dark:text-slate-300">No Media Found</h3>
                            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">No media matches your current filters.</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};


// --- Main Viewer Component ---
interface InstagramChatViewerProps {
    chats: Chat[];
    ownerName: string;
    onLoadMessages: (chatPath: string) => Promise<Message[]>;
    createBlobUrl: (uri: string) => Promise<string | undefined>;
    theme: Theme;
    onThemeToggle: () => void;
}

const InstagramChatViewer: React.FC<InstagramChatViewerProps> = ({ chats, ownerName, onLoadMessages, createBlobUrl, theme, onThemeToggle }) => {
    const [loadedChats, setLoadedChats] = useState<Record<string, Chat>>({});
    const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isSidebarVisible, setIsSidebarVisible] = useState(true);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [loadingStrategy, setLoadingStrategy] = useState<LoadingStrategy>('infinite');
    const [showAvatars, setShowAvatars] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState<'messages' | 'media'>('messages');
    const [scrollToMessageId, setScrollToMessageId] = useState<string | null>(null);
    const [customAvatars, setCustomAvatars] = useState<Record<string, string>>({});
    const [chatThemes, setChatThemes] = useState<Record<string, string>>({});
    const [chatBackgrounds, setChatBackgrounds] = useState<Record<string, string | null>>({});
    const [messageAlignments, setMessageAlignments] = useState<Record<string, string>>({});

    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const topSentinelRef = useRef<HTMLDivElement>(null);
    const avatarInputRef = useRef<HTMLInputElement>(null);
    const backgroundInputRef = useRef<HTMLInputElement>(null);
    const userForAvatarChange = useRef<string | null>(null);
    
    const [displayedMessageCount, setDisplayedMessageCount] = useState(MESSAGES_PER_PAGE);
    const scrollState = useRef({ isRestoring: false, oldScrollHeight: 0, shouldScrollToBottom: true });

    const selectedChat = useMemo(() => loadedChats[selectedChatId || ''] || null, [selectedChatId, loadedChats]);
    
    const isSearching = useMemo(() => searchQuery.trim().length > 0, [searchQuery]);
    
    const rightAlignedUser = useMemo(() => {
        if (!selectedChatId) return ownerName;
        return messageAlignments[selectedChatId] || ownerName;
    }, [selectedChatId, messageAlignments, ownerName]);

    const { displayedMessages, hasMoreMessages, messageGroups, searchResultCount } = useMemo(() => {
        if (!selectedChat?.messages) return { displayedMessages: [], hasMoreMessages: false, messageGroups: [], searchResultCount: null };
        
        const sourceMessages = selectedChat.messages;
        const filteredMessages = isSearching
            ? sourceMessages.filter(msg => msg.content && msg.content.toLowerCase().includes(searchQuery.toLowerCase()))
            : sourceMessages;
        
        const resultCount = isSearching ? filteredMessages.length : null;

        const messagesToDisplay = isSearching
            ? filteredMessages
            : filteredMessages.slice(Math.max(0, filteredMessages.length - displayedMessageCount));
        
        const hasMore = !isSearching && loadingStrategy === 'infinite' && displayedMessageCount < filteredMessages.length;

        const groups: Message[][] = [];
        if (messagesToDisplay.length > 0) {
            let currentGroup: Message[] = [messagesToDisplay[0]];
            for (let i = 1; i < messagesToDisplay.length; i++) {
                const prevMsg = messagesToDisplay[i-1];
                const currentMsg = messagesToDisplay[i];
                const sameSender = currentMsg.sender_name === prevMsg.sender_name;
                const timeDiff = currentMsg.timestamp_ms - prevMsg.timestamp_ms;
                const newDate = new Date(currentMsg.timestamp_ms).toDateString() !== new Date(prevMsg.timestamp_ms).toDateString();
                
                if (sameSender && timeDiff < 300000 && !newDate) {
                    currentGroup.push(currentMsg);
                } else {
                    groups.push(currentGroup);
                    currentGroup = [currentMsg];
                }
            }
            groups.push(currentGroup);
        }

        return {
            displayedMessages: messagesToDisplay,
            hasMoreMessages: hasMore,
            messageGroups: groups,
            searchResultCount: resultCount
        };
    }, [selectedChat, displayedMessageCount, loadingStrategy, searchQuery, isSearching]);

     useEffect(() => {
        const styleId = 'message-highlight-style';
        let style = document.getElementById(styleId);
        if (style) return;

        style = document.createElement('style');
        style.id = styleId;
        style.innerHTML = `
            @keyframes highlight-animation {
                0% { background-color: rgba(236, 72, 153, 0.3); }
                100% { background-color: transparent; }
            }
            .highlight-message > div {
                animation: highlight-animation 2.5s ease-out;
            }
            @keyframes fade-in {
                from { opacity: 0; transform: translateY(10px); }
                to { opacity: 1; transform: translateY(0); }
            }
            .animate-fade-in {
                animation: fade-in 0.3s ease-out forwards;
            }
        `;
        document.head.appendChild(style);
    }, []);

    useLayoutEffect(() => {
        if (!scrollToMessageId) return;
        
        const element = document.getElementById(`message-${scrollToMessageId}`);
        if (element) {
            scrollState.current.shouldScrollToBottom = false;
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            element.classList.add('highlight-message');
            
            const timer = setTimeout(() => {
                element.classList.remove('highlight-message');
                setScrollToMessageId(null);
            }, 2500);

            return () => clearTimeout(timer);
        } else {
            setScrollToMessageId(null);
        }

    }, [scrollToMessageId, messageGroups]);

    const handleAvatarChangeClick = (userName: string) => {
        userForAvatarChange.current = userName;
        avatarInputRef.current?.click();
    };

    const handleAvatarFileSelected = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        const userName = userForAvatarChange.current;
        if (!file || !userName) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            const dataUrl = e.target?.result as string;
            if (dataUrl) {
                setCustomAvatars(prev => ({...prev, [userName]: dataUrl}));
            }
        };
        reader.readAsDataURL(file);

        if(event.target) event.target.value = '';
    };

    const handleBackgroundChangeClick = () => {
        backgroundInputRef.current?.click();
    };

    const handleBackgroundFileSelected = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file || !selectedChatId) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            const dataUrl = e.target?.result as string;
            if (dataUrl) {
                setChatBackgrounds(prev => ({ ...prev, [selectedChatId]: dataUrl }));
            }
        };
        reader.readAsDataURL(file);
        if (event.target) event.target.value = '';
    };
    
    const handleRemoveBackground = () => {
        if (selectedChatId) {
            setChatBackgrounds(prev => ({ ...prev, [selectedChatId]: null }));
        }
    };

    const handleStrategyChange = (newStrategy: LoadingStrategy) => {
        setLoadingStrategy(newStrategy);
        if (selectedChat) {
            if (newStrategy === 'infinite') {
                setDisplayedMessageCount(MESSAGES_PER_PAGE);
            } else {
                setDisplayedMessageCount(selectedChat.messages.length);
            }
        }
    };

    const handleJumpToMessage = useCallback((item: MediaItem) => {
        if (!selectedChat?.messages) return;
        const messageIndex = selectedChat.messages.findIndex(m => m.id === item.messageId);
        if (messageIndex === -1) return;

        if (loadingStrategy === 'infinite') {
            const totalMessages = selectedChat.messages.length;
            const requiredCount = totalMessages - messageIndex;
            const newCount = Math.min(totalMessages, Math.max(displayedMessageCount, requiredCount + (MESSAGES_PER_PAGE / 2)));
            if (newCount > displayedMessageCount) {
                setDisplayedMessageCount(newCount);
            }
        }
        
        setActiveTab('messages');
        setScrollToMessageId(item.messageId);
    }, [selectedChat, loadingStrategy, displayedMessageCount]);
    
    const handleJumpFromSearch = useCallback((messageId: string) => {
        if (!selectedChat?.messages) return;
        const messageIndex = selectedChat.messages.findIndex(m => m.id === messageId);
        if (messageIndex === -1) return;

        if (loadingStrategy === 'infinite') {
            const totalMessages = selectedChat.messages.length;
            const requiredCount = totalMessages - messageIndex;
            const newCount = Math.min(totalMessages, Math.max(displayedMessageCount, requiredCount + (MESSAGES_PER_PAGE / 2)));
            if (newCount > displayedMessageCount) {
                setDisplayedMessageCount(newCount);
            }
        }
        
        setSearchQuery('');
        setScrollToMessageId(messageId);
    }, [selectedChat, loadingStrategy, displayedMessageCount]);

    const handleSelectChat = useCallback(async (chat: Chat) => {
        setIsSidebarVisible(false);
        setSearchQuery('');
        setActiveTab('messages');
        scrollState.current.shouldScrollToBottom = true;

        if (loadingStrategy === 'infinite') {
            setDisplayedMessageCount(MESSAGES_PER_PAGE);
        } else {
            setDisplayedMessageCount(Number.MAX_SAFE_INTEGER);
        }
    
        if (loadedChats[chat.id]?.messages?.length > 0) {
            setSelectedChatId(chat.id);
            return;
        }
    
        setSelectedChatId(chat.id);
        setIsLoading(true);
        setError(null);
        try {
            let messages: Message[];
            if (chat.messages && chat.messages.length > 0) {
                 messages = chat.messages;
            } else {
                messages = await onLoadMessages(chat.path);
            }
    
            const fullChat = { ...chat, messages };
            setLoadedChats(prev => ({ ...prev, [chat.id]: fullChat }));
            
            if (loadingStrategy === 'full' || (chat.messages && chat.messages.length > 0)) {
                setDisplayedMessageCount(messages.length);
            }
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

        scrollState.current = { isRestoring: true, oldScrollHeight: container.scrollHeight, shouldScrollToBottom: false };
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
            { root: scrollContainerRef.current, threshold: 0.1 }
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
        } else if (scrollState.current.shouldScrollToBottom && !scrollToMessageId) {
            container.scrollTop = container.scrollHeight;
            scrollState.current.shouldScrollToBottom = false;
        }
    }, [displayedMessages, scrollToMessageId]);

    const selectedChatTheme = chatThemes[selectedChatId || ''] || 'default';
    const selectedChatBackground = chatBackgrounds[selectedChatId || ''] || null;

    const messageContainerStyle = selectedChatBackground ? {
        backgroundImage: `url(${selectedChatBackground})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
    } : {};
    
    const messageContainerClasses = selectedChatBackground ? '' : "bg-slate-50 dark:bg-slate-900 bg-[url('data:image/svg+xml,%3Csvg%20width%3D%224%22%20height%3D%224%22%20viewBox%3D%220%200%204%204%22%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%3E%3Cpath%20d%3D%22M1%203h1v1H1V3zm2-2h1v1H3V1z%22%20fill%3D%22%2394a3b8%22%20fill-opacity%3D%220.1%22%20fill-rule%3D%22evenodd%22%3E%3C/path%3E%3C/svg%3E')]";

    return (
        <div className="flex w-full h-full bg-white dark:bg-slate-900 overflow-hidden relative">
            <input 
                type="file" 
                ref={avatarInputRef} 
                className="hidden" 
                accept="image/png, image/jpeg, image/gif"
                onChange={handleAvatarFileSelected}
            />
            <input
                type="file"
                ref={backgroundInputRef}
                className="hidden"
                accept="image/png, image/jpeg, image/gif"
                onChange={handleBackgroundFileSelected}
            />
            {selectedChat && <SettingsModal 
                isOpen={isSettingsOpen}
                onClose={() => setIsSettingsOpen(false)}
                currentStrategy={loadingStrategy}
                onStrategyChange={handleStrategyChange}
                showAvatars={showAvatars}
                onShowAvatarsChange={setShowAvatars}
                currentTheme={selectedChatTheme}
                onThemeChange={(theme) => selectedChatId && setChatThemes(prev => ({...prev, [selectedChatId]: theme}))}
                onUploadBackground={handleBackgroundChangeClick}
                onRemoveBackground={handleRemoveBackground}
                participants={selectedChat.participants}
                currentAlignment={rightAlignedUser}
                onAlignmentChange={(name) => selectedChatId && setMessageAlignments(prev => ({ ...prev, [selectedChatId]: name }))}
                customAvatars={customAvatars}
            />}
            <aside className={`absolute md:relative w-full md:w-1/3 lg:w-1/4 border-r border-slate-200 dark:border-slate-700 flex flex-col transition-transform duration-300 ease-in-out z-10 bg-white dark:bg-slate-800 h-full ${isSidebarVisible ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}>
                <header className="p-4 border-b border-slate-200 dark:border-slate-700">
                    <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200">Your Chats</h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400">{chats.length} conversations</p>
                </header>
                <div className="flex-grow overflow-y-auto">
                    {chats.map(chat => (
                        <div key={chat.id} onClick={() => handleSelectChat(chat)} className={`p-3 flex items-center cursor-pointer border-l-4 transition-colors duration-200 ${selectedChatId === chat.id ? 'border-pink-500 bg-slate-100 dark:bg-slate-700/50' : 'border-transparent hover:bg-slate-50 dark:hover:bg-slate-700/30'}`}>
                            {showAvatars && (
                                <UserAvatar 
                                    name={chat.title} 
                                    className="w-11 h-11 text-lg" 
                                    imageUrl={customAvatars[chat.title]}
                                    onClick={(e) => { e.stopPropagation(); handleAvatarChangeClick(chat.title); }}
                                />
                            )}
                            <div className="ml-4 truncate flex-grow">
                                <p className="font-semibold text-slate-900 dark:text-slate-100">{chat.title}</p>
                                <p className="text-sm text-slate-500 dark:text-slate-400 truncate">
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
                        <header className="p-3 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between shadow-sm gap-4 bg-white dark:bg-slate-800">
                           <div className="flex items-center min-w-0">
                                <button onClick={() => setIsSidebarVisible(true)} className="md:hidden p-2 mr-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700"><ArrowLeftIcon className="w-5 h-5 text-slate-600 dark:text-slate-300" /></button>
                                 {showAvatars && (
                                    <UserAvatar 
                                        name={selectedChat.title} 
                                        className="w-11 h-11 text-lg" 
                                        imageUrl={customAvatars[selectedChat.title]}
                                        onClick={(e) => { e.stopPropagation(); handleAvatarChangeClick(selectedChat.title); }}
                                    />
                                 )}
                                <div className="ml-4 truncate">
                                   <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200 truncate">{selectedChat.title}</h3>
                                   <p className="text-sm text-slate-500 dark:text-slate-400 truncate">{selectedChat.participants.map(p => p.name).join(', ')}</p>
                                </div>
                           </div>
                           <div className="flex-shrink-0 flex items-center gap-2">
                               {activeTab === 'messages' && <div className="relative">
                                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                                        <SearchIcon className="w-5 h-5 text-slate-400 dark:text-slate-500" />
                                    </span>
                                    <input
                                        type="text"
                                        placeholder="Search..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="w-full max-w-[120px] sm:max-w-[200px] rounded-full border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 py-1.5 pl-10 pr-8 text-sm text-slate-800 dark:text-slate-200 focus:bg-white dark:focus:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-pink-500 transition-all duration-300"
                                    />
                                     {isSearching && (
                                        <button onClick={() => setSearchQuery('')} className="absolute inset-y-0 right-0 flex items-center pr-2 group">
                                            <XCircleIcon className="w-5 h-5 text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-colors" />
                                        </button>
                                    )}
                                </div>}
                                 <button
                                    onClick={onThemeToggle}
                                    className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                                    aria-label="Toggle theme"
                                >
                                    {theme === 'light' ? <MoonIcon className="w-6 h-6 text-slate-600" /> : <SunIcon className="w-6 h-6 text-yellow-400" />}
                                </button>
                                <button
                                    onClick={() => setIsSettingsOpen(true)}
                                    className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                                    aria-label="Chat settings"
                                >
                                    <SettingsIcon className="w-6 h-6 text-slate-600 dark:text-slate-300" />
                                </button>
                           </div>
                        </header>

                        <div className="flex-shrink-0 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 flex items-center gap-4">
                             <button onClick={() => setActiveTab('messages')} className={`py-3 text-sm font-semibold border-b-2 transition-colors ${activeTab === 'messages' ? 'border-pink-500 text-pink-600' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'}`}>
                                Messages
                            </button>
                             <button onClick={() => setActiveTab('media')} className={`py-3 text-sm font-semibold border-b-2 transition-colors ${activeTab === 'media' ? 'border-pink-500 text-pink-600' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'}`}>
                                Media
                            </button>
                        </div>
                        
                        <div className="flex-grow overflow-hidden relative">
                            {isLoading ? <SkeletonLoader /> : error ? (
                                <div className="absolute inset-0 flex items-center justify-center text-center text-red-500 bg-slate-50 dark:bg-slate-900 p-4"><div><h2 className="text-2xl font-semibold">Error Loading Chat</h2><p className="mt-2">{error}</p></div></div>
                            ) : (
                                <>
                                    <div className={`w-full h-full transition-opacity duration-300 ${activeTab === 'messages' ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                                         <div 
                                            ref={scrollContainerRef} 
                                            className={`h-full p-6 overflow-y-auto ${messageContainerClasses}`}
                                            style={messageContainerStyle}
                                         >
                                            <div className="flex flex-col gap-4">
                                                {hasMoreMessages && !isSearching && (
                                                    <div ref={topSentinelRef} className="flex justify-center p-4">
                                                        <SpinnerIcon className="w-8 h-8 text-slate-400 dark:text-slate-500 animate-spin" />
                                                    </div>
                                                )}
                                                {isSearching && (
                                                    <div className="text-center my-2 sticky top-2 z-10">
                                                        <p className="text-sm text-slate-500 dark:text-slate-400 bg-slate-200/70 dark:bg-slate-700/70 backdrop-blur-sm inline-block px-3 py-1 rounded-full">
                                                            {searchResultCount === 0 ? 'No messages found.' : `Found ${searchResultCount} message${searchResultCount !== 1 ? 's' : ''}.`}
                                                        </p>
                                                    </div>
                                                )}
                                                {messageGroups.map((group, groupIndex) => {
                                                    const firstMessage = group[0];
                                                    if (!firstMessage) return null;

                                                    const prevGroup = messageGroups[groupIndex-1];
                                                    const prevMessage = prevGroup ? prevGroup[prevGroup.length - 1] : undefined;

                                                    const showDateSeparator = !prevMessage || new Date(firstMessage.timestamp_ms).toDateString() !== new Date(prevMessage.timestamp_ms).toDateString();
                                                    const dateStr = formatDateSeparator(firstMessage.timestamp_ms);
                                                    
                                                    const isOwnMessage = firstMessage.sender_name === rightAlignedUser;

                                                    return (
                                                        <React.Fragment key={`${firstMessage.timestamp_ms}-${groupIndex}`}>
                                                            {showDateSeparator && (
                                                                <div className="flex justify-center my-4 sticky top-2 z-10">
                                                                    <span className="bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-semibold px-3 py-1 rounded-full shadow-sm">{dateStr}</span>
                                                                </div>
                                                            )}
                                                            <MessageGroup
                                                                messages={group}
                                                                isOwnMessage={isOwnMessage}
                                                                showAvatar={showAvatars}
                                                                searchQuery={isSearching ? searchQuery : undefined}
                                                                isSearching={isSearching}
                                                                onJumpFromSearch={handleJumpFromSearch}
                                                                customAvatarUrl={customAvatars[firstMessage.sender_name]}
                                                                onAvatarClick={() => handleAvatarChangeClick(firstMessage.sender_name)}
                                                                theme={selectedChatTheme}
                                                                createBlobUrl={createBlobUrl}
                                                            />
                                                        </React.Fragment>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </div>
                                    <div className={`absolute inset-0 transition-opacity duration-300 ${activeTab === 'media' ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                                        <MediaGallery chat={selectedChat} onJumpToMessage={handleJumpToMessage} createBlobUrl={createBlobUrl} />
                                    </div>
                                </>
                            )}
                        </div>
                    </>
                ) : (
                    <div className="hidden md:flex flex-grow items-center justify-center text-center text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-900">
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