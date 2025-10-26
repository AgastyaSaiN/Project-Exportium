
import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import JSZip from 'jszip';
import { Platform } from '../../../constants';
import WhatsAppChatViewer from './WhatsAppChatViewer';
import { Chat } from './types';
import { parseWhatsAppChat } from './parser';

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

// --- Placeholder Data ---
const now = Date.now();
const PLACEHOLDER_CHAT: Chat = {
  id: 'placeholder-chat',
  title: 'Design Team',
  participants: [
    { name: 'Alice' },
    { name: 'Bob' },
    { name: 'You' },
  ],
  messages: [
    {
      id: 'msg-1',
      sender_name: 'Alice',
      timestamp_ms: now - 1000 * 60 * 60 * 2, // 2 hours ago
      content: 'Hey everyone, check out the new mockups.',
    },
    {
      id: 'msg-2',
      sender_name: 'Alice',
      timestamp_ms: now - 1000 * 60 * 59,
      content: 'mockups-v1.png (file attached)',
      photo: { uri: 'mockups-v1.png' },
    },
    {
      id: 'msg-3',
      sender_name: 'Bob',
      timestamp_ms: now - 1000 * 60 * 55,
      content: 'Looking great! I love the color palette. 🎨',
    },
    {
      id: 'msg-4',
      sender_name: 'You',
      timestamp_ms: now - 1000 * 60 * 50,
      content: 'Awesome work, Alice! Just one small feedback point: can we try making the main CTA button a bit larger?',
    },
    {
      id: 'msg-5',
      sender_name: 'Alice',
      timestamp_ms: now - 1000 * 60 * 48,
      content: 'Good point! How about this?',
    },
    {
      id: 'msg-6',
      sender_name: 'Alice',
      timestamp_ms: now - 1000 * 60 * 47,
      content: 'mockups-v2-cta.png (file attached)',
      photo: { uri: 'mockups-v2-cta.png' },
    },
     {
      id: 'msg-7',
      sender_name: 'You',
      timestamp_ms: now - 1000 * 60 * 45,
      content: 'Perfect! 👌',
    },
    {
        id: 'msg-8',
        sender_name: 'Bob',
        timestamp_ms: now - 1000 * 60 * 30,
        content: "I've also recorded a quick screen capture of the animation prototype.",
    },
    {
        id: 'msg-9',
        sender_name: 'Bob',
        timestamp_ms: now - 1000 * 60 * 29,
        content: 'animation-prototype.mp4 (file attached)',
        video: { uri: 'animation-prototype.mp4' },
    },
  ],
  lastActivity: now - 1000 * 60 * 29,
  fileMap: new Map(), // Empty map, as we don't have real files
};


// --- Component ---

interface WhatsAppPageProps {
    platform: Platform;
}

