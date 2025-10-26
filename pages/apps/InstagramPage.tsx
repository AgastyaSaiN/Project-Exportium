
import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Link } from 'react-router-dom';
import JSZip from 'jszip';
import { Platform } from '../../constants';
import InstagramChatViewer from './instagram/InstagramChatViewer';
import { Chat, Message } from './instagram/types';


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

const FolderIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
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

interface PendingChatData {
    title: string;
    lastActivity: number;
    id: string;
    path: string;
    participants: { name: string }[];
    rawMessages: any[];
    fileMap: Map<string, File>;
}


const fixEncoding = (text: string): string => {
    if (typeof text !== 'string') return text;
    try {
        // Attempt to decode URI component, falling back to original text if it fails
        // This handles cases like "Répondu à" which becomes "RÃ©pondu Ã "
        return decodeURIComponent(escape(text));
    } catch (e) {
        // This might happen if the string is already correctly encoded
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
    const folderInputRef = useRef<HTMLInputElement>(null);

    const [participantsForSelection, setParticipantsForSelection] = useState<string[] | null>(null);
    const [pendingChatData, setPendingChatData] = useState<PendingChatData | null>(null);
    const [singleFolderFileMap, setSingleFolderFileMap] = useState<Map<string, File> | null>(null);

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

    const handleSelectFolderClick = () => {
        folderInputRef.current?.click();
    };
    
    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setStatus('processing');
        setErrorMessage('');
        setChats([]);
        setOwnerName('');
        zipRef.current = null;
        setSingleFolderFileMap(null);

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
            const chatFolders = new Set<string>();
            
            const chatManifestFiles = zip.file(/message_1\.json$/);

            chatManifestFiles.forEach(file => {
                if (file.name.includes('messages/')) {
                    const pathParts = file.name.split('/');
                    pathParts.pop();
                    const folderPath = pathParts.join('/');
                    if (folderPath) {
                        chatFolders.add(folderPath);
                    }
                }
            });

            const chatPromises = Array.from(chatFolders).map(async (folderPath): Promise<Chat | null> => {
                try {
                    const firstMessageFile = zip.file(`${folderPath}/message_1.json`);
                    if (!firstMessageFile) return null;

                    const content = await firstMessageFile.async('string');
                    const chatData = JSON.parse(content);

                    const messageFiles = zip.file(new RegExp(`^${folderPath}/message_\\d+\\.json$`));
                    let lastTimestamp = 0;
                    if(chatData.messages && chatData.messages.length > 0) {
                        lastTimestamp = chatData.messages.reduce((latest: number, msg: any) => Math.max(latest, msg.timestamp_ms), 0);
                    }


                     return {
                        id: folderPath,
                        path: folderPath,
                        title: fixEncoding(chatData.title),
                        participants: chatData.participants.map((p: any) => ({ name: fixEncoding(p.name) })),
                        messages: [],
                        lastActivity: lastTimestamp,
                    };
                } catch {
                    return null;
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

    const handleFolderChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (!files || files.length === 0) return;

        setStatus('processing');
        setProcessingStep('Reading folder contents...');
        setErrorMessage('');
        setSingleFolderFileMap(null);
        try {
            const fileList = Array.from(files);
            const firstPath = (fileList[0] as any).webkitRelativePath;
            if (!firstPath) {
                throw new Error("Your browser does not support folder uploads. Please try Chrome, Edge, or Firefox.");
            }
            const basePath = firstPath.substring(0, firstPath.indexOf('/') + 1);

            const fileMap = new Map<string, File>();
            fileList.forEach((file: any) => {
                const relativePath = file.webkitRelativePath.replace(basePath, '');
                if (relativePath) fileMap.set(relativePath, file);
            });
            
            const message1File = fileMap.get('message_1.json');
            if (!message1File) {
                throw new Error("This doesn't look like a valid Instagram chat folder. Could not find 'message_1.json'.");
            }

            const content = await message1File.text();
            const chatData = JSON.parse(content);
            const participants = chatData.participants.map((p: {name: string}) => fixEncoding(p.name));
            
            const messageFileNames = Array.from(fileMap.keys()).filter(k => k.match(/^message_\d+\.json$/));
            let allMessagesRaw: any[] = [];
            for (const fileName of messageFileNames) {
                const file = fileMap.get(fileName);
                if(file){
                    const fileContent = await file.text();
                    const data = JSON.parse(fileContent);
                    if (data.messages) allMessagesRaw.push(...data.messages);
                }
            }
            if(allMessagesRaw.length === 0) {
                 throw new Error("No messages found in the provided folder.");
            }

            setPendingChatData({
                title: fixEncoding(chatData.title),
                lastActivity: allMessagesRaw.reduce((latest, msg) => Math.max(latest, msg.timestamp_ms), 0),
                id: basePath,
                path: basePath,
                participants: chatData.participants.map((p: any) => ({ name: fixEncoding(p.name) })),
                rawMessages: allMessagesRaw,
                fileMap: fileMap,
            });
            setParticipantsForSelection(participants);
            setStatus('idle');

        } catch (error) {
             console.error("Failed to process folder:", error);
            setStatus('error');
            setErrorMessage(error instanceof Error ? error.message : "An unknown error occurred during processing.");
        } finally {
            if (event.target) event.target.value = '';
        }
    };
    
    const handleUserSelection = async (name: string) => {
        if (!pendingChatData) return;
        setStatus('processing');
        setProcessingStep('Finalizing chat setup...');
        setOwnerName(name);

        try {
            const { rawMessages, fileMap, ...chatInfo } = pendingChatData;
            
            setSingleFolderFileMap(fileMap);

            const processedMessages: Message[] = rawMessages
                .map((msg: any, index: number): Message => ({
                    id: `${msg.timestamp_ms}-${index}`,
                    sender_name: fixEncoding(msg.sender_name),
                    timestamp_ms: msg.timestamp_ms,
                    content: msg.content ? fixEncoding(msg.content) : undefined,
                    photos: msg.photos,
                    videos: msg.videos,
                }))
                .sort((a, b) => a.timestamp_ms - b.timestamp_ms);
            
            const finalChat: Chat = {
                ...chatInfo,
                messages: processedMessages,
            };

            setChats([finalChat]);
            setPendingChatData(null);
            setParticipantsForSelection(null);
            setStatus('idle');
        } catch (error) {
            console.error("Failed to finalize chat:", error);
            setStatus('error');
            setErrorMessage(error instanceof Error ? error.message : "An unknown error occurred during finalization.");
            setPendingChatData(null);
            setParticipantsForSelection(null);
        }
    };


    const loadChatMessages = useCallback(async (chatPath: string): Promise<Message[]> => {
        if (!zipRef.current) return [];
        
        const messageFiles = zipRef.current.file(new RegExp(`^${chatPath}/message_\\d+\\.json$`));
        if (!messageFiles || messageFiles.length === 0) return [];

        try {
            let allMessagesRaw: any[] = [];
            
            for (const file of messageFiles) {
                const content = await file.async('string');
                const chatData = JSON.parse(content);
                if (chatData.messages) {
                    allMessagesRaw.push(...chatData.messages);
                }
            }
            
            const processedMessages: Message[] = allMessagesRaw.map((msg: any, index: number) => ({
                id: `${msg.timestamp_ms}-${index}`,
                sender_name: fixEncoding(msg.sender_name),
                timestamp_ms: msg.timestamp_ms,
                content: msg.content ? fixEncoding(msg.content) : undefined,
                photos: msg.photos,
                videos: msg.videos,
            }));
            
            return processedMessages.sort((a, b) => a.timestamp_ms - b.timestamp_ms);

        } catch (error) {
            console.error(`Failed to load messages for ${chatPath}:`, error);
            throw new Error("Could not load conversation. The file might be corrupt.");
        }
    }, []);

    const createBlobUrl = useCallback(async (uri: string): Promise<string | undefined> => {
        if (zipRef.current) {
            const mediaFile = zipRef.current.file(uri);
            if (mediaFile) {
                const blob = await mediaFile.async('blob');
                return URL.createObjectURL(blob);
            }
        } else if (singleFolderFileMap) {
            let mediaFile = singleFolderFileMap.get(uri);
            if (mediaFile) {
                return URL.createObjectURL(mediaFile);
            }
            for (const key of singleFolderFileMap.keys()) {
                if (uri.endsWith(key)) {
                    mediaFile = singleFolderFileMap.get(key);
                    if (mediaFile) {
                        return URL.createObjectURL(mediaFile);
                    }
                }
            }
        }
        console.warn(`Could not find media for URI: ${uri}`);
        return undefined;
    }, [singleFolderFileMap]);

    const handleReset = () => {
        setStatus('idle');
        setErrorMessage('');
        setChats([]);
        setOwnerName('');
        zipRef.current = null;
        setSingleFolderFileMap(null);
        setParticipantsForSelection(null);
        setPendingChatData(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
        if (folderInputRef.current) folderInputRef.current.value = '';
    };

    const renderUserSelection = () => {
        if (!participantsForSelection) return null;
        return (
             <div className="text-center w-full max-w-lg mx-auto">
                 <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-200">Who are you in this chat?</h2>
                <p className="mt-2 text-lg text-slate-500 dark:text-slate-400">
                    Select your username to correctly align messages.
                </p>
                <div className="mt-8 space-y-3">
                    {participantsForSelection.map(name => (
                        <button
                            key={name}
                            onClick={() => handleUserSelection(name)}
                            className="w-full text-left p-4 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg shadow-sm hover:bg-pink-50 dark:hover:bg-pink-900/20 hover:border-pink-400 dark:hover:border-pink-600 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-pink-500"
                        >
                            <span className="font-semibold text-slate-700 dark:text-slate-200">{name}</span>
                        </button>
                    ))}
                </div>
             </div>
        )
    }

    const renderUploadView = () => {
        if (participantsForSelection) {
            return renderUserSelection();
        }
        switch (status) {
            case 'processing':
                return (
                    <div className="text-center">
                        <SpinnerIcon className="w-20 h-20 mx-auto text-slate-400 animate-spin mb-6" />
                        <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-200">Processing...</h2>
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
                        <p className="mt-3 text-md text-red-600 bg-red-100 dark:bg-red-900/30 dark:text-red-300 p-3 rounded-md max-w-xl mx-auto">
                            {errorMessage}
                        </p>
                         <div className="mt-10">
                            <button
                                onClick={handleReset}
                                className="inline-flex items-center justify-center w-full sm:w-auto px-8 py-4 bg-pink-500 text-white font-bold rounded-lg shadow-lg hover:bg-pink-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500 transition-all duration-300 transform hover:scale-105"
                            >
                                Start Over
                            </button>
                        </div>
                    </div>
                );
            case 'idle':
            default:
                return (
                    <div className="text-center w-full max-w-3xl">
                        <Icon className={`w-24 h-24 mx-auto mb-6 ${color}`} />
                        <h1 className="text-5xl font-bold text-slate-900 dark:text-slate-100">
                            {name} Archive Viewer
                        </h1>
                        <p className="mt-4 text-xl text-slate-500 dark:text-slate-400">
                            Choose how you'd like to import your chat data.
                        </p>
                        <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
                            <div 
                                onClick={handleSelectArchiveClick}
                                className="group p-6 bg-white dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 shadow-lg hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 cursor-pointer"
                            >
                                <div className="flex items-center">
                                    <div className="p-3 bg-pink-100 dark:bg-pink-900/30 rounded-lg">
                                        <UploadIcon className="w-6 h-6 text-pink-500 dark:text-pink-400" />
                                    </div>
                                    <h3 className="ml-4 text-xl font-bold text-slate-800 dark:text-slate-200">Full Archive</h3>
                                </div>
                                <p className="mt-3 text-slate-500 dark:text-slate-400">
                                    Upload the complete <span className="font-semibold">.zip file</span> you downloaded from Instagram. Best for browsing all your chats.
                                </p>
                            </div>
                            <div 
                                onClick={handleSelectFolderClick}
                                className="group p-6 bg-white dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 shadow-lg hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 cursor-pointer"
                            >
                               <div className="flex items-center">
                                    <div className="p-3 bg-sky-100 dark:bg-sky-900/30 rounded-lg">
                                        <FolderIcon className="w-6 h-6 text-sky-500 dark:text-sky-400" />
                                    </div>
                                    <h3 className="ml-4 text-xl font-bold text-slate-800 dark:text-slate-200">Chat Folder</h3>
                                </div>
                                <p className="mt-3 text-slate-500 dark:text-slate-400">
                                    Select a single, <span className="font-semibold">unzipped chat folder</span> from your archive. A much faster way to view a specific conversation.
                                </p>
                            </div>
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
                        Process Another
                    </button>
                </header>
                <main className="flex-grow overflow-hidden">
                     <InstagramChatViewer 
                        chats={chats} 
                        ownerName={ownerName} 
                        onLoadMessages={loadChatMessages} 
                        createBlobUrl={createBlobUrl}
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
            <input
                type="file"
                ref={folderInputRef}
                onChange={handleFolderChange}
                className="hidden"
                // @ts-ignore
                webkitdirectory=""
                directory=""
                multiple
            />
            <div className="flex-grow flex items-center justify-center">
                {renderUploadView()}
            </div>
            {status !== 'processing' && !participantsForSelection && (
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