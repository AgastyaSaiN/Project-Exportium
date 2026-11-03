
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { openZip, ZipEntry } from '../../../utils/zipArchive';
import { Platform } from '../../../constants';
import WhatsAppChatViewer from './WhatsAppChatViewer';
import { Chat } from './types';
import { parseInWorker } from '../../../utils/parseInWorker';
import { useMediaLoader } from '../../../utils/mediaLoader';
import { DropOverlay, RecentExports } from '../../../components/ImportExtras';
import { trackExport } from '../../../utils/recentFiles';
import { usePersistentState, readJson, writeJson } from '../../../utils/storage';
import { useFileDrop } from '../../../utils/useFileDrop';

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

interface WhatsAppPageProps {
    platform: Platform;
}

const WhatsAppPage: React.FC<WhatsAppPageProps> = ({ platform }) => {
    const { name, icon: Icon, color } = platform;
    const [status, setStatus] = useState<'idle' | 'processing' | 'selecting' | 'error' | 'loaded'>('idle');
    const [processingStep, setProcessingStep] = useState('');
    const [progress, setProgress] = useState({ processed: 0, total: 1 });
    const [errorMessage, setErrorMessage] = useState<string>('');
    const [chat, setChat] = useState<Chat | null>(null);
    const [ownerName, setOwnerName] = useState<string>('');
    const [exportKey, setExportKey] = useState<string | undefined>();
    const [theme, setTheme] = usePersistentState<'light' | 'dark'>('theme', 'light');
    const fileInputRef = useRef<HTMLInputElement>(null);
    // The chat text and file name are kept so the date order can be re-read without re-importing.
    const sourceRef = useRef<{ text: string; fileName: string }>({ text: '', fileName: '' });

    useEffect(() => {
        const root = window.document.documentElement;
        root.classList.remove(theme === 'light' ? 'dark' : 'light');
        root.classList.add(theme);
    }, [theme]);

    const handleThemeToggle = () => {
        setTheme(prevTheme => prevTheme === 'light' ? 'dark' : 'light');
    };

    const exportKeyOf = (file: File) => `whatsapp:${file.name}:${file.size}:${file.lastModified}`;

    const dropping = useFileDrop((files) => {
        const file = files.find(f => /\.(zip|txt)$/i.test(f.name));
        if (file) void importFile(file);
        else { setErrorMessage('Drop a WhatsApp export: a .zip or the chat .txt file.'); setStatus('error'); }
    }, status === 'idle' || status === 'error');

    const handleSelectArchiveClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) await importFile(file);
        if (event.target) event.target.value = '';
    };

    const importFile = async (file: File) => {
        setExportKey(trackExport('whatsapp', file));

        setStatus('processing');
        setErrorMessage('');
        setChat(null);
        setOwnerName('');
        setProgress({ processed: 0, total: 1 });

        try {
            let chatContent: string;
            let fileMap: Map<string, ZipEntry> | undefined;

            if (file.type === 'application/zip' || file.name.endsWith('.zip')) {
                setProcessingStep('Loading ZIP file...');
                const zip = await openZip(file);
                
                const chatFileCandidates = zip.file(/\.txt$/i);
                const chatFile = chatFileCandidates.find(f => !f.name.startsWith('__MACOSX'));
                
                if (!chatFile) {
                    throw new Error("No '.txt' chat file found in the ZIP archive. Please upload a valid WhatsApp export with media.");
                }

                setProcessingStep('Reading chat file...');
                chatContent = await chatFile.async('string');
                
                fileMap = new Map<string, ZipEntry>();
                Object.values(zip.files).forEach((file: ZipEntry) => {
                    if (!file.dir) {
                        fileMap.set(file.name, file);
                    }
                });

            } else { // Assume .txt
                setProcessingStep('Reading chat file...');
                chatContent = await file.text();
            }

            setProcessingStep('Parsing messages...');
            sourceRef.current = { text: chatContent, fileName: file.name };
            const parsed = await parseInWorker(
                'whatsapp',
                { text: chatContent, fileName: file.name },
                (processed, total) => setProgress({ processed, total })
            );
            const finalChat: Chat = { ...parsed, fileMap };

            setChat(finalChat);
            const remembered = readJson<string>(`owner:${exportKeyOf(file)}`, '');
            if (remembered && finalChat.participants.some(p => p.name === remembered) && !finalChat.dateOrderAmbiguous) {
                handleUserSelection(remembered, exportKeyOf(file));
            } else if (finalChat.participants.length > 1 || finalChat.dateOrderAmbiguous) {
                setStatus('selecting');
            } else if (finalChat.participants.length === 1) {
                handleUserSelection(finalChat.participants[0]?.name);
            } else {
                setStatus('loaded');
            }

        } catch (error) {
            console.error("Failed to process chat file:", error);
            setStatus('error');
            setErrorMessage(error instanceof Error ? error.message : "An unknown error occurred during processing.");
        }
    };

    const switchDateOrder = async () => {
        if (!chat) return;
        const next = chat.dateOrder === 'dmy' ? 'mdy' : 'dmy';
        const parsed = await parseInWorker('whatsapp', { text: sourceRef.current.text, fileName: sourceRef.current.fileName, dateOrder: next });
        setChat({ ...parsed, fileMap: chat.fileMap, dateOrderAmbiguous: true });
    };

    const handleUserSelection = (name: string, key = exportKey) => {
        if (key) writeJson(`owner:${key}`, name);
        setOwnerName(name);
        setStatus('loaded');
    };

    const chatFileMap = chat?.fileMap;
    const getBlob = useCallback(async (uri: string): Promise<Blob | undefined> => {
        if (!chatFileMap) return undefined;
        const mediaFile = chatFileMap.get(uri) || chatFileMap.get(decodeURIComponent(uri));
        return mediaFile ? mediaFile.async('blob') : undefined;
    }, [chatFileMap]);
    const mediaLoader = useMediaLoader(getBlob);

    const handleReset = () => {
        mediaLoader.dispose();
        setStatus('idle');
        setErrorMessage('');
        setChat(null);
        setOwnerName('');
        setProgress({ processed: 0, total: 1 });
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const renderContent = () => {
        switch (status) {
            case 'processing': {
                const percent = progress.total > 0 ? Math.round((progress.processed / progress.total) * 100) : 0;
                return (
                    <div className="text-center w-full max-w-lg">
                        <SpinnerIcon className="w-20 h-20 mx-auto text-slate-400 animate-spin mb-6" />
                        <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-200">{processingStep}</h2>
                        {processingStep === 'Parsing messages...' && (
                             <div className="mt-4">
                                <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2.5">
                                    <div className="bg-green-500 h-2.5 rounded-full" style={{ width: `${percent}%` }}></div>
                                </div>
                                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                                    {`Processing line ${progress.processed.toLocaleString()} of ${progress.total.toLocaleString()}...`}
                                </p>
                            </div>
                        )}
                    </div>
                );
            }
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
                        {chat?.dateOrderAmbiguous && chat.messages[0] && (
                            <div className="mt-6 p-4 text-left rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-700 text-sm text-amber-900 dark:text-amber-200">
                                <p>
                                    The dates in this export can be read two ways. The first message is on{' '}
                                    <strong>{new Date(chat.messages[0].timestamp_ms).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' })}</strong>.
                                </p>
                                <button onClick={switchDateOrder} className="mt-2 font-semibold underline underline-offset-2">
                                    That looks wrong: read dates as {chat.dateOrder === 'dmy' ? 'month/day' : 'day/month'} instead
                                </button>
                            </div>
                        )}
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
                exportKey={exportKey} 
                onReset={handleReset}
                theme={theme}
                onThemeToggle={handleThemeToggle}
                createBlobUrl={mediaLoader.source}
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
                {status === 'idle' && <RecentExports platform="whatsapp" onOpen={(file) => void importFile(file)} />}
                <DropOverlay show={dropping} label="Drop your WhatsApp export" />
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