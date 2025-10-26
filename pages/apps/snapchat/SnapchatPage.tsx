import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import JSZip from 'jszip';
import { Platform } from '../../../constants';
import SnapchatChatViewer from './SnapchatChatViewer';
import { Chat, Message } from './types';

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

const SnapchatPage: React.FC<SnapchatPageProps> = ({ platform }) => {
    const { name, icon: Icon, color } = platform;
    const [status, setStatus] = useState<'idle' | 'processing' | 'error'>('idle');
    const [processingStep, setProcessingStep] = useState('');
    const [errorMessage, setErrorMessage] = useState<string>('');
    const [chats, setChats] = useState<Chat[]>([]);
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
        setOwnerName('');

        try {
            setProcessingStep('Loading ZIP file...');
            const zip = await JSZip.loadAsync(file);

            setProcessingStep('Identifying user...');
            let determinedOwnerName: string | null = null;

            // Try 'user_profile.json' first (older format)
            const userProfileFile = zip.file('json/user_profile.json');
            if (userProfileFile) {
                try {
                    const content = await userProfileFile.async('string');
                    const data = JSON.parse(content);
                    if (data.username) {
                        determinedOwnerName = data.username;
                    }
                } catch(e) { console.warn("Could not parse json/user_profile.json", e); }
            }

            // If not found, try 'account.json' (newer format)
            if (!determinedOwnerName) {
                const accountFile = zip.file('json/account.json');
                if (accountFile) {
                     try {
                        const content = await accountFile.async('string');
                        const data = JSON.parse(content);
                        // Snapchat's new export format can have a list of accounts
                        const mainAccount = Array.isArray(data) ? data[0] : data;
                        if (mainAccount && mainAccount.Username) {
                             determinedOwnerName = mainAccount.Username;
                        }
                    } catch(e) { console.warn("Could not parse json/account.json", e); }
                }
            }
            
            // As another fallback, check login history
            if (!determinedOwnerName) {
                const loginHistoryFile = zip.file('json/login_history.json');
                if (loginHistoryFile) {
                    try {
                        const content = await loginHistoryFile.async('string');
                        const data = JSON.parse(content);
                        // Find the first valid username from any login event
                        if (data['Login History'] && Array.isArray(data['Login History'])) {
                            const loginWithUsername = data['Login History'].find((event: any) => event.Username);
                            if (loginWithUsername) {
                                determinedOwnerName = loginWithUsername.Username;
                            }
                        }
                    } catch (e) { console.warn("Could not parse json/login_history.json", e); }
                }
            }

            if (!determinedOwnerName) {
                // Fallback to a default name instead of throwing an error.
                // The user can correct the alignment in the chat viewer settings.
                determinedOwnerName = "You";
            }
            setOwnerName(determinedOwnerName);


            setProcessingStep('Parsing chat history...');
            const chatHistoryFile = zip.file('json/chat_history.json');
            if (!chatHistoryFile) {
                throw new Error("Could not find 'json/chat_history.json'. This file is required to view conversations.");
            }
            const chatHistoryContent = await chatHistoryFile.async('string');
            const chatHistoryData = JSON.parse(chatHistoryContent);

            let allMessagesRaw: any[] = [];
            
            // Try known keys first
            const receivedKeys = ['Received Saved-in-Chat History', 'Received Chat History'];
            const sentKeys = ['Sent Saved-in-Chat History', 'Sent Chat History'];
            
            receivedKeys.forEach(key => {
                if (Array.isArray(chatHistoryData[key])) {
                    allMessagesRaw.push(...chatHistoryData[key].map((m: any) => ({ ...m, type: 'received' })));
                }
            });

            sentKeys.forEach(key => {
                if (Array.isArray(chatHistoryData[key])) {
                     allMessagesRaw.push(...chatHistoryData[key].map((m: any) => ({ ...m, type: 'sent' })));
                }
            });

            // If no messages found, dynamically search the JSON structure
            if (allMessagesRaw.length === 0) {
                 for (const key in chatHistoryData) {
                    if (Object.prototype.hasOwnProperty.call(chatHistoryData, key) && Array.isArray(chatHistoryData[key])) {
                        const potentialMessages = chatHistoryData[key];
                        // Check if the array contains message-like objects
                        if (potentialMessages.length > 0 && potentialMessages[0].Created && (potentialMessages[0].From || potentialMessages[0].To)) {
                            potentialMessages.forEach((msg: any) => {
                                // Heuristic: Sent messages have a 'To' field. Received have a 'From' field.
                                if (msg.To) {
                                    allMessagesRaw.push({ ...msg, type: 'sent' });
                                } else if (msg.From) {
                                     allMessagesRaw.push({ ...msg, type: 'received' });
                                }
                            });
                        }
                    }
                }
            }

            if (allMessagesRaw.length === 0) {
                throw new Error("Could not find any saved chat messages in 'chat_history.json'. The file might be empty, or in a new, unrecognized format. Note: Snapchat only exports messages you've manually saved.");
            }
            
            setProcessingStep('Organizing conversations...');
            const parseSnapchatTimestamp = (ts: string): number => new Date(ts.replace(' UTC', 'Z')).getTime();

            allMessagesRaw.sort((a, b) => parseSnapchatTimestamp(a.Created) - parseSnapchatTimestamp(b.Created));

            const conversations = new Map<string, Chat>();

            for (const rawMsg of allMessagesRaw) {
                const isSent = rawMsg.type === 'sent';
                const otherUser = isSent ? rawMsg.To : rawMsg.From;
                
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

                const message: Message = {
                    id: `${timestamp}-${chat.messages.length}`,
                    sender_name: isSent ? determinedOwnerName : otherUser,
                    timestamp_ms: timestamp,
                    media_type: rawMsg['Media Type'],
                    content: rawMsg.Text || rawMsg.Content,
                };
                
                chat.messages.push(message);
                chat.lastActivity = timestamp;
            }

            const finalChats = Array.from(conversations.values())
                .sort((a, b) => (b.lastActivity ?? 0) - (a.lastActivity ?? 0));

            setChats(finalChats);
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