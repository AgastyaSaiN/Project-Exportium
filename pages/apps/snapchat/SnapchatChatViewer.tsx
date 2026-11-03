
import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import VirtualList from '../../../components/VirtualList';
import type { ZipArchive } from '../../../utils/zipArchive';
import { InternalChat, InternalMessage } from './types';
import { useMediaLoader } from '../../../utils/mediaLoader';
import type { MediaSource } from '../../../utils/mediaLoader';
import LazyMedia from '../../../components/LazyMedia';
import { LightboxProvider } from '../../../components/Lightbox';
import type { LightboxItem } from '../../../components/Lightbox';
import type { VirtualListHandle } from '../../../components/VirtualList';
import { StarButton, StarProvider } from '../../../components/ChatTools';
import LibraryPanel from '../../../components/LibraryPanel';
import type { ToolMessage } from '../../../utils/chatData';
import { useExportPrefs } from '../../../utils/storage';
import { useChatShortcuts } from '../../../utils/useChatShortcuts';
import GlobalSearch from '../../../components/GlobalSearch';
import type { GlobalHit, GlobalSearchFn } from '../../../components/GlobalSearch';
import CalendarPopover, { CalendarDaysIcon, dayKey } from '../../../components/CalendarPopover';
import WallpaperPicker from '../../../components/WallpaperPicker';
import { resolveWallpaper, storableWallpaper, wallpaperStyle } from '../../../utils/wallpapers';


type SnapRow =
    | { kind: 'date'; key: string; label: string }
    | { kind: 'message'; key: string; msg: InternalMessage; dayLabel: string };

