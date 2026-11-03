import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { Chat, Message, Photo, Video } from './types';
import { useDebouncedValue } from '../../../utils/useDebouncedValue';
import VirtualList, { VirtualListHandle } from '../../../components/VirtualList';
import LazyMedia from '../../../components/LazyMedia';
import type { MediaSource } from '../../../utils/mediaLoader';
import VirtualGrid from '../../../components/VirtualGrid';
import { LightboxProvider } from '../../../components/Lightbox';
import type { LightboxItem } from '../../../components/Lightbox';
import MediaTile from '../../../components/MediaTile';
import { StarButton, StarProvider, HitNavigator, SearchFilters, NO_FILTERS, passesFilters } from '../../../components/ChatTools';
import type { SearchFilterValue } from '../../../components/ChatTools';
import LibraryPanel from '../../../components/LibraryPanel';
import type { ToolMessage } from '../../../utils/chatData';
import { useExportPrefs } from '../../../utils/storage';
import { focusChatSearch, useChatShortcuts } from '../../../utils/useChatShortcuts';
import GlobalSearch from '../../../components/GlobalSearch';
import type { GlobalHit, GlobalSearchFn } from '../../../components/GlobalSearch';
import CalendarPopover, { CalendarDaysIcon, dayKey } from '../../../components/CalendarPopover';
import WallpaperPicker from '../../../components/WallpaperPicker';
import { resolveWallpaper, storableWallpaper, wallpaperStyle } from '../../../utils/wallpapers';

type ChatRow =
    | { kind: 'date'; key: string; label: string }
    | { kind: 'group'; key: string; messages: Message[]; dayLabel: string };
type Theme = 'light' | 'dark';

// --- Icon Components ---

const ArrowLeftIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
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
    if (message.audio_files?.length) return '🎤 Voice message';
    if (message.sticker || message.gifs?.length) return 'Sticker';
    if (message.share) return '🔗 ' + (message.share.share_text || 'Shared a post');
    if (message.call_duration !== undefined) return '📞 Call';
    if (message.is_unsent) return 'Message unsent';
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

const PhotoGrid: React.FC<{ photos: Photo[], createBlobUrl: MediaSource }> = ({ photos, createBlobUrl }) => {
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
                        <LazyMedia uri={photo.uri} media={createBlobUrl} kind="image" className="w-full h-full object-cover" />
                    </div>
                )
            })}
        </div>
    );
};


const VideoDisplay: React.FC<{ video: Video, createBlobUrl: MediaSource }> = ({ video, createBlobUrl }) => (
     <LazyMedia uri={video.uri} media={createBlobUrl} kind="video" className="max-w-xs sm:max-w-sm max-h-80 rounded-lg" natural />
);

const formatCallLength = (seconds: number): string => {
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    return minutes < 60 ? `${minutes} min ${seconds % 60}s` : `${Math.floor(minutes / 60)} h ${minutes % 60} min`;
};

