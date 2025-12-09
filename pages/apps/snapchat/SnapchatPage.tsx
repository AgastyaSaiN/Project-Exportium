
import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Platform } from '../../../constants';
import { parseSnapchatArchive } from './parser';
import { InternalChat } from './types';
import SnapchatChatViewer from './SnapchatChatViewer';

// Icons
const ArrowLeftIcon = (props: any) => (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" /></svg>);
const CloudArrowUpIcon = (props: any) => (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z" /></svg>);
const CheckBadgeIcon = (props: any) => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" {...props}><path fillRule="evenodd" d="M8.603 3.799A4.49 4.49 0 0112 2.25c1.357 0 2.573.6 3.397 1.549a4.49 4.49 0 013.498 1.307 4.491 4.491 0 011.307 3.497A4.49 4.49 0 0121.75 12a4.49 4.49 0 01-1.549 3.397 4.491 4.491 0 01-1.307 3.497 4.491 4.491 0 01-3.497 1.307A4.49 4.49 0 0112 21.75a4.49 4.49 0 01-3.397-1.549 4.49 4.49 0 01-3.498-1.306 4.491 4.491 0 01-1.307-3.498A4.49 4.49 0 012.25 12c0-1.357.6-2.573 1.549-3.397a4.49 4.49 0 011.307-3.497 4.491 4.491 0 013.497-1.307zm4.45 6.45l-3.5 3.5a.75.75 0 01-1.06 0l-1.5-1.5a.75.75 0 111.06-1.06l.97.97 2.97-2.97a.75.75 0 111.06 1.06z" clipRule="evenodd" /></svg>);
const GhostIcon = (props: any) => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" {...props}><path d="M12.002 2.006C7.584 2.006 4 5.592 4 10.005v.553c0 3.328 1.463 6.324 3.82 8.256.002.002.004.004.006.005a.707.707 0 00.708-.002c.22-.16.37-.41.37-.68V16.5c0-.414.336-.75.75-.75h6.69c.414 0 .75.336.75.75v1.64c0 .268.15.52.37.68.002.001.003.003.005.004a.707.707 0 00.708 0c2.357-1.933 3.82-4.928 3.82-8.256v-.553c0-4.413-3.584-8-7.998-8zM9.001 9.505c-.828 0-1.5-.895-1.5-2s.672-2 1.5-2 1.5.895 1.5 2-.672 2-1.5 2zm6 0c-.828 0-1.5-.895-1.5-2s.672-2 1.5-2 1.5.895 1.5 2-.672 2-1.5 2z" /></svg>);

interface SnapchatPageProps {
    platform: Platform;
}

const SnapchatPage: React.FC<SnapchatPageProps> = ({ platform }) => {
    const [viewState, setViewState] = useState<'upload' | 'processing' | 'dashboard' | 'viewer'>('upload');
    const [progress, setProgress] = useState('Initializing...');
    const [chats, setChats] = useState<InternalChat[]>([]);
    const [owner, setOwner] = useState('You');
    const [stats, setStats] = useState<any>(null);
    const [zipFile, setZipFile] = useState<File | null>(null);

    // Apply dark theme by default for Snapchat
    useEffect(() => {
        document.documentElement.classList.add('dark');
        return () => document.documentElement.classList.remove('dark');
    }, []);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setZipFile(file);
        setViewState('processing');
        setProgress('Starting import...');

        try {
            // Tiny delay to allow UI to update
            await new Promise(resolve => setTimeout(resolve, 100));
            const result = await parseSnapchatArchive(file, (msg) => setProgress(msg));
            setChats(result.chats);
            setOwner(result.owner);
            setStats(result.stats);
            setViewState('dashboard');
        } catch (error) {
            console.error(error);
            alert("Error parsing file: " + (error instanceof Error ? error.message : "Unknown error"));
            setViewState('upload');
            setZipFile(null);
        } finally {
            if (e.target) e.target.value = '';
        }
    };

    if (viewState === 'viewer') {
        return <SnapchatChatViewer chats={chats} owner={owner} zipFile={zipFile} onBack={() => setViewState('dashboard')} />;
    }

    return (
        <div className="min-h-screen bg-black text-white font-sans selection:bg-yellow-400 selection:text-black">
            {/* Header */}
            <div className="flex items-center p-6 border-b border-gray-800">
                <Link to="/" className="p-2 rounded-full hover:bg-gray-800 transition-colors">
                    <ArrowLeftIcon className="w-6 h-6 text-gray-400" />
                </Link>
                <div className="ml-4 flex items-center gap-3">
                    <GhostIcon className="w-8 h-8 text-yellow-400" />
                    <h1 className="text-xl font-bold tracking-tight">Snapchat Archive</h1>
                </div>
            </div>

            {/* Content */}
            <div className="container mx-auto max-w-4xl p-6 flex flex-col items-center justify-center min-h-[80vh]">
                
                {viewState === 'upload' && (
                    <div className="w-full max-w-xl text-center space-y-8 animate-fade-in">
                        <div className="p-10 border-2 border-dashed border-gray-700 rounded-3xl bg-gray-900/50 hover:bg-gray-900 hover:border-yellow-400 transition-all group cursor-pointer relative overflow-hidden">
                            <input 
                                type="file" 
                                accept=".zip" 
                                onChange={handleFileUpload} 
                                className="absolute inset-0 opacity-0 cursor-pointer z-10" 
                            />
                            <div className="flex flex-col items-center justify-center space-y-4">
                                <div className="p-4 bg-gray-800 rounded-full group-hover:bg-yellow-400 group-hover:text-black transition-colors">
                                    <CloudArrowUpIcon className="w-10 h-10" />
                                </div>
                                <div>
                                    <h3 className="text-2xl font-bold text-white mb-2">Upload Data Archive</h3>
                                    <p className="text-gray-400">Drag & drop your <span className="font-mono text-yellow-400">mydata.zip</span> here</p>
                                </div>
                                <p className="text-xs text-gray-500 max-w-xs mx-auto">
                                    All processing happens locally in your browser. Your data never leaves your device.
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {viewState === 'processing' && (
                    <div className="text-center space-y-6 animate-pulse">
                        <GhostIcon className="w-20 h-20 text-yellow-400 mx-auto animate-bounce" />
                        <h2 className="text-2xl font-bold">{progress}</h2>
                        <div className="w-64 h-2 bg-gray-800 rounded-full mx-auto overflow-hidden">
                            <div className="h-full bg-yellow-400 animate-loading-bar" style={{ width: '50%' }}></div>
                        </div>
                    </div>
                )}

                {viewState === 'dashboard' && stats && (
                    <div className="w-full space-y-8 animate-fade-in">
                        <div className="text-center space-y-2">
                            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-yellow-400 text-black mb-4 shadow-[0_0_20px_rgba(250,204,21,0.5)]">
                                <CheckBadgeIcon className="w-10 h-10" />
                            </div>
                            <h2 className="text-3xl font-bold">Import Successful</h2>
                            <p className="text-gray-400">Ready to explore your history as <span className="text-white font-bold">{owner}</span></p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="p-6 bg-gray-900 border border-gray-800 rounded-2xl">
                                <p className="text-gray-500 text-sm uppercase font-bold tracking-wider">Conversations</p>
                                <p className="text-4xl font-mono mt-2 text-white">{stats.totalChats}</p>
                            </div>
                            <div className="p-6 bg-gray-900 border border-gray-800 rounded-2xl">
                                <p className="text-gray-500 text-sm uppercase font-bold tracking-wider">Total Messages</p>
                                <p className="text-4xl font-mono mt-2 text-yellow-400">{stats.totalMessages.toLocaleString()}</p>
                            </div>
                            <div className="p-6 bg-gray-900 border border-gray-800 rounded-2xl">
                                <p className="text-gray-500 text-sm uppercase font-bold tracking-wider">Media Found</p>
                                <p className="text-4xl font-mono mt-2 text-purple-400">{stats.totalMedia.toLocaleString()}</p>
                            </div>
                        </div>

                        <div className="flex justify-center gap-4">
                            <button 
                                onClick={() => setViewState('viewer')}
                                className="px-8 py-4 bg-yellow-400 hover:bg-yellow-300 text-black font-bold text-lg rounded-xl shadow-lg hover:shadow-yellow-400/20 transition-all transform hover:scale-105"
                            >
                                Open Chat Viewer
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default SnapchatPage;
