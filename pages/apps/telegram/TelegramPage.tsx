
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Platform } from '../../../constants';
import TelegramChatViewer from './TelegramChatViewer';
import { Chat, Message } from './types';

// --- Icon Components ---

const ArrowLeftIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
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

interface TelegramPageProps {
    platform: Platform;
}

const TelegramPage: React.FC<TelegramPageProps> = ({ platform }) => {
    const { name, icon: Icon, color } = platform;
    const [status, setStatus] = useState<'idle' | 'processing' | 'error'>('idle');
    const [processingStep, setProcessingStep] = useState('');
    const [errorMessage, setErrorMessage] = useState<string>('');
    const [chats, setChats] = useState<Chat[]>([]);
    const [ownerId, setOwnerId] = useState<string>('');
    const [fileMap, setFileMap] = useState<Map<string, File> | null>(null);
    const [theme, setTheme] = useState<'light' | 'dark'>('light');
    const folderInputRef = useRef<HTMLInputElement>(null);

     useEffect(() => {
        const root = window.document.documentElement;
        root.classList.remove(theme === 'light' ? 'dark' : 'light');
        root.classList.add(theme);
    }, [theme]);

    const handleThemeToggle = () => {
        setTheme(prevTheme => prevTheme === 'light' ? 'dark' : 'light');
    };

    const handleSelectFolderClick = () => {
        folderInputRef.current?.click();
    };
    
    const handleFolderChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (!files || files.length === 0) return;

        setStatus('processing');
        setProcessingStep('Reading folder contents...');
        setErrorMessage('');

        try {
            const fileList = Array.from(files);
            
            // IMPROVED: Find result.json anywhere in the file list
            const resultFile = fileList.find(f => f.name === 'result.json' || f.name === 'export_result.json');
            
            if (!resultFile) {
                throw new Error("This doesn't look like a valid Telegram export. Could not find 'result.json'.");
            }

            // Determine the root path based on where result.json was found
            const resultPath = (resultFile as any).webkitRelativePath || resultFile.name;
            const rootPath = resultPath.includes('/') ? resultPath.substring(0, resultPath.lastIndexOf('/') + 1) : '';

            const localFileMap = new Map<string, File>();
            fileList.forEach((file: any) => {
                const relativePath = (file.webkitRelativePath || file.name);
                // Only include files that are within the same root structure as result.json
                if (relativePath.startsWith(rootPath)) {
                    localFileMap.set(relativePath.substring(rootPath.length), file);
                }
            });
            
            setFileMap(localFileMap);
            
            setProcessingStep('Parsing chat data...');
            const content = await resultFile.text();
            const data = JSON.parse(content);
            
            if (!data.chats || !data.chats.list) {
                throw new Error("The 'result.json' file seems to be malformed. Chat list not found.");
            }

            // IMPROVED: Robust ID detection
            let detectedId = data.id;
            if (!detectedId && data.personal_information) {
                detectedId = data.personal_information.user_id || data.personal_information.id;
            }
            
            // Normalize to "user123" format used in messages
            if (detectedId) {
                const idStr = String(detectedId);
                // Ensure it matches the 'from_id' format in messages (usually "user12345")
                setOwnerId(idStr.startsWith('user') ? idStr : `user${idStr}`);
            } else {
                // Allow empty owner ID - user can set it in settings later
                setOwnerId('');
            }
            
            const processedChats: Chat[] = data.chats.list
                .filter((chat: any) => chat.messages && chat.messages.length > 0)
                .map((chat: any): Chat => {
                    const lastMessage = chat.messages[chat.messages.length - 1];
                    return {
                        id: chat.id,
                        name: chat.name || "Deleted Account",
                        type: chat.type,
                        messages: chat.messages.filter((m: Message) => m.type === 'message'),
                        lastActivity: lastMessage ? new Date(lastMessage.date).getTime() : 0,
                    };
                })
                .sort((a: Chat, b: Chat) => b.lastActivity - a.lastActivity);

            if (processedChats.length === 0) {
                throw new Error("No conversations with messages were found in your Telegram export.");
            }

            setChats(processedChats);
            setStatus('idle');

        } catch (error) {
             console.error("Failed to process folder:", error);
            setStatus('error');
            setErrorMessage(error instanceof Error ? error.message : "An unknown error occurred during processing.");
        } finally {
            if (event.target) event.target.value = '';
        }
    };
    
    const createBlobUrl = useCallback(async (uri: string): Promise<string | undefined> => {
        if (!fileMap) return undefined;
        const mediaFile = fileMap.get(uri);
        if (mediaFile) {
            return URL.createObjectURL(mediaFile);
        }
        // Fallback for absolute paths sometimes present in older exports
        if (uri.startsWith('Files/')) {
             // Try matching just the filename if strict path fails
             const filename = uri.split('/').pop();
             for(const [key, file] of fileMap.entries()) {
                 if (key.endsWith(filename!)) {
                     return URL.createObjectURL(file);
                 }
             }
        }
        return undefined;
    }, [fileMap]);

    const handleReset = () => {
        setStatus('idle');
        setErrorMessage('');
        setChats([]);
        setOwnerId('');
        setFileMap(null);
        if (folderInputRef.current) folderInputRef.current.value = '';
    };

    const renderUploadView = () => {
        switch (status) {
            case 'processing':
                return (
                    <div className="text-center">
                        <SpinnerIcon className="w-20 h-20 mx-auto text-sky-500 animate-spin mb-6" />
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
                                className="inline-flex items-center justify-center w-full sm:w-auto px-8 py-4 bg-sky-500 text-white font-bold rounded-lg shadow-lg hover:bg-sky-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 transition-all duration-300 transform hover:scale-105"
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
                        <h1 className="text-5xl font-bold text-slate-900 dark:text-slate-100">
                            {name} Archive Viewer
                        </h1>
                        <p className="mt-4 text-xl text-slate-500 dark:text-slate-400">
                            Select your <span className="font-semibold text-slate-600 dark:text-slate-300">unzipped Telegram data export folder</span> to begin.
                        </p>
                        <div className="mt-12">
                            <button 
                                onClick={handleSelectFolderClick}
                                className="inline-flex items-center justify-center w-full sm:w-auto px-8 py-4 bg-sky-500 text-white font-bold rounded-lg shadow-lg hover:bg-sky-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 transition-all duration-300 transform hover:scale-105"
                            >
                                <FolderIcon className="w-6 h-6 mr-3" />
                                Select Export Folder
                            </button>
                        </div>
                    </div>
                );
        }
    };

    if (chats.length > 0) {
        return (
             <div className="w-screen h-screen bg-slate-100 dark:bg-slate-900 flex flex-col">
                <TelegramChatViewer 
                    chats={chats} 
                    ownerId={ownerId}
                    createBlobUrl={createBlobUrl}
                    theme={theme}
                    onThemeToggle={handleThemeToggle}
                    onReset={handleReset}
                />
            </div>
        )
    }

    return (
        <div className="flex flex-col min-h-screen bg-slate-50 dark:bg-slate-900 p-4">
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

export default TelegramPage;
