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


// --- Component ---

interface SnapchatPageProps {
    platform: Platform;
}

const parseSnapchatTimestamp = (ts: string): number => new Date(ts.replace(' UTC', 'Z')).getTime();

const SnapchatPage: React.FC<SnapchatPageProps> = ({ platform }) => {
    const { name, icon: Icon, color } = platform;
    const [status, setStatus] = useState<'idle' | 'processing' | 'error'>('idle');
    const [processingStep, setProcessingStep] = useState('');
    const [errorMessage, setErrorMessage] = useState<string>('');
    const [chats, setChats] = useState<Chat[]>([]);
    const [stickers, setStickers] = useState<SnapchatMedia[]>([]);
    const [ownerName, setOwnerName] = useState<string>('');
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

        try {
            setProcessingStep('Loading ZIP file...');
            const zip = await JSZip.loadAsync(file);

            setProcessingStep('Identifying user...');
            let determinedOwnerName: string | null = null;
            const userProfilePaths = ['json/user_profile.json', 'json/account.json', 'json/login_history.json'];
            for(const path of userProfilePaths) {
                const file = zip.file(path);
                if (file) {
                    try {
                        const content = await file.async('string');
                        const data = JSON.parse(content);
                        if(path.includes('user_profile')) determinedOwnerName = data.username;
                        if(path.includes('account')) determinedOwnerName = (Array.isArray(data) ? data[0] : data)?.Username;
                        if(path.includes('login_history')) determinedOwnerName = data['Login History']?.find((e: any) => e.Username)?.Username;
                        if(determinedOwnerName) break;
                    } catch(e) { console.warn(`Could not parse ${path}`, e); }
                }
            }
            determinedOwnerName = determinedOwnerName || "You";
            setOwnerName(determinedOwnerName);
            
            setProcessingStep('Discovering media files...');
            const allMediaMap = new Map<string, SnapchatMedia>();
            const mediaFolders = ['memories', 'chat_media'];
            const mediaScanPromises: Promise<void>[] = [];

            mediaFolders.forEach(folderName => {
                zip.folder(folderName)?.forEach((relativePath, file) => {
                    if (!file.dir && /\.(jpg|jpeg|png|mp4|mov)$/i.test(relativePath)) {
                        const promise = async () => {
                            try {
                                const blob = await file.async('blob');
                                const fullPath = `${folderName}/${relativePath}`;
                                allMediaMap.set(fullPath, {
                                    type: /\.(mp4|mov)$/i.test(relativePath) ? 'video' : 'image',
                                    path: fullPath,
                                    blobUrl: URL.createObjectURL(blob),
                                });
                            } catch (e) {
                                console.error(`Failed to process media file: ${relativePath}`, e);
                            }
                        };
                        mediaScanPromises.push(promise());
                    }
                });
            });
            await Promise.all(mediaScanPromises);
            
            const memoriesHistoryFile = zip.file('json/memories_history.json');
            if(memoriesHistoryFile) {
                try {
                    const content = await memoriesHistoryFile.async('string');
                    const data = JSON.parse(content);
                    if(data["Saved Media"]) {
                        data["Saved Media"].forEach((item: any) => {
                           const mediaPath = item["Media ID"];
                           if(mediaPath && allMediaMap.has(mediaPath)) {
                              const mediaItem = allMediaMap.get(mediaPath)!;
                              mediaItem.date = parseSnapchatTimestamp(item.Date);
                           }
                        });
                    }
                } catch(e) {
                    console.warn("Could not parse memories_history.json", e);
                }
            }

            setProcessingStep('Parsing chat history...');
            const chatHistoryFile = zip.file('json/chat_history.json');
            if (!chatHistoryFile) throw new Error("Could not find 'json/chat_history.json'. This file is required to view conversations.");
            const chatHistoryContent = await chatHistoryFile.async('string');
            const chatHistoryData = JSON.parse(chatHistoryContent);

            let allMessagesRaw: any[] = [];
            const receivedKeys = ['Received Saved-in-Chat History', 'Received Chat History'];
            const sentKeys = ['Sent Saved-in-Chat History', 'Sent Chat History'];
            receivedKeys.forEach(key => { if (Array.isArray(chatHistoryData[key])) allMessagesRaw.push(...chatHistoryData[key].map((m: any) => ({ ...m, type: 'received' }))); });
            sentKeys.forEach(key => { if (Array.isArray(chatHistoryData[key])) allMessagesRaw.push(...chatHistoryData[key].map((m: any) => ({ ...m, type: 'sent' }))); });
            if (allMessagesRaw.length === 0) {
                 for (const key in chatHistoryData) {
                    if (Object.prototype.hasOwnProperty.call(chatHistoryData, key) && Array.isArray(chatHistoryData[key])) {
                        const p = chatHistoryData[key];
                        if (p.length > 0 && p[0].Created && (p[0].From || p[0].To)) {
                            p.forEach((msg: any) => allMessagesRaw.push({ ...msg, type: msg.To ? 'sent' : 'received' }));
                        }
                    }
                }
            }
            if (allMessagesRaw.length === 0) throw new Error("Could not find any saved chat messages in 'json/chat_history.json'. The file might be empty, or in a new, unrecognized format. Note: Snapchat only exports messages you've manually saved.");
            
            allMessagesRaw.sort((a, b) => parseSnapchatTimestamp(a.Created) - parseSnapchatTimestamp(b.Created));

            const conversations = new Map<string, Chat>();
            const usedMediaPaths = new Set<string>();

            for (const rawMsg of allMessagesRaw) {
                const isSent = rawMsg.type === 'sent';
                const otherUser = isSent ? rawMsg.To : rawMsg.From;
                if (!conversations.has(otherUser)) {
                    conversations.set(otherUser, { id: otherUser, title: otherUser, participants: [{ name: determinedOwnerName }, { name: otherUser }], messages: [], lastActivity: 0 });
                }
                const chat = conversations.get(otherUser)!;
                const timestamp = parseSnapchatTimestamp(rawMsg.Created);
                const message: Message = {
                    id: `${timestamp}-${chat.messages.length}`,
                    sender_name: isSent ? determinedOwnerName : otherUser,
                    timestamp_ms: timestamp,
                    media_type: rawMsg['Media Type'],
                    content: rawMsg.Text || rawMsg.Content
                };

                const mediaPath = rawMsg.Media;
                if (mediaPath && allMediaMap.has(mediaPath)) {
                    const mediaItem = allMediaMap.get(mediaPath)!;
                    message.linkedMedia = mediaItem;
                    usedMediaPaths.add(mediaPath);
                }

                chat.messages.push(message);
                chat.lastActivity = timestamp;
            }

            setProcessingStep('Linking media to chats...');
            const datedMediaForHeuristic = Array.from(allMediaMap.values())
                .filter(m => m.date !== undefined)
                .sort((a, b) => a.date! - b.date!);
            
            const TIME_THRESHOLD_MS = 15000;

            for (const chat of conversations.values()) {
                for (const message of chat.messages) {
                    if (!message.linkedMedia && ['MEDIA', 'VIDEO', 'NOTE'].includes(message.media_type)) {
                        let bestMatch: SnapchatMedia | null = null;
                        let smallestDiff = Infinity;
                        
                        for (const mediaItem of datedMediaForHeuristic) {
                            if (usedMediaPaths.has(mediaItem.path)) continue;
                            const diff = Math.abs(mediaItem.date! - message.timestamp_ms);
                            if (diff < smallestDiff && diff < TIME_THRESHOLD_MS) {
                                smallestDiff = diff;
                                bestMatch = mediaItem;
                            }
                        }

                        if (bestMatch) {
                            message.linkedMedia = bestMatch;
                            usedMediaPaths.add(bestMatch.path);
                        }
                    }
                }
            }
            
            setChats(Array.from(conversations.values()).sort((a, b) => (b.lastActivity ?? 0) - (a.lastActivity ?? 0)));

            const stickerPromises: Promise<SnapchatMedia | null>[] = [];
            zip.folder('stickers')?.forEach((relativePath, file) => {
                 if (!file.dir && /\.(png|webp|gif)$/i.test(relativePath)) {
                    const promise = async (): Promise<SnapchatMedia | null> => {
                        try {
                            const blob = await file.async('blob');
                            return { type: 'sticker', path: `stickers/${relativePath}`, blobUrl: URL.createObjectURL(blob) };
                        } catch (e) { return null; }
                    };
                    stickerPromises.push(promise());
                 }
            });
            const allStickers = (await Promise.all(stickerPromises)).filter((s): s is SnapchatMedia => s !== null);
            setStickers(allStickers);

            setStatus('idle');
        
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
        if (fileInputRef.current) fileInputRef.current.value = '';
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

    if (chats.length > 0) {
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
            {status !== 'processing' && (
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