/** A post, reel or link that was sent in the chat. The export keeps its address and caption, not the content. */
const SharedLinkCard: React.FC<{ share: NonNullable<Message['share']> }> = ({ share }) => (
    <div className="self-start max-w-xs rounded-lg border border-current/20 px-3 py-2 text-sm">
        <p className="font-semibold">Shared post{share.original_content_owner ? ` by ${share.original_content_owner}` : ''}</p>
        {share.share_text && <p className="mt-1 opacity-80 line-clamp-4 whitespace-pre-wrap">{share.share_text}</p>}
        {share.link && <a href={share.link} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="mt-1 block text-xs underline break-all opacity-80">{share.link}</a>}
    </div>
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
    createBlobUrl: MediaSource;
}> = ({ message, isOwnMessage, isFirstInGroup, isLastInGroup, searchQuery, isSearching, onJumpFromSearch, theme, createBlobUrl }) => {
    const themeClasses = THEMES[theme]?.gradient || THEMES.default.gradient;
    const bubbleColor = isOwnMessage ? `${themeClasses} text-white` : 'bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 shadow-sm';
    
    const roundingClasses = isOwnMessage
        ? `${isFirstInGroup ? 'rounded-t-2xl' : ''} ${isLastInGroup ? 'rounded-b-2xl' : ''} rounded-l-2xl`
        : `${isFirstInGroup ? 'rounded-t-2xl' : ''} ${isLastInGroup ? 'rounded-b-2xl' : ''} rounded-r-2xl`;
    
    return (
        <div
            id={`message-${message.id}`}
            className={`group relative flex items-end gap-2 max-w-lg ${isOwnMessage ? 'self-end' : 'self-start'} ${isSearching ? 'cursor-pointer' : ''}`}
            onClick={isSearching ? () => onJumpFromSearch?.(message.id) : undefined}
        >
            <StarButton id={message.id} />
            <div className={`px-4 py-2.5 ${bubbleColor} ${roundingClasses}`}>
                {message.content && <p className="whitespace-pre-wrap leading-relaxed"><HighlightedText text={message.content} highlight={searchQuery || ''} /></p>}
                <div className={`flex flex-col gap-2 ${message.content || message.photos?.length ? 'mt-2' : ''}`}>
                    {message.photos && message.photos.length > 0 && <PhotoGrid photos={message.photos} createBlobUrl={createBlobUrl}/>}
                    {message.videos?.map((video, index) => <VideoDisplay key={index} video={video} createBlobUrl={createBlobUrl}/>)}
                    {message.audio_files?.map((clip, index) => <LazyMedia key={`a${index}`} uri={clip.uri} media={createBlobUrl} kind="audio" />)}
                    {message.gifs?.map((gif, index) => <LazyMedia key={`g${index}`} uri={gif.uri} media={createBlobUrl} kind="image" className="max-w-xs sm:max-w-sm max-h-80 rounded-lg" natural enlargeable={false} />)}
                    {message.sticker && <LazyMedia uri={message.sticker.uri} media={createBlobUrl} kind="image" className="w-28 h-28 object-contain" natural enlargeable={false} />}
                    {message.share && <SharedLinkCard share={message.share} />}
                    {message.call_duration !== undefined && <p className="text-sm opacity-80">📞 Call · {formatCallLength(message.call_duration)}</p>}
                    {message.is_unsent && <p className="text-sm italic opacity-70">This message was unsent.</p>}
                </div>
                {message.reactions && message.reactions.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                        {message.reactions.map((r, index) => (
                            <span key={index} title={r.actor} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-black/10 dark:bg-white/15">
                                <span>{r.reaction}</span><span className="opacity-70 truncate max-w-[8rem]">{r.actor}</span>
                            </span>
                        ))}
                    </div>
                )}
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
    createBlobUrl: MediaSource;
}> = ({ messages, isOwnMessage, showAvatar, searchQuery, isSearching, onJumpFromSearch, customAvatarUrl, onAvatarClick, theme, createBlobUrl }) => {
    if (!messages.length) return null;
    const senderName = messages[0].sender_name;

    return (
        <div className={`flex flex-col gap-0.5 w-full ${isOwnMessage ? 'items-end' : 'items-start'}`}>
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
    showAvatars: boolean;
    onShowAvatarsChange: (show: boolean) => void;
    currentTheme: string;
    onThemeChange: (theme: string) => void;
    wallpaper: string | null;
    onWallpaperChange: (value: string | null) => void;
    onUploadBackground: () => void;
    participants: { name: string }[];
    currentAlignment: string;
    onAlignmentChange: (name: string) => void;
    customAvatars: Record<string, string>;

}> = ({ isOpen, onClose, showAvatars, onShowAvatarsChange, currentTheme, onThemeChange, wallpaper, onWallpaperChange, onUploadBackground,
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
                            <h4 className="font-semibold text-slate-800 dark:text-slate-200 mb-3">Chat Wallpaper</h4><WallpaperPicker value={wallpaper} onChange={onWallpaperChange} onUpload={onUploadBackground} ringClass="ring-pink-500" tone="pink" dark={document.documentElement.classList.contains('dark')} />
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
                </div>
            </div>
        </div>
    );
};

type MediaItem = (Photo | Video) & { type: 'photo' | 'video', sender: string, timestamp_ms: number, messageId: string, blobUrl?: string };

interface GalleryFilters { type: 'all' | 'photos' | 'videos'; sender: string; }

const MediaGallery: React.FC<{ chat: Chat | null, onJumpToMessage: (item: MediaItem) => void, createBlobUrl: MediaSource, filters: GalleryFilters, onFiltersChange: (next: GalleryFilters) => void, scrollMemory: { current: number } }> = ({ chat, onJumpToMessage, createBlobUrl, filters, onFiltersChange, scrollMemory }) => {
    const mediaTypeFilter = filters.type;
    const senderFilter = filters.sender;
    const setMediaTypeFilter = (type: GalleryFilters['type']) => { scrollMemory.current = 0; onFiltersChange({ ...filters, type }); };
    const setSenderFilter = (sender: string) => { scrollMemory.current = 0; onFiltersChange({ ...filters, sender }); };

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

    const galleryItems = useMemo<LightboxItem[]>(() => filteredMedia.map(item => ({ uri: item.uri, kind: item.type === 'video' ? 'video' : 'image', sender: item.sender, timestamp: item.timestamp_ms, ref: item })), [filteredMedia]);

    return (
        <LightboxProvider items={galleryItems} media={createBlobUrl} onShowInChat={(item) => onJumpToMessage(item.ref as MediaItem)}>
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
            <div className="flex-grow min-h-0 p-2 sm:p-4">
                {filteredMedia.length > 0 ? (
                    <VirtualGrid
                        className="h-full"
                        initialScrollTop={scrollMemory.current}
                        onScrollTopChange={(scrollTop) => { scrollMemory.current = scrollTop; }}
                        count={filteredMedia.length}
                        getCellKey={(index) => `${filteredMedia[index].messageId}-${filteredMedia[index].uri}`}
                        renderCell={(index) => {
                            const item = filteredMedia[index];
                            return <MediaTile uri={item.uri} kind={item.type === 'video' ? 'video' : 'image'} media={createBlobUrl} onShowInChat={() => onJumpToMessage(item)} />;
                        }}
                    />
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
        </LightboxProvider>
    );
};


// --- Main Viewer Component ---
interface InstagramChatViewerProps {
    chats: Chat[];
    ownerName: string;
    /** Identifies this export so settings, stars and reading position are remembered. */
    exportKey?: string;
    /** Searches the text of every conversation; absent when only one chat was opened. */
    onSearchAll?: GlobalSearchFn;
    onLoadMessages: (chatPath: string) => Promise<Message[]>;
    createBlobUrl: MediaSource;
    theme: Theme;
    onThemeToggle: () => void;
}

const InstagramChatViewer: React.FC<InstagramChatViewerProps> = ({ chats, ownerName, exportKey, onSearchAll, onLoadMessages, createBlobUrl, theme, onThemeToggle }) => {
    const [prefs, updatePrefs] = useExportPrefs(exportKey);
    const [loadedChats, setLoadedChats] = useState<Record<string, Chat>>({});
    const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isSidebarVisible, setIsSidebarVisible] = useState(prefs.showAvatars ?? true);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isCalendarOpen, setIsCalendarOpen] = useState(false);
    const [showAvatars, setShowAvatars] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState<'messages' | 'media' | 'library'>('messages');
    const [customAvatars, setCustomAvatars] = useState<Record<string, string>>({});
    const [chatThemes, setChatThemes] = useState<Record<string, string>>(prefs.chatTheme ?? {});
    const [chatBackgrounds, setChatBackgrounds] = useState<Record<string, string | null>>(prefs.wallpaper ?? {});
    const [messageAlignments, setMessageAlignments] = useState<Record<string, string>>(prefs.alignment ?? {});

    const listRef = useRef<VirtualListHandle>(null);
    const [galleryFilters, setGalleryFilters] = useState<GalleryFilters>({ type: 'all', sender: 'all' });
    const galleryScroll = useRef(0);
    const avatarInputRef = useRef<HTMLInputElement>(null);
    const backgroundInputRef = useRef<HTMLInputElement>(null);
    const userForAvatarChange = useRef<string | null>(null);
    

    const selectedChat = useMemo(() => loadedChats[selectedChatId || ''] || null, [selectedChatId, loadedChats]);
    
    const debouncedSearchQuery = useDebouncedValue(searchQuery);
    const [isGlobalSearchOpen, setIsGlobalSearchOpen] = useState(false);
    const [searchFilters, setSearchFilters] = useState<SearchFilterValue>(NO_FILTERS);
    const isSearching = useMemo(() => debouncedSearchQuery.trim().length > 0, [debouncedSearchQuery]);
    
    const rightAlignedUser = useMemo(() => {
        if (!selectedChatId) return ownerName;
        return messageAlignments[selectedChatId] || ownerName;
    }, [selectedChatId, messageAlignments, ownerName]);

    // Search the whole chat, group consecutive messages by sender, and flatten with date separators
    // so the virtual list can window over every message.
    const { rows, rowIndexByMessageId, searchResultCount, hitIds } = useMemo(() => {
        const out: ChatRow[] = [];
        const indexById = new Map<string, number>();
        if (!selectedChat?.messages) return { rows: out, rowIndexByMessageId: indexById, searchResultCount: null, hitIds: [] as string[] };

        const lowerQuery = debouncedSearchQuery.toLowerCase();
        const shown = isSearching
            ? selectedChat.messages.filter(msg => msg.content && msg.content.toLowerCase().includes(lowerQuery) && passesFilters(searchFilters, msg.sender_name, msg.timestamp_ms))
            : selectedChat.messages;

        const dayOf = (ms: number) => { const d = new Date(ms); return d.getFullYear() * 10000 + d.getMonth() * 100 + d.getDate(); };
        let group: Message[] = [];
        let lastDay = -1;
        let dayLabel = '';
        const flush = () => {
            if (group.length === 0) return;
            const rowIndex = out.length;
            for (const m of group) indexById.set(m.id, rowIndex);
            out.push({ kind: 'group', key: `g-${group[0].id}`, messages: group, dayLabel });
            group = [];
        };
        for (const msg of shown) {
            const day = dayOf(msg.timestamp_ms);
            const prev = group[group.length - 1];
            const continues = prev && prev.sender_name === msg.sender_name && msg.timestamp_ms - prev.timestamp_ms < 300000 && day === lastDay;
            if (!continues) {
                flush();
                if (day !== lastDay) {
                    dayLabel = formatDateSeparator(msg.timestamp_ms);
                    out.push({ kind: 'date', key: `d-${msg.id}`, label: dayLabel });
                    lastDay = day;
                }
            }
            group.push(msg);
        }
        flush();
        return { rows: out, rowIndexByMessageId: indexById, searchResultCount: isSearching ? shown.length : null, hitIds: isSearching ? shown.map(m => m.id) : ([] as string[]) };
    }, [selectedChat, debouncedSearchQuery, isSearching, searchFilters]);

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
                changeWallpaper(dataUrl);
            }
        };
        reader.readAsDataURL(file);
        if (event.target) event.target.value = '';
    };
    
    const changeWallpaper = (value: string | null) => {
        if (!selectedChatId) return;
        setChatBackgrounds(prev => ({ ...prev, [selectedChatId]: value ?? 'none' }));
        updatePrefs(p => ({ ...p, wallpaper: { ...p.wallpaper, [selectedChatId]: storableWallpaper(value) } }));
    };

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

    const handleJumpToMessage = useCallback((item: MediaItem) => {
        setActiveTab('messages');
        jumpToMessage(item.messageId);
    }, [jumpToMessage]);

    // Leaving search rebuilds the list around the full chat, so jump once that row set exists.
    const [pendingJumpId, setPendingJumpId] = useState<string | null>(null);
    const [hitNav, setHitNav] = useState<{ ids: string[]; index: number } | null>(null);
    const handleJumpFromSearch = useCallback((messageId: string) => {
        setHitNav({ ids: hitIds, index: Math.max(0, hitIds.indexOf(messageId)) });
        setSearchQuery('');
        setPendingJumpId(messageId);
    }, [hitIds]);
    const stepHit = (delta: number) => {
        if (!hitNav) return;
        const index = Math.min(hitNav.ids.length - 1, Math.max(0, hitNav.index + delta));
        setHitNav({ ...hitNav, index });
        jumpToMessage(hitNav.ids[index]);
    };
    useEffect(() => {
        // Wait until the message is in the list: after opening another chat it is not there at first.
        if (pendingJumpId && !isSearching && searchQuery === '' && rowIndexByMessageId.has(pendingJumpId)) {
            jumpToMessage(pendingJumpId);
            setPendingJumpId(null);
        }
    }, [pendingJumpId, isSearching, searchQuery, jumpToMessage, rowIndexByMessageId]);

    const openGlobalHit = (hit: GlobalHit) => {
        setIsGlobalSearchOpen(false);
        setActiveTab('messages');
        setSearchQuery('');
        const chat = chats.find(c => c.id === hit.chatId);
        if (chat && chat.id !== selectedChatId) void handleSelectChat(chat);
        setPendingJumpId(hit.messageId);
    };

    const handleSelectChat = useCallback(async (chat: Chat) => {
        setIsSidebarVisible(false);
        setSearchQuery('');
        setActiveTab('messages');
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

    // Every photo/video in the open chat, oldest first: what the arrows page through from a chat bubble.
    const chatMediaItems = useMemo<LightboxItem[]>(() => {
        const items: LightboxItem[] = [];
        for (const message of selectedChat?.messages ?? []) {
            for (const photo of message.photos ?? []) items.push({ uri: photo.uri, kind: 'image', sender: message.sender_name, timestamp: message.timestamp_ms, ref: message.id });
            for (const video of message.videos ?? []) items.push({ uri: video.uri, kind: 'video', sender: message.sender_name, timestamp: message.timestamp_ms, ref: message.id });
        }
        return items;
    }, [selectedChat]);

    // A different chat has different senders and its own scroll position: start its gallery fresh.
    useEffect(() => { galleryScroll.current = 0; setGalleryFilters(f => ({ ...f, sender: 'all' })); }, [selectedChatId]);

    const chatKey = selectedChatId ?? '';
    const starredIds = useMemo(() => new Set(prefs.stars?.[chatKey] ?? []), [prefs.stars, chatKey]);
    const toggleStar = useCallback((id: string) => updatePrefs(p => {
        const current = new Set(p.stars?.[chatKey] ?? []);
        if (current.has(id)) current.delete(id); else current.add(id);
        return { ...p, stars: { ...p.stars, [chatKey]: Array.from(current) } };
    }), [updatePrefs, chatKey]);

    const toolMessages = useMemo<ToolMessage[]>(() => (selectedChat?.messages ?? []).map(m => ({
        id: m.id, sender: m.sender_name, ts: m.timestamp_ms,
        text: [m.content, m.share?.link, m.share?.share_text].filter(Boolean).join(' '),
    })), [selectedChat]);

    // Remember where the reader was in each chat, and return there next time (not while searching).
    const savedRow = !isSearching && chatKey && prefs.positions?.[chatKey] ? rowIndexByMessageId.get(prefs.positions[chatKey]) : undefined;
    const rememberPosition = useCallback((rowIndex: number) => {
        if (isSearching || !chatKey) return;
        const row = rows[rowIndex];
        const next = rows[rowIndex + 1];
        const id = row?.kind === 'group' ? row.messages[0].id : next?.kind === 'group' ? next.messages[0].id : undefined;
        if (id) updatePrefs(p => (p.positions?.[chatKey] === id ? p : { ...p, positions: { ...p.positions, [chatKey]: id } }));
    }, [isSearching, rows, updatePrefs, chatKey]);

    const activeDays = useMemo(() => new Set((selectedChat?.messages ?? []).map(m => dayKey(m.timestamp_ms))), [selectedChat]);
    const handleDateSelect = (date: Date) => {
        const start = new Date(date).setHours(0, 0, 0, 0);
        const messages = selectedChat?.messages ?? [];
        const target = messages.find(m => m.timestamp_ms >= start) ?? messages[messages.length - 1];
        if (!target) return;
        setActiveTab('messages');
        setSearchQuery('');
        jumpToMessage(target.id);
    };

    useChatShortcuts({
        onGoToDate: () => setIsCalendarOpen(true),
        onGlobalFind: onSearchAll ? () => setIsGlobalSearchOpen(true) : undefined,
        onFind: () => { setActiveTab('messages'); focusChatSearch(); },
        onTop: () => listRef.current?.scrollToTop(),
        onBottom: () => listRef.current?.scrollToBottom(),
        onEscape: () => { if (hitNav) { setHitNav(null); return true; } if (searchQuery) { setSearchQuery(''); return true; } return false; },
    }, activeTab === 'messages');

    const selectedChatTheme = chatThemes[selectedChatId || ''] || 'default';
    const selectedChatBackground = resolveWallpaper(chatBackgrounds[selectedChatId || '']);

    const messageContainerStyle = wallpaperStyle(selectedChatBackground, { tone: 'pink', dark: theme === 'dark' }) ?? {};
    
    const messageContainerClasses = selectedChatBackground ? '' : "bg-slate-50 dark:bg-slate-900 bg-[url('data:image/svg+xml,%3Csvg%20width%3D%224%22%20height%3D%224%22%20viewBox%3D%220%200%204%204%22%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%3E%3Cpath%20d%3D%22M1%203h1v1H1V3zm2-2h1v1H3V1z%22%20fill%3D%22%2394a3b8%22%20fill-opacity%3D%220.1%22%20fill-rule%3D%22evenodd%22%3E%3C/path%3E%3C/svg%3E')]";

    return (
        <StarProvider starred={starredIds} onToggle={toggleStar}>
        <LightboxProvider items={chatMediaItems} media={createBlobUrl} onShowInChat={(item) => { setActiveTab('messages'); jumpToMessage(item.ref as string); }}>
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
                showAvatars={showAvatars}
                onShowAvatarsChange={(show) => { setShowAvatars(show); updatePrefs(p => ({ ...p, showAvatars: show })); }}
                currentTheme={selectedChatTheme}
                onThemeChange={(theme) => { if (!selectedChatId) return; setChatThemes(prev => ({...prev, [selectedChatId]: theme})); updatePrefs(p => ({ ...p, chatTheme: { ...p.chatTheme, [selectedChatId]: theme } })); }}
                onUploadBackground={handleBackgroundChangeClick}
                wallpaper={selectedChatBackground} onWallpaperChange={changeWallpaper}
                participants={selectedChat.participants}
                currentAlignment={rightAlignedUser}
                onAlignmentChange={(name) => { if (!selectedChatId) return; setMessageAlignments(prev => ({ ...prev, [selectedChatId]: name })); updatePrefs(p => ({ ...p, alignment: { ...p.alignment, [selectedChatId]: name } })); }}
                customAvatars={customAvatars}
            />}
            <aside className={`absolute md:relative w-full md:w-1/3 lg:w-1/4 border-r border-slate-200 dark:border-slate-700 flex flex-col transition-transform duration-300 ease-in-out z-10 bg-white dark:bg-slate-800 h-full ${isSidebarVisible ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}>
                <header className="p-4 border-b border-slate-200 dark:border-slate-700">
                    <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200">Your Chats</h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400">{chats.length} conversations</p>
                    {onSearchAll && <button type="button" onClick={() => setIsGlobalSearchOpen(true)} className="mt-3 w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                        <span>Search all chats</span><kbd className="text-xs opacity-60">Ctrl+Shift+F</kbd>
                    </button>}
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
                                        data-chat-search
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
                                    onClick={() => setIsCalendarOpen(open => !open)}
                                    className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                                    aria-label="Jump to date"
                                >
                                    <CalendarDaysIcon className="w-6 h-6 text-slate-600 dark:text-slate-300" />
                                </button>
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
                             <button onClick={() => setActiveTab('library')} className={`py-3 text-sm font-semibold border-b-2 transition-colors ${activeTab === 'library' ? 'border-pink-500 text-pink-600' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'}`}>
                                Library{starredIds.size ? ` (${starredIds.size})` : ''}
                            </button>
                        </div>
                        
                        <div className="flex-grow overflow-hidden relative">
                            <CalendarPopover tone="pink" startAt={selectedChat?.messages[selectedChat.messages.length - 1]?.timestamp_ms} isOpen={isCalendarOpen} onClose={() => setIsCalendarOpen(false)} onDateSelect={handleDateSelect} activeDays={activeDays} />
                            {isLoading ? <SkeletonLoader /> : error ? (
                                <div className="absolute inset-0 flex items-center justify-center text-center text-red-500 bg-slate-50 dark:bg-slate-900 p-4"><div><h2 className="text-2xl font-semibold">Error Loading Chat</h2><p className="mt-2">{error}</p></div></div>
                            ) : (
                                <>
                                    <div className={`w-full h-full transition-opacity duration-300 ${activeTab === 'messages' ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                                         <div className="h-full flex flex-col">
                                            {isSearching && (
                                                <div className="flex-shrink-0 flex items-center justify-center gap-3 py-2 bg-slate-50 dark:bg-slate-900">
                                                    <p className="text-sm text-slate-500 dark:text-slate-400 bg-slate-200/70 dark:bg-slate-700/70 backdrop-blur-sm inline-block px-3 py-1 rounded-full">
                                                        {searchResultCount === 0 ? 'No messages found.' : `Found ${searchResultCount} message${searchResultCount !== 1 ? 's' : ''}.`}
                                                    </p>
                                                    <SearchFilters senders={selectedChat?.participants.map(p => p.name) ?? []} value={searchFilters} onChange={setSearchFilters} />
                                                </div>
                                            )}
                                            <VirtualList
                                                ref={listRef}
                                                className={`flex-1 min-h-0 p-6 ${messageContainerClasses}`}
                                                style={messageContainerStyle}
                                                count={rows.length}
                                                resetKey={`${selectedChatId}|${debouncedSearchQuery}`}
                                                startIndex={savedRow ?? null}
                                                onFirstVisibleChange={rememberPosition}
                                                getScrubLabel={(index) => (rows[index].kind === 'date' ? rows[index].label : rows[index].dayLabel)}
                                                getRowKey={(index) => rows[index].key}
                                                getStickyLabel={(index) => (rows[index].kind === 'date' ? undefined : rows[index].dayLabel)}
                                                estimateSize={96}
                                                gap={8}
                                                renderRow={(index) => {
                                                    const row = rows[index];
                                                    if (row.kind === 'date') {
                                                        return (
                                                            <div className="flex justify-center my-4">
                                                                <span className="bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-semibold px-3 py-1 rounded-full shadow-sm">{row.label}</span>
                                                            </div>
                                                        );
                                                    }
                                                    const firstMessage = row.messages[0];
                                                    return (
                                                        <MessageGroup
                                                            messages={row.messages}
                                                            isOwnMessage={firstMessage.sender_name === rightAlignedUser}
                                                            showAvatar={showAvatars}
                                                            searchQuery={isSearching ? debouncedSearchQuery : undefined}
                                                            isSearching={isSearching}
                                                            onJumpFromSearch={handleJumpFromSearch}
                                                            customAvatarUrl={customAvatars[firstMessage.sender_name]}
                                                            onAvatarClick={() => handleAvatarChangeClick(firstMessage.sender_name)}
                                                            theme={selectedChatTheme}
                                                            createBlobUrl={createBlobUrl}
                                                        />
                                                    );
                                                }}
                                            />
                                        </div>
                                    </div>
                                    <div className={`absolute inset-0 transition-opacity duration-300 ${activeTab === 'media' ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                                        {activeTab === 'media' && <MediaGallery chat={selectedChat} onJumpToMessage={handleJumpToMessage} createBlobUrl={createBlobUrl} filters={galleryFilters} onFiltersChange={setGalleryFilters} scrollMemory={galleryScroll} />}
                                    </div>
                                    <div className={`absolute inset-0 transition-opacity duration-300 ${activeTab === 'library' ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                                        {activeTab === 'library' && selectedChat && (
                                            <LibraryPanel messages={toolMessages} starred={starredIds} onToggleStar={toggleStar} media={createBlobUrl} chatTitle={selectedChat.title} accent="bg-pink-500"
                                                onJump={(id) => { setActiveTab('messages'); jumpToMessage(id); }} />
                                        )}
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
        {isGlobalSearchOpen && onSearchAll && <GlobalSearch search={onSearchAll} onOpen={openGlobalHit} onClose={() => setIsGlobalSearchOpen(false)} accent="bg-pink-500" />}
        {hitNav && activeTab === 'messages' && (
            <HitNavigator position={hitNav.index + 1} total={hitNav.ids.length} onPrev={() => stepHit(-1)} onNext={() => stepHit(1)} onClose={() => setHitNav(null)} />
        )}
        </LightboxProvider>
        </StarProvider>
    );
};

export default InstagramChatViewer;