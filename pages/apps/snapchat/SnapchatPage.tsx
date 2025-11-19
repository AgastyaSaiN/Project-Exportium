
import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import JSZip from 'jszip';
import { Platform } from '../../../constants';
import SnapchatChatViewer from './SnapchatChatViewer';
import { Chat, Message, SnapchatMedia } from './types';

// --- Icon Components ---

const ArrowLeftIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
    </svg>
);

const UploadIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
    </svg>
);

const SpinnerIcon: React.FC<{className?: string}> = ({className}) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className={className}>
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);

const ExclamationTriangleIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
    </svg>
);

const CheckCircleIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);

const XCircleIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
         <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);

const InfoIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
    </svg>
);


// --- Component ---

interface SnapchatPageProps {
    platform: Platform;
}

interface ImportReport {
    totalChats: number;
    totalMessages: number;
    mediaCount: number;
    stickersCount: number;
    linkedMediaCount: number;
    mediaMessageCount: number;
    missingFiles: string[];
    fileSize: string;
}

// Recursively search for a file in the ZIP
const findFileInZip = (zip: JSZip, fileName: string): JSZip.JSZipObject | null => {
    // Direct check first
    if (zip.file(fileName)) return zip.file(fileName);
    if (zip.file(`json/${fileName}`)) return zip.file(`json/${fileName}`);
    if (zip.file(`html/${fileName}`)) return zip.file(`html/${fileName}`);

    // Regex search (slower but thorough)
    // Look for file at end of path, case insensitive
    const regex = new RegExp(`(^|[/\\\\])${fileName.replace('.', '\\.')}$`, 'i');
    const files = zip.file(regex);
    return files.length > 0 ? files[0] : null;
};

const parseSnapchatTimestamp = (ts: any): number => {
    if (!ts) return 0;
    if (typeof ts === 'number') return ts;
    if (typeof ts !== 'string') return 0;
    
    try {
        let str = ts.trim();
        // Fix common formats like "2023-10-27 12:00:00 UTC"
        if (str.endsWith(' UTC')) {
            str = str.slice(0, -4).replace(' ', 'T') + 'Z';
        } else {
             // Standardize separator
             str = str.replace(' ', 'T');
             // If no timezone info and looks like date-time, assume UTC to match most exports
             if (!str.endsWith('Z') && !/[+-]\d{2}:?\d{2}$/.test(str) && str.length > 10) {
                 str += 'Z';
             }
        }
        
        const d = new Date(str);
        const time = d.getTime();
        return isNaN(time) ? 0 : time;
    } catch (e) {
        return 0;
    }
};

const extractDateFromFilename = (filename: string): number | undefined => {
    // Match patterns like "2023-10-27-12-00-00" or "2023-10-27_12-00-00"
    // Common in chat_media and memories
    const match = filename.match(/(\d{4}-\d{2}-\d{2})[_-](\d{2}-\d{2}-\d{2})/);
    if (match) {
        const datePart = match[1];
        const timePart = match[2].replace(/-/g, ':');
        const isoString = `${datePart}T${timePart}Z`; // Assume UTC for filenames
        const ts = new Date(isoString).getTime();
        if (!isNaN(ts)) return ts;
    }
    
    // Try just date
    const dateMatch = filename.match(/(\d{4}-\d{2}-\d{2})/);
    if (dateMatch) {
        const ts = new Date(dateMatch[1]).getTime();
        if (!isNaN(ts)) return ts;
    }

    return undefined;
};