// Icons
const SearchIcon = (props: React.SVGProps<SVGSVGElement>) => (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" /></svg>);
const ArrowLeftIcon = (props: React.SVGProps<SVGSVGElement>) => (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" /></svg>);
const SettingsIcon = (props: React.SVGProps<SVGSVGElement>) => (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-1.007 1.11-1.226.55-.22 1.156-.22 1.706 0 .55.22 1.02.684 1.11 1.226l.08 1.485a2.5 2.5 0 011.82 2.336 2.5 2.5 0 01-.1 1.026l.42 1.696a2.5 2.5 0 01-2.22 3.097l-1.696-.42a2.5 2.5 0 01-1.026-.1 2.5 2.5 0 01-2.336-1.82l-1.485-.08a2.5 2.5 0 01-3.097-2.22l.42-1.696a2.5 2.5 0 01.1-1.026 2.5 2.5 0 011.82-2.336l1.485.08zm-2.478 8.485a.5.5 0 01.378-.85l.74-.185a2.5 2.5 0 012.336 1.82.5.5 0 01-.85.378l-.185.74a2.5 2.5 0 01-1.82-2.336zM12 15.75a3.75 3.75 0 100-7.5 3.75 3.75 0 000 7.5z" /></svg>);
const CloseIcon = (props: React.SVGProps<SVGSVGElement>) => (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>);

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
const MessageBubble: React.FC<{ msg: InternalMessage, isOwner: boolean, media: MediaSource }> = React.memo(({ msg, isOwner, media }) => {
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
            <div className={`group relative max-w-[70%] rounded-lg ${bgColor} ${borderColor} shadow-sm`}>
                <StarButton id={msg.id} />
                {msg.media && (
                    <LazyMedia
                        uri={msg.media.uri}
                        media={media}
                        kind={msg.media.type === 'video' ? 'video' : msg.media.type === 'audio' ? 'audio' : 'image'}
                        className={msg.media.type === 'video' ? 'w-full max-h-80 object-contain bg-black' : 'w-full max-h-80 object-cover'}
                        alt="Snap"
                    />
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
});

const SettingsModal: React.FC<{ isOpen: boolean; onClose: () => void; currentOwner: string; onOwnerChange: (newOwner: string) => void; wallpaper: string | null; onWallpaperChange: (value: string | null) => void }> = ({ isOpen, onClose, currentOwner, onOwnerChange, wallpaper, onWallpaperChange }) => {
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

                <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Chat Wallpaper</label>
                    <WallpaperPicker value={wallpaper} onChange={onWallpaperChange} ringClass="ring-yellow-400" tone="yellow" dark />
                </div>
            </div>
        </div>
    );
};

interface SnapchatChatViewerProps {
    chats: InternalChat[];
    owner: string;
    zip: ZipArchive | null;
    exportKey?: string;
    onBack: () => void;
}

const SnapchatChatViewer: React.FC<SnapchatChatViewerProps> = ({ chats, owner, zip, exportKey, onBack }) => {
    const [prefs, updatePrefs] = useExportPrefs(exportKey);
    const [showLibrary, setShowLibrary] = useState(false);
    const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [currentOwner, setCurrentOwner] = useState(prefs.owner?.all ?? owner);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isCalendarOpen, setIsCalendarOpen] = useState(false);
    const [wallpaper, setWallpaper] = useState<string | null>(resolveWallpaper(prefs.wallpaper?.all));

    // Update internal owner state if prop changes (re-upload)
    useEffect(() => {
        setCurrentOwner(prefs.owner?.all ?? owner);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [owner]);

    const filteredChats = useMemo(() => {
        return chats.filter(c => c.participant.toLowerCase().includes(searchTerm.toLowerCase()));
    }, [chats, searchTerm]);

    const selectedChat = useMemo(() => chats.find(c => c.id === selectedChatId), [chats, selectedChatId]);

    const getBlob = useCallback(async (uri: string): Promise<Blob | undefined> => {
        return (await zip?.file(uri)?.async('blob')) ?? undefined;
    }, [zip]);
    const mediaLoader = useMediaLoader(getBlob);

    // Flatten into date separators and messages so the virtual list can window over all of them.
    const { rows, rowIndexByMessageId } = useMemo(() => {
        const out: SnapRow[] = [];
        const indexById = new Map<string, number>();
        let lastDay = -1;
        let dayLabel = '';
        for (const msg of selectedChat?.messages ?? []) {
            // Compare cheap numeric day keys; only format a label when the day actually changes.
            const d = new Date(msg.timestamp);
            const day = d.getFullYear() * 10000 + d.getMonth() * 100 + d.getDate();
            if (day !== lastDay) {
                dayLabel = formatDate(msg.timestamp);
                out.push({ kind: 'date', key: `date-${msg.id}`, label: dayLabel });
                lastDay = day;
            }
            indexById.set(msg.id, out.length);
            out.push({ kind: 'message', key: msg.id, msg, dayLabel });
        }
        return { rows: out, rowIndexByMessageId: indexById };
    }, [selectedChat]);

    const listRef = useRef<VirtualListHandle>(null);
    const [isGlobalSearchOpen, setIsGlobalSearchOpen] = useState(false);
    const [pendingJump, setPendingJump] = useState<string | null>(null);

    const searchAllChats = useCallback<GlobalSearchFn>(async (query, onProgress, signal) => {
        const needle = query.toLowerCase();
        const found: GlobalHit[] = [];
        for (let c = 0; c < chats.length; c++) {
            onProgress(c, chats.length);
            const messages = chats[c].messages;
            for (let i = messages.length - 1; i >= 0 && found.length < 400; i--) {
                const message = messages[i];
                if (message.content && message.content.toLowerCase().includes(needle)) {
                    found.push({ chatId: chats[c].id, chatTitle: chats[c].participant, messageId: message.id, sender: message.sender, ts: message.timestamp, text: message.content });
                }
                if (i % 20000 === 0) { await new Promise(resolve => setTimeout(resolve, 0)); if (signal.aborted) return found; }
            }
        }
        onProgress(chats.length, chats.length);
        return found;
    }, [chats]);

    const openGlobalHit = (hit: GlobalHit) => {
        setIsGlobalSearchOpen(false);
        setShowLibrary(false);
        setSelectedChatId(hit.chatId);
        setPendingJump(hit.messageId);
    };
    useEffect(() => {
        if (pendingJump === null || showLibrary) return;
        const row = rowIndexByMessageId.get(pendingJump);
        if (row === undefined) return;
        const frame = requestAnimationFrame(() => { listRef.current?.scrollToIndex(row, 'center'); setPendingJump(null); });
        return () => cancelAnimationFrame(frame);
    }, [pendingJump, showLibrary, rowIndexByMessageId]);

    const chatKey = selectedChatId ?? '';
    const starredIds = useMemo(() => new Set(prefs.stars?.[chatKey] ?? []), [prefs.stars, chatKey]);
    const toggleStar = useCallback((id: string) => updatePrefs(p => {
        const current = new Set(p.stars?.[chatKey] ?? []);
        if (current.has(id)) current.delete(id); else current.add(id);
        return { ...p, stars: { ...p.stars, [chatKey]: Array.from(current) } };
    }), [updatePrefs, chatKey]);
    const toolMessages = useMemo<ToolMessage[]>(() => (selectedChat?.messages ?? []).map(m => ({
        id: m.id, sender: m.sender, ts: m.timestamp, text: m.content ?? '',
        files: m.media && m.media.type === 'audio' ? [{ uri: m.media.uri, name: m.media.filename }] : undefined,
    })), [selectedChat]);

    // Remember where the reader was in each chat, and return there next time.
    const savedRow = chatKey && prefs.positions?.[chatKey] ? rowIndexByMessageId.get(prefs.positions[chatKey]) : undefined;
    const rememberPosition = useCallback((rowIndex: number) => {
        if (!chatKey) return;
        const row = rows[rowIndex];
        const next = rows[rowIndex + 1];
        const id = row?.kind === 'message' ? row.msg.id : next?.kind === 'message' ? next.msg.id : undefined;
        if (id) updatePrefs(p => (p.positions?.[chatKey] === id ? p : { ...p, positions: { ...p.positions, [chatKey]: id } }));
    }, [rows, updatePrefs, chatKey]);

    const activeDays = useMemo(() => new Set((selectedChat?.messages ?? []).map(m => dayKey(m.timestamp))), [selectedChat]);
    const handleDateSelect = (date: Date) => {
        const start = new Date(date).setHours(0, 0, 0, 0);
        const messages = selectedChat?.messages ?? [];
        const target = messages.find(m => m.timestamp >= start) ?? messages[messages.length - 1];
        if (!target) return;
        setShowLibrary(false);
        setPendingJump(target.id);
    };

    useChatShortcuts({
        onGoToDate: () => setIsCalendarOpen(true),
        onGlobalFind: () => setIsGlobalSearchOpen(true),
        onTop: () => listRef.current?.scrollToTop(),
        onBottom: () => listRef.current?.scrollToBottom(),
    }, !showLibrary);

    // Every photo/video in the open chat, oldest first.
    const chatMediaItems = useMemo<LightboxItem[]>(() => {
        const items: LightboxItem[] = [];
        for (const msg of selectedChat?.messages ?? []) {
            if (msg.media && msg.media.type !== 'audio') items.push({ uri: msg.media.uri, kind: msg.media.type === 'video' ? 'video' : 'image', sender: msg.sender, timestamp: msg.timestamp, ref: msg.id });
        }
        return items;
    }, [selectedChat]);

    const renderRow = (index: number) => {
        const row = rows[index];
        if (row.kind === 'date') {
            return (
                <div className="flex justify-center my-4">
                    <span className="bg-gray-800 text-gray-400 text-xs px-3 py-1 rounded-full font-bold uppercase tracking-wider">{row.label}</span>
                </div>
            );
        }
        return <MessageBubble msg={row.msg} isOwner={row.msg.sender === currentOwner} media={mediaLoader.source} />;
    };

    return (
        <StarProvider starred={starredIds} onToggle={toggleStar}>
        <LightboxProvider items={chatMediaItems} media={mediaLoader.source} onShowInChat={(item) => { const row = rowIndexByMessageId.get(item.ref as string); if (row !== undefined) listRef.current?.scrollToIndex(row, 'center'); }}>
        <div className="flex h-screen bg-black text-white overflow-hidden">
            <SettingsModal 
                isOpen={isSettingsOpen} 
                onClose={() => setIsSettingsOpen(false)} 
                currentOwner={currentOwner} 
                onOwnerChange={(name) => { setCurrentOwner(name); updatePrefs(p => ({ ...p, owner: { ...p.owner, all: name } })); }}
                wallpaper={wallpaper}
                onWallpaperChange={(value) => { setWallpaper(value); updatePrefs(p => ({ ...p, wallpaper: { ...p.wallpaper, all: storableWallpaper(value) } })); }}
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
                    <button type="button" onClick={() => setIsGlobalSearchOpen(true)} className="mt-2 w-full px-3 py-2 rounded-lg border border-gray-700 text-sm text-gray-300 hover:bg-gray-900 transition-colors text-left">
                        Search all messages <span className="float-right text-xs opacity-60">Ctrl+Shift+F</span>
                    </button>
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
                                onClick={() => setShowLibrary(v => !v)}
                                className={`ml-auto mr-2 px-3 py-1.5 rounded-full text-sm font-semibold transition-colors ${showLibrary ? 'bg-yellow-400 text-black' : 'bg-gray-800 text-gray-200 hover:bg-gray-700'}`}
                            >
                                {showLibrary ? 'Back to chat' : `Library${starredIds.size ? ` (${starredIds.size})` : ''}`}
                            </button>
                            <button
                                onClick={() => setIsCalendarOpen(open => !open)}
                                aria-label="Jump to date"
                                className="p-2 hover:bg-gray-800 rounded-full text-gray-400 hover:text-white transition-colors"
                            >
                                <CalendarDaysIcon className="w-6 h-6" />
                            </button>
                            <button
                                onClick={() => setIsSettingsOpen(true)}
                                className="p-2 hover:bg-gray-800 rounded-full text-gray-400 hover:text-white transition-colors"
                            >
                                <SettingsIcon className="w-6 h-6" />
                            </button>
                        </div>
                        
                        <div className="relative"><CalendarPopover tone="yellow" startAt={selectedChat.messages[selectedChat.messages.length - 1]?.timestamp} isOpen={isCalendarOpen} onClose={() => setIsCalendarOpen(false)} onDateSelect={handleDateSelect} activeDays={activeDays} /></div>
                        {showLibrary ? (
                            <div className="flex-1 min-h-0">
                                <LibraryPanel messages={toolMessages} starred={starredIds} onToggleStar={toggleStar} media={mediaLoader.source} chatTitle={selectedChat.participant} accent="bg-yellow-400"
                                    onJump={(id) => {
                                        setShowLibrary(false);
                                        const row = rowIndexByMessageId.get(id);
                                        if (row !== undefined) requestAnimationFrame(() => listRef.current?.scrollToIndex(row, 'center'));
                                    }} />
                            </div>
                        ) : (
                        <VirtualList
                            ref={listRef}
                            className="flex-1 p-4"
                            style={wallpaperStyle(wallpaper, { tone: 'yellow', dark: true })}
                            count={rows.length}
                            resetKey={selectedChatId}
                            startIndex={savedRow ?? null}
                            onFirstVisibleChange={rememberPosition}
                            getScrubLabel={(index) => (rows[index].kind === 'date' ? rows[index].label : rows[index].dayLabel)}
                            getRowKey={(index) => rows[index].key}
                            renderRow={renderRow}
                            getStickyLabel={(index) => (rows[index].kind === 'date' ? undefined : rows[index].dayLabel)}
                            stickyClassName="bg-gray-800/95 text-gray-300 text-xs px-3 py-1 rounded-full font-bold uppercase tracking-wider shadow"
                            estimateSize={90}
                            gap={4}
                        />
                        )}
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
        </LightboxProvider>
        {isGlobalSearchOpen && <GlobalSearch search={searchAllChats} onOpen={openGlobalHit} onClose={() => setIsGlobalSearchOpen(false)} accent="bg-yellow-400" />}
        </StarProvider>
    );
};

export default SnapchatChatViewer;