const WhatsAppPage: React.FC<WhatsAppPageProps> = ({ platform }) => {
    const { name, icon: Icon, color } = platform;
    const [status, setStatus] = useState<'idle' | 'processing' | 'selecting' | 'error' | 'loaded'>('loaded');
    const [processingStep, setProcessingStep] = useState('');
    const [errorMessage, setErrorMessage] = useState<string>('');
    const [chat, setChat] = useState<Chat | null>(PLACEHOLDER_CHAT);
    const [ownerName, setOwnerName] = useState<string>('You');
    const [theme, setTheme] = useState<'light' | 'dark'>('light');
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
        setChat(null);
        setOwnerName('');

        try {
            if (file.type === 'application/zip' || file.name.endsWith('.zip')) {
                setProcessingStep('Loading ZIP file...');
                const zip = await JSZip.loadAsync(file);
                
                const chatFile = zip.file('_chat.txt');
                if (!chatFile) {
                    throw new Error("'_chat.txt' not found in the ZIP archive. Please upload a valid WhatsApp export.");
                }

                setProcessingStep('Reading chat file...');
                const content = await chatFile.async('string');

                setProcessingStep('Parsing messages...');
                const parsedChatData = parseWhatsAppChat(content, file.name);
                
                const fileMap = new Map<string, any>();
                // FIX: Added type annotation to the 'file' parameter to resolve errors where
                // properties 'dir' and 'name' were not found on type 'unknown'.
                Object.values(zip.files).forEach((file: JSZip.JSZipObject) => {
                    if (!file.dir) {
                        fileMap.set(file.name, file);
                    }
                });

                const finalChat: Chat = {
                    ...parsedChatData,
                    fileMap,
                };

                setChat(finalChat);
                if (finalChat.participants.length > 1) {
                    setStatus('selecting');
                } else {
                    handleUserSelection(finalChat.participants[0]?.name || "You");
                }

            } else { // Assume .txt
                setProcessingStep('Reading chat file...');
                const content = await file.text();

                setProcessingStep('Parsing messages...');
                const parsedChatData = parseWhatsAppChat(content, file.name);

                setChat(parsedChatData); // No fileMap for plain text
                if (parsedChatData.participants.length > 1) {
                    setStatus('selecting');
                } else {
                    handleUserSelection(parsedChatData.participants[0]?.name || "You");
                }
            }
        
        } catch (error) {
            console.error("Failed to process chat file:", error);
            setStatus('error');
            setErrorMessage(error instanceof Error ? error.message : "An unknown error occurred during processing.");
        } finally {
             if(event.target) event.target.value = '';
        }
    };

    const handleUserSelection = (name: string) => {
        setOwnerName(name);
        setStatus('loaded');
    };

    const createBlobUrl = async (uri: string, fileMap: Chat['fileMap']): Promise<string | undefined> => {
        if (!fileMap) return undefined;
        const mediaFile = fileMap.get(uri);
        if (mediaFile) {
             const blob = await (mediaFile as any).async('blob');
             return URL.createObjectURL(blob);
        }
        return undefined;
    };

    const handleReset = () => {
        setStatus('idle');
        setErrorMessage('');
        setChat(null);
        setOwnerName('');
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const renderContent = () => {
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
                                className="inline-flex items-center justify-center w-full sm:w-auto px-8 py-4 bg-green-500 text-white font-bold rounded-lg shadow-lg hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-all duration-300 transform hover:scale-105"
                            >
                                Start Over
                            </button>
                        </div>
                    </div>
                );
            case 'selecting':
                 return (
                     <div className="text-center w-full max-w-lg mx-auto">
                         <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-200">Who are you in this chat?</h2>
                        <p className="mt-2 text-lg text-slate-500 dark:text-slate-400">
                            Select your name to correctly align message bubbles.
                        </p>
                        <div className="mt-8 space-y-3">
                            {chat?.participants.map(({name}) => (
                                <button
                                    key={name}
                                    onClick={() => handleUserSelection(name)}
                                    className="w-full text-left p-4 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg shadow-sm hover:bg-green-50 dark:hover:bg-green-900/20 hover:border-green-400 dark:hover:border-green-600 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-green-500"
                                >
                                    <span className="font-semibold text-slate-700 dark:text-slate-200">{name}</span>
                                </button>
                            ))}
                        </div>
                     </div>
                )
            case 'idle':
            default:
                return (
                    <div className="text-center w-full max-w-2xl">
                        <Icon className={`w-24 h-24 mx-auto mb-6 ${color}`} />
                        <h1 className="text-5xl font-bold text-slate-900 dark:text-slate-100">
                            {name} Chat Viewer
                        </h1>
                        <p className="mt-4 text-xl text-slate-500 dark:text-slate-400">
                            Upload your exported WhatsApp chat <span className="font-semibold text-slate-600 dark:text-slate-300">.txt</span> or <span className="font-semibold text-slate-600 dark:text-slate-300">.zip file</span> to get started.
                        </p>
                        <div className="mt-12">
                            <button 
                                onClick={handleSelectArchiveClick}
                                className="inline-flex items-center justify-center w-full sm:w-auto px-8 py-4 bg-green-500 text-white font-bold rounded-lg shadow-lg hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-all duration-300 transform hover:scale-105"
                            >
                                <UploadIcon className="w-6 h-6 mr-3" />
                                Select Chat File
                            </button>
                        </div>
                    </div>
                );
        }
    };

    if (status === 'loaded' && chat) {
        return (
             <WhatsAppChatViewer 
                chat={chat} 
                ownerName={ownerName} 
                onReset={handleReset}
                platform={platform}
                theme={theme}
                onThemeToggle={handleThemeToggle}
                createBlobUrl={(uri) => createBlobUrl(uri, chat.fileMap)}
            />
        )
    }

    return (
        <div className="flex flex-col min-h-screen bg-slate-50 dark:bg-slate-900 p-4">
             <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
                accept=".txt,text/plain,.zip,application/zip"
            />
            <div className="flex-grow flex items-center justify-center">
                {renderContent()}
            </div>
            {status !== 'processing' && status !== 'selecting' && (
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

export default WhatsAppPage;