const SnapchatPage: React.FC<SnapchatPageProps> = ({ platform }) => {
    const { name, icon: Icon, color } = platform;
    const [status, setStatus] = useState<'idle' | 'processing' | 'summary' | 'viewing' | 'error'>('idle');
    const [processingStep, setProcessingStep] = useState('');
    const [errorMessage, setErrorMessage] = useState<string>('');
    const [chats, setChats] = useState<Chat[]>([]);
    const [stickers, setStickers] = useState<SnapchatMedia[]>([]);
    const [ownerName, setOwnerName] = useState<string>('');
    const [importReport, setImportReport] = useState<ImportReport | null>(null);
    const [theme, setTheme] = useState<'light' | 'dark'>('dark');
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        // Snapchat is dark-mode first
        const root = window.document.documentElement;
        root.classList.remove('light');
        root.classList.add('dark');
        setTheme('dark');
    }, []);

    const handleSelectArchiveClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setStatus('processing');
        setErrorMessage('');
        setChats([]);
        setStickers([]);
        setOwnerName('');
        setImportReport(null);

        try {
            setProcessingStep('Loading ZIP file...');
            const zip = await JSZip.loadAsync(file);
            
            // --- File Discovery ---
            const chatHistoryFile = findFileInZip(zip, 'chat_history.json');
            const memoriesHistoryFile = findFileInZip(zip, 'memories_history.json');
            
            const missingFiles: string[] = [];
            if (!chatHistoryFile) missingFiles.push('chat_history.json');
            if (!memoriesHistoryFile) missingFiles.push('memories_history.json');

            // --- Chat History Parsing First (for User ID) ---
            setProcessingStep('Parsing chat history...');
            if (!chatHistoryFile) throw new Error("Could not find 'chat_history.json'. This file is required.");
            
            const chatHistoryContent = await chatHistoryFile.async('string');
            const chatHistoryData = JSON.parse(chatHistoryContent);

            // --- Advanced User Identification ---
            // Instead of guessing from profile, we look at SENT messages. The sender of sent messages IS the user.
            setProcessingStep('Identifying user...');
            let determinedOwnerName: string | null = null;

            const sentLists = ['Sent Saved-in-Chat History', 'Sent Chat History'];
            for (const listName of sentLists) {
                if (chatHistoryData[listName] && Array.isArray(chatHistoryData[listName]) && chatHistoryData[listName].length > 0) {
                    const firstMsg = chatHistoryData[listName][0];
                    if (firstMsg && firstMsg.From) {
                        determinedOwnerName = firstMsg.From;
                        break;
                    }
                }
            }

            if (!determinedOwnerName) {
                 // Fallback to profile searching if chat history is empty of sent messages
                 const userProfileFiles = ['user_profile.json', 'account.json', 'login_history.json'];
                 for(const fileName of userProfileFiles) {
                    const file = findFileInZip(zip, fileName);
                    if (file) {
                        try {
                            const content = await file.async('string');
                            const data = JSON.parse(content);
                            if (data.username) determinedOwnerName = data.username;
                            if (data['Profile'] && data['Profile']['Username']) determinedOwnerName = data['Profile']['Username'];
                            if (!determinedOwnerName && data['Basic Information']?.Username) determinedOwnerName = data['Basic Information'].Username;
                            if (determinedOwnerName) break;
                        } catch(e) { console.warn(`Could not parse ${fileName}`, e); }
                    }
                }
            }
            
            determinedOwnerName = determinedOwnerName || "You";
            setOwnerName(determinedOwnerName);
            
            // --- Media Scanning ---
            setProcessingStep('Discovering media files...');
            const allMediaMap = new Map<string, SnapchatMedia>();
            
            const mediaScanPromises: Promise<void>[] = [];
            
            zip.forEach((relativePath, file) => {
                // Include more extensions and loose folder checking
                const isMediaFile = !file.dir && /\.(jpg|jpeg|png|mp4|mov|webp)$/i.test(relativePath) && !relativePath.includes('stickers/');
                
                if (isMediaFile) {
                    const promise = async () => {
                        try {
                            const fileName = relativePath.split('/').pop() || relativePath;
                            let dateFromFilename = extractDateFromFilename(fileName);

                            // CRITICAL FALLBACK: If filename has no date (random hash), use ZIP entry date
                            if (!dateFromFilename) {
                                dateFromFilename = file.date.getTime();
                            }

                            const blob = await file.async('blob');
                            const mediaItem: SnapchatMedia = {
                                type: /\.(mp4|mov)$/i.test(relativePath) ? 'video' : 'image',
                                path: relativePath,
                                blobUrl: URL.createObjectURL(blob),
                                date: dateFromFilename
                            };
                            
                            allMediaMap.set(relativePath, mediaItem);
                            
                            // Also map by filename for easier linking
                            if (!allMediaMap.has(fileName)) {
                                allMediaMap.set(fileName, mediaItem);
                            }
                        } catch (e) {
                            console.error(`Failed to process media file: ${relativePath}`, e);
                        }
                    };
                    mediaScanPromises.push(promise());
                }
            });
            
            await Promise.all(mediaScanPromises);

            // --- Memories History Processing (Metadata Enrichment) ---
            if(memoriesHistoryFile) {
                try {
                    const content = await memoriesHistoryFile.async('string');
                    const data = JSON.parse(content);
                    const savedMedia = data["Saved Media"] || data["Received Saved Media"] || [];
                    if(Array.isArray(savedMedia)) {
                        savedMedia.forEach((item: any) => {
                           const mediaId = item["Media ID"]; 
                           const timestamp = parseSnapchatTimestamp(item.Date);
                           
                           if(mediaId && timestamp > 0) {
                                if(allMediaMap.has(mediaId)) {
                                    const m = allMediaMap.get(mediaId)!;
                                    m.date = timestamp; 
                                }
                           }
                        });
                    }
                } catch(e) {
                    console.warn("Could not parse memories_history.json", e);
                }
            }

            // --- Process Chat Messages ---
            let allMessagesRaw: any[] = [];
            const extractMessages = (list: any[], type: string) => {
                if(!Array.isArray(list)) return;
                list.forEach(m => { allMessagesRaw.push({ ...m, type }); });
            };

            extractMessages(chatHistoryData['Received Saved-in-Chat History'], 'received');
            extractMessages(chatHistoryData['Received Chat History'], 'received');
            extractMessages(chatHistoryData['Sent Saved-in-Chat History'], 'sent');
            extractMessages(chatHistoryData['Sent Chat History'], 'sent');
            
            // Catch-all
            if (allMessagesRaw.length === 0) {
                 for (const key in chatHistoryData) {
                    if (Array.isArray(chatHistoryData[key])) {
                        extractMessages(chatHistoryData[key], 'unknown');
                    }
                }
            }

            if (allMessagesRaw.length === 0) throw new Error("No messages found in chat_history.json.");
            allMessagesRaw.sort((a, b) => parseSnapchatTimestamp(a.Created) - parseSnapchatTimestamp(b.Created));

            const conversations = new Map<string, Chat>();
            
            for (const rawMsg of allMessagesRaw) {
                let sender = rawMsg.From;
                let recipient = rawMsg.To;
                
                // Logic to ensure alignment based on detected owner
                if (!sender && rawMsg.type === 'sent') sender = determinedOwnerName;
                if (!recipient && rawMsg.type === 'received') recipient = determinedOwnerName;
                if (!sender) sender = "Unknown"; 

                const isSent = sender === determinedOwnerName;
                const otherUser = isSent ? (recipient || "Unknown") : sender;

                if (!conversations.has(otherUser)) {
                    conversations.set(otherUser, { 
                        id: otherUser, 
                        title: otherUser, 
                        participants: [{ name: determinedOwnerName }, { name: otherUser }], 
                        messages: [], 
                        lastActivity: 0 
                    });
                }

                const chat = conversations.get(otherUser)!;
                const timestamp = parseSnapchatTimestamp(rawMsg.Created);
                if (timestamp === 0) continue;

                const mediaType = rawMsg['Media Type'] || 'TEXT';
                const content = rawMsg.Text || rawMsg.Content;

                const message: Message = {
                    id: `${timestamp}-${chat.messages.length}`,
                    sender_name: sender,
                    timestamp_ms: timestamp,
                    media_type: mediaType,
                    content: content
                };
                
                const explicitMediaRef = rawMsg.Media;
                if (explicitMediaRef && allMediaMap.has(explicitMediaRef)) {
                    message.linkedMedia = allMediaMap.get(explicitMediaRef)!;
                }

                chat.messages.push(message);
                chat.lastActivity = timestamp;
            }

            // --- Media Linking ---
            setProcessingStep('Linking media to chats...');
            
            const datedMedia = Array.from(allMediaMap.values())
                .filter(m => m.date !== undefined)
                .sort((a, b) => a.date! - b.date!);
            
            // Increase match window to handle potential clock skew or upload/save delays
            const MATCH_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

            let linkedCount = 0;

            for (const chat of conversations.values()) {
                for (const message of chat.messages) {
                    if (!message.linkedMedia && ['MEDIA', 'VIDEO', 'NOTE', 'SNAP', 'IMAGE', 'SAVED_CHAT_MEDIA'].includes(message.media_type)) {
                        let bestMatch: SnapchatMedia | null = null;
                        let minDiff = Infinity;
                        
                        // Optimization: could be binary search, but for <5k items linear scan is okay
                        for (const mediaItem of datedMedia) {
                            if (!mediaItem.date) continue;
                            const diff = Math.abs(mediaItem.date - message.timestamp_ms);
                            
                            if (mediaItem.date > message.timestamp_ms + MATCH_WINDOW_MS) break; // optimizing sorted scan
                            
                            if (diff < MATCH_WINDOW_MS) {
                                if (diff < minDiff) {
                                    minDiff = diff;
                                    bestMatch = mediaItem;
                                }
                            }
                        }

                        if (bestMatch) {
                            message.linkedMedia = bestMatch;
                            linkedCount++;
                        }
                    }
                }
            }
            
            setChats(Array.from(conversations.values()).sort((a, b) => (b.lastActivity ?? 0) - (a.lastActivity ?? 0)));

            // --- Stickers ---
            const stickerPromises: Promise<SnapchatMedia | null>[] = [];
            zip.forEach((relativePath, file) => {
                if (!file.dir && relativePath.includes('stickers/') && /\.(png|webp|gif)$/i.test(relativePath)) {
                     const promise = async (): Promise<SnapchatMedia | null> => {
                        try {
                            const blob = await file.async('blob');
                            return { type: 'sticker', path: relativePath, blobUrl: URL.createObjectURL(blob) };
                        } catch (e) { return null; }
                    };
                    stickerPromises.push(promise());
                }
            });
            
            const allStickers = (await Promise.all(stickerPromises)).filter((s): s is SnapchatMedia => s !== null);
            setStickers(allStickers);

            let totalMessages = 0;
            let mediaMessageCount = 0; 
            
            Array.from(conversations.values()).forEach(c => {
                totalMessages += c.messages.length;
                c.messages.forEach(m => {
                    if (['MEDIA', 'SNAP', 'VIDEO', 'IMAGE', 'NOTE', 'SAVED_CHAT_MEDIA'].includes(m.media_type)) {
                        mediaMessageCount++;
                    }
                });
            });

            setImportReport({
                totalChats: conversations.size,
                totalMessages,
                mediaCount: allMediaMap.size,
                stickersCount: allStickers.length,
                linkedMediaCount: linkedCount,
                mediaMessageCount,
                missingFiles,
                fileSize: (file.size / (1024 * 1024)).toFixed(2) + ' MB'
            });

            setStatus('summary');
        
        } catch (error) {
            console.error("Failed to process Snapchat archive:", error);
            setStatus('error');
            setErrorMessage(error instanceof Error ? error.message : "An unknown error occurred during processing.");
        } finally {
             if(event.target) event.target.value = '';
        }
    };
    
    const handleReset = () => {
        setStatus('idle');
        setErrorMessage('');
        setChats([]);
        setStickers([]);
        setOwnerName('');
        setImportReport(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleProceed = () => {
        setStatus('viewing');
    };

    const renderSummaryView = () => {
        if (!importReport) return null;
        const isChatHistoryMissing = importReport.missingFiles.includes('chat_history.json');
        const isMemoriesMissing = importReport.missingFiles.includes('memories_history.json');

        // Determine if missing files are actually critical or just warnings
        const showCriticalError = isChatHistoryMissing;
        const showMemoriesWarning = isMemoriesMissing && importReport.mediaCount > 0;

        return (
            <div className="max-w-3xl w-full mx-auto bg-slate-800 rounded-2xl shadow-2xl p-8 border border-slate-700">
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-yellow-400 mb-4">
                        <CheckCircleIcon className="w-10 h-10 text-slate-900" />
                    </div>
                    <h2 className="text-3xl font-bold text-white">Analysis Complete</h2>
                    <p className="text-slate-400 mt-2">We've scanned your archive. Here's what we found.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                    <div className="bg-slate-900/50 rounded-xl p-5 border border-slate-700">
                        <h3 className="text-sm uppercase tracking-wider text-slate-500 font-bold mb-4">Overview</h3>
                        <div className="space-y-3">
                             <div className="flex justify-between">
                                <span className="text-slate-300">File Size</span>
                                <span className="font-mono text-yellow-400">{importReport.fileSize}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-300">Chats Found</span>
                                <span className="font-mono text-yellow-400">{importReport.totalChats}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-300">Total Messages</span>
                                <span className="font-mono text-yellow-400">{importReport.totalMessages}</span>
                            </div>
                        </div>
                    </div>

                    <div className="bg-slate-900/50 rounded-xl p-5 border border-slate-700">
                        <h3 className="text-sm uppercase tracking-wider text-slate-500 font-bold mb-4">Media Health</h3>
                        <div className="space-y-3">
                            <div className="flex justify-between">
                                <span className="text-slate-300">Media Files Found</span>
                                <span className="font-mono text-yellow-400">{importReport.mediaCount}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-300">Stickers Found</span>
                                <span className="font-mono text-yellow-400">{importReport.stickersCount}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-slate-300">Media Linking</span>
                                <div className="text-right">
                                    <span className={`font-mono font-bold ${importReport.linkedMediaCount > 0 ? 'text-green-400' : 'text-yellow-500'}`}>
                                        {importReport.linkedMediaCount} / {importReport.mediaMessageCount}
                                    </span>
                                </div>
                            </div>
                             {importReport.mediaMessageCount > 0 && importReport.linkedMediaCount === 0 && (
                                <p className="text-xs text-slate-500 mt-1">
                                    Linking is relying on file creation dates from the ZIP since direct metadata was not found.
                                </p>
                            )}
                        </div>
                    </div>
                </div>

                <div className="mb-8">
                    <h3 className="text-sm uppercase tracking-wider text-slate-500 font-bold mb-4">Your Identity</h3>
                    <div className="bg-slate-900/50 rounded-xl p-5 border border-slate-700 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div>
                            <p className="text-slate-300 text-sm">Detected Username</p>
                            <p className="text-xs text-slate-500 mt-1">Auto-detected from your Sent messages.</p>
                        </div>
                        <input 
                            type="text" 
                            value={ownerName} 
                            onChange={(e) => setOwnerName(e.target.value)}
                            className="bg-slate-800 border border-slate-600 text-white text-sm rounded-lg focus:ring-yellow-400 focus:border-yellow-400 block w-full sm:w-48 p-2.5"
                        />
                    </div>
                </div>

                {showCriticalError && (
                     <div className="bg-red-900/20 border border-red-900/50 rounded-xl p-4 mb-8">
                        <div className="flex items-start">
                            <XCircleIcon className="w-5 h-5 text-red-500 mt-0.5 mr-3 flex-shrink-0" />
                            <div>
                                <h4 className="text-red-400 font-bold text-sm">Critical Files Missing</h4>
                                <p className="text-red-300 text-sm mt-1">
                                    <span className="font-mono">chat_history.json</span> not found. We cannot display chats without it.
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {showMemoriesWarning && (
                    <div className="bg-blue-900/20 border border-blue-900/50 rounded-xl p-4 mb-8">
                        <div className="flex items-start">
                            <InfoIcon className="w-5 h-5 text-blue-400 mt-0.5 mr-3 flex-shrink-0" />
                            <div>
                                <h4 className="text-blue-400 font-bold text-sm">Missing Metadata</h4>
                                <p className="text-blue-300 text-sm mt-1">
                                    <span className="font-mono">memories_history.json</span> was not found. This is normal for some exports.
                                    We are using file dates from the ZIP archive to link media to messages.
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <button 
                        onClick={handleReset}
                        className="px-6 py-3 rounded-lg font-semibold text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
                    >
                        Back to Upload
                    </button>
                    <button 
                        onClick={handleProceed}
                        disabled={showCriticalError}
                        className={`px-8 py-3 rounded-lg font-bold text-slate-900 transition-transform hover:scale-105 shadow-lg ${showCriticalError ? 'bg-slate-600 cursor-not-allowed' : 'bg-yellow-400 hover:bg-yellow-500'}`}
                    >
                        View Chats
                    </button>
                </div>
            </div>
        );
    };

    const renderUploadView = () => {
        switch (status) {
            case 'processing':
                return (
                    <div className="text-center">
                        <SpinnerIcon className="w-20 h-20 mx-auto text-yellow-400 animate-spin mb-6" />
                        <h2 className="text-3xl font-bold text-slate-200">Processing...</h2>
                        <p className="mt-2 text-lg text-slate-400 max-w-md mx-auto">
                           {processingStep}
                        </p>
                    </div>
                );
            case 'summary':
                return renderSummaryView();
            case 'error':
                 return (
                    <div className="text-center">
                        <ExclamationTriangleIcon className="w-24 h-24 mx-auto text-red-500 mb-4" />
                        <h2 className="text-4xl font-bold text-slate-100">Processing Failed</h2>
                        <p className="mt-3 text-md text-red-300 bg-red-900/30 p-3 rounded-md max-w-xl mx-auto">
                            {errorMessage}
                        </p>
                         <div className="mt-10">
                            <button
                                onClick={handleReset}
                                className="inline-flex items-center justify-center w-full sm:w-auto px-8 py-4 bg-yellow-400 text-slate-900 font-bold rounded-lg shadow-lg hover:bg-yellow-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-400 transition-all duration-300 transform hover:scale-105"
                            >
                                Start Over
                            </button>
                        </div>
                    </div>
                );
            case 'idle':
            default:
                return (
                    <div className="text-center w-full max-w-2xl">
                        <Icon className={`w-24 h-24 mx-auto mb-6 ${color}`} />
                        <h1 className="text-5xl font-bold text-slate-100">
                            {name} Chat Viewer
                        </h1>
                        <p className="mt-4 text-xl text-slate-400">
                            Upload your <span className="font-semibold text-slate-300">mydata.zip</span> file to view your saved chats.
                        </p>
                        <div className="mt-12">
                            <button 
                                onClick={handleSelectArchiveClick}
                                className="inline-flex items-center justify-center w-full sm:w-auto px-8 py-4 bg-yellow-400 text-slate-900 font-bold rounded-lg shadow-lg hover:bg-yellow-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-400 transition-all duration-300 transform hover:scale-105"
                            >
                                <UploadIcon className="w-6 h-6 mr-3" />
                                Select mydata.zip
                            </button>
                        </div>
                    </div>
                );
        }
    };

    if (status === 'viewing' && chats.length > 0) {
        return (
             <SnapchatChatViewer 
                chats={chats}
                stickers={stickers}
                ownerName={ownerName} 
                onReset={handleReset}
                platform={platform}
            />
        )
    }

    return (
        <div className="flex flex-col min-h-screen bg-slate-900 p-4">
             <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
                accept=".zip"
            />
            <div className="flex-grow flex items-center justify-center">
                {renderUploadView()}
            </div>
            {status !== 'processing' && status !== 'summary' && (
                 <div className="flex-shrink-0 py-6 text-center">
                    <Link
                        to="/"
                        className="inline-flex items-center px-4 py-2 text-slate-400 font-semibold rounded-lg hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-400 transition-all duration-300"
                    >
                        <ArrowLeftIcon className="w-5 h-5 mr-2" />
                        Back to Home
                    </Link>
                </div>
            )}
        </div>
    );
};

export default SnapchatPage;
