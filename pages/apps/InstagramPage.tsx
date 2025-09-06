import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Link } from 'react-router-dom';
import JSZip from 'jszip';
import { Platform } from '../../constants';
import InstagramChatViewer from './instagram/InstagramChatViewer';
import { Chat, Message, Photo, Video } from './instagram/types';


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

interface InstagramPageProps {
    platform: Platform;
}

const fixEncoding = (text: string): string => {
    if (typeof text !== 'string') return text;
    try {
        return decodeURIComponent(escape(text));
    } catch (e) {
        return text;
    }
};

const InstagramPage: React.FC<InstagramPageProps> = ({ platform }) => {
    const { name, icon: Icon, color } = platform;
    const [status, setStatus] = useState<'idle' | 'processing' | 'error'>('idle');
    const [processingStep, setProcessingStep] = useState('');
    const [errorMessage, setErrorMessage] = useState<string>('');
    const [chats, setChats] = useState<Chat[]>([]);
    const [ownerName, setOwnerName] = useState<string>('');
    const [theme, setTheme] = useState<'light' | 'dark'>('light');
    const zipRef = useRef<JSZip | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const root = window.document.documentElement;
        root.classList.remove(theme === 'light' ? 'dark' : 'light');
        root.classList.add(theme);
    }, [theme]);

    const handleThemeToggle = () => {
        setTheme(prevTheme => prevTheme === 'light' ? 'dark' : 'light');
    };

    const handleSelectArchiveClick = () => {
        fileInputRef.current?.click();
    };
    
    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setStatus('processing');
        setErrorMessage('');
        setChats([]);
        setOwnerName('');
        zipRef.current = null;

        try {
            setProcessingStep('Loading ZIP file...');
            const zip = await JSZip.loadAsync(file);
            zipRef.current = zip;

            // --- Determine Owner Username ---
            setProcessingStep('Identifying user...');
            let determinedOwnerName: string | null = null;
            
            const filenameRegex = /^instagram-(.+?)-\d{4}-\d{2}-\d{2}-/;
            const match = file.name.match(filenameRegex);
            if (match && match[1]) {
                determinedOwnerName = fixEncoding(match[1]);
            }

            if (!determinedOwnerName) {
                const findUsernameRecursive = (obj: any): string | null => {
                    if (!obj || typeof obj !== 'object') return null;
                    for (const key in obj) {
                        if (Object.prototype.hasOwnProperty.call(obj, key)) {
                            const value = obj[key];
                            if (key.toLowerCase() === 'username' && typeof value === 'string') return value;
                            const result = findUsernameRecursive(value);
                            if (result) return result;
                        }
                    }
                    return null;
                };

                const userInfoFiles = ['account_information/personal_information.json', 'personal_information/personal_information.json'];
                for (const path of userInfoFiles) {
                    const file = zip.file(path);
                    if (file) {
                        try {
                            const content = await file.async('string');
                            const data = JSON.parse(content);
                            const username = data?.profile_user?.username || findUsernameRecursive(data.profile) || findUsernameRecursive(data);
                            if (username) {
                                determinedOwnerName = fixEncoding(username);
                                break;
                            }
                        } catch (e) {
                             console.warn(`Could not parse user info file: ${path}`, e);
                        }
                    }
                }
            }

            if (!determinedOwnerName) {
                throw new Error("Could not determine your username. Please make sure you've uploaded a complete Instagram data export ZIP file.");
            }
            setOwnerName(determinedOwnerName);

            // --- Scan for conversations (fast) ---
            setProcessingStep('Scanning conversations...');
            const chatFiles = zip.file(/messages\/inbox\/.*\/message_1\.json/);
            const chatPromises = chatFiles.map(async (chatFile): Promise<Chat | null> => {
                try {
                    const content = await chatFile.async('string');
                    const chatData = JSON.parse(content);
                     return {
                        id: chatFile.name,
                        path: chatFile.name,
                        title: fixEncoding(chatData.title),
                        participants: chatData.participants.map((p: any) => ({ name: fixEncoding(p.name) })),
                        messages: [], // Initially empty
                        lastActivity: chatData.messages[chatData.messages.length - 1]?.timestamp_ms || 0
                    };
                } catch {
                    return null; // Ignore corrupted chat JSON
                }
            });

            const scannedChats = (await Promise.all(chatPromises))
                .filter((c): c is Chat => c !== null && c.lastActivity > 0)
                .sort((a, b) => (b.lastActivity ?? 0) - (a.lastActivity ?? 0));
            
            if (scannedChats.length === 0) {
                throw new Error("No chat data found. Please check if the archive is a valid Instagram data export and contains a 'messages' folder.");
            }
            
            setChats(scannedChats);
            setStatus('idle');
        
        } catch (error) {
            console.error("Failed to process archive:", error);
            setStatus('error');
            setErrorMessage(error instanceof Error ? error.message : "An unknown error occurred during processing.");
        } finally {
             if(event.target) event.target.value = '';
        }
    };
    
    const loadChatMessages = useCallback(async (chatPath: string): Promise<Message[]> => {
        if (!zipRef.current) return [];
        
        const chatFile = zipRef.current.file(chatPath);
        if (!chatFile) return [];

        try {
            const content = await chatFile.async('string');
            const chatData = JSON.parse(content);
            if (!chatData.messages) return [];
            
            const createBlobUrl = async (uri: string) => {
                if(!zipRef.current) return undefined;
                const mediaFile = zipRef.current.file(uri);
                if (mediaFile) {
                    const blob = await mediaFile.async('blob');
                    return URL.createObjectURL(blob);
                }
                return undefined;
            };

            const messagePromises = chatData.messages.map(async (msg: any, index: number): Promise<Message> => {
                const processedMsg: Message = {
                    id: `${msg.timestamp_ms}-${index}`,
                    ...msg,
                    content: msg.content ? fixEncoding(msg.content) : undefined,
                    sender_name: fixEncoding(msg.sender_name),
                };

                 if (msg.photos && msg.photos.length > 0) {
                    processedMsg.photos = await Promise.all(
                        msg.photos.map(async (photo: Photo) => ({ ...photo, blobUrl: await createBlobUrl(photo.uri) }))
                    );
                }
                if (msg.videos && msg.videos.length > 0) {
                    processedMsg.videos = await Promise.all(
                        msg.videos.map(async (video: Video) => ({ ...video, blobUrl: await createBlobUrl(video.uri) }))
                    );
                }
                return processedMsg;
            });

            return (await Promise.all(messagePromises)).sort((a, b) => a.timestamp_ms - b.timestamp_ms);

        } catch (error) {
            console.error(`Failed to load messages for ${chatPath}:`, error);
            throw new Error("Could not load conversation. The file might be corrupt.");
        }
    }, []);

    const handleReset = () => {
        setStatus('idle');
        setErrorMessage('');
        setChats([]);
        setOwnerName('');
        zipRef.current = null;
    };

    const renderUploadView = () => {
        switch (status) {
            case 'processing':
                return (
                    <div className="text-center">
                        <SpinnerIcon className="w-20 h-20 mx-auto text-slate-400 animate-spin mb-6" />
                        <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-200">Processing Archive...</h2>
                        <p className="mt-2 text-lg text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                           {processingStep}
                        </p>
                    </div>
                );
            case 'error':
                 return (
                    <div className="text-center">
                        <ExclamationTriangleIcon className="w-24 h-24 mx-auto text-red-500 mb-4" />
                        <h2 className="text-4xl font-bold text-slate-900 dark:text-slate-100">Processing Failed</h2>
                        <p className="mt-3 text-md text-red-600 bg-red-100 dark:bg-red-900/30 dark:text-red-300 p-3 rounded-md">
                            {errorMessage}
                        </p>
                         <div className="mt-10">
                            <button
                                onClick={handleSelectArchiveClick}
                                className="inline-flex items-center justify-center w-full sm:w-auto px-8 py-4 bg-pink-500 text-white font-bold rounded-lg shadow-lg hover:bg-pink-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500 transition-all duration-300 transform hover:scale-105"
                            >
                                Try Another File
                            </button>
                        </div>
                    </div>
                );
            case 'idle':
            default:
                return (
                    <div className="text-center w-full">
                         <Icon className={`w-24 h-24 mx-auto mb-6 ${color}`} />
                        <h1 className="text-5xl font-bold text-slate-900 dark:text-slate-100">
                            {name} Archive
                        </h1>
                        <p className="mt-4 text-xl text-slate-500 dark:text-slate-400">
                            To get started, select your Instagram data archive file.
                        </p>
                        <div className="mt-12 flex flex-col items-center">
                            <button
                                onClick={handleSelectArchiveClick}
                                className="inline-flex items-center justify-center w-full sm:w-auto px-8 py-4 bg-pink-500 text-white font-bold rounded-lg shadow-lg hover:bg-pink-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500 transition-all duration-300 transform hover:scale-105"
                            >
                                <UploadIcon className="w-6 h-6 mr-3" />
                                Select Archive (.zip)
                            </button>
                        </div>
                    </div>
                );
        }
    };

    if (chats.length > 0) {
        return (
             <div className="w-screen h-screen bg-slate-100 dark:bg-slate-900 flex flex-col">
                <header className="flex-shrink-0 bg-white dark:bg-slate-800 p-3 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center shadow-sm z-20">
                    <div className="flex items-center">
                        <Icon className={`w-8 h-8 ${color}`} />
                        <h1 className="text-xl font-bold ml-3 text-slate-800 dark:text-slate-200">Instagram Chat Viewer</h1>
                    </div>
                    <button
                        onClick={handleReset}
                        className="px-4 py-2 bg-pink-500 text-white text-sm font-semibold rounded-lg hover:bg-pink-600 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500"
                    >
                        Process Another Archive
                    </button>
                </header>
                <main className="flex-grow overflow-hidden">
                     <InstagramChatViewer 
                        chats={chats} 
                        ownerName={ownerName} 
                        onLoadMessages={loadChatMessages} 
                        theme={theme}
                        onThemeToggle={handleThemeToggle}
                    />
                </main>
            </div>
        )
    }

    return (
        <div className="flex flex-col min-h-screen bg-slate-50 dark:bg-slate-900 p-4">
             <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
                accept=".zip"
            />
            <div className="flex-grow flex items-center justify-center">
                <div className="w-full max-w-lg">
                    {renderUploadView()}
                </div>
            </div>
            {status !== 'processing' && (
                 <div className="flex-shrink-0 py-6 text-center">
                    <Link
                        to="/"
                        className="inline-flex items-center px-4 py-2 text-slate-600 dark:text-slate-400 font-semibold rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-400 transition-all duration-300"
                    >
                        <ArrowLeftIcon className="w-5 h-5 mr-2" />
                        Back to Home
                    </Link>
                </div>
            )}
        </div>
    );
};

export default InstagramPage;