
import React, { useState, useEffect } from 'react';

const CloudArrowDownIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
    </svg>
);

const ShieldCheckIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
        <path fillRule="evenodd" d="M12.516 2.17a.75.75 0 00-1.032 0 11.209 11.209 0 01-7.877 3.08.75.75 0 00-.722.515A12.74 12.74 0 002.25 9.75c0 5.942 4.064 10.933 9.563 12.348a.749.749 0 00.374 0c5.499-1.415 9.563-6.406 9.563-12.348 0-1.39-.223-2.73-.635-3.985a.75.75 0 00-.722-.516l-.143.001c-2.996 0-5.717-1.17-7.734-3.08zm3.094 8.016a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" clipRule="evenodd" />
    </svg>
);

const PrivacyBadge: React.FC = () => {
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [isCached, setIsCached] = useState(false);
    const [isHovered, setIsHovered] = useState(false);

    useEffect(() => {
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);

        // Check if service worker is controlling the page (means assets are cached)
        const checkSW = () => {
            if (navigator.serviceWorker && navigator.serviceWorker.controller) {
                setIsCached(true);
            }
        };
        
        checkSW();
        // Also listen for controller change (when SW takes over for the first time)
        navigator.serviceWorker?.addEventListener('controllerchange', checkSW);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
            navigator.serviceWorker?.removeEventListener('controllerchange', checkSW);
        };
    }, []);

    // 1. OFFLINE MODE (Best State)
    if (!isOnline) {
        return (
            <div className="fixed bottom-4 right-4 z-50 animate-fade-in">
                <div className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-full shadow-lg shadow-emerald-500/30 border border-emerald-400 transition-all duration-300">
                    <ShieldCheckIcon className="w-5 h-5" />
                    <div className="flex flex-col">
                        <span className="text-xs font-bold uppercase tracking-wider">Offline & Secure</span>
                        <span className="text-[10px] opacity-90">Running locally</span>
                    </div>
                </div>
            </div>
        );
    }

    // 2. ONLINE & CACHED (Ready to go offline)
    if (isCached) {
        return (
            <div 
                className="fixed bottom-4 right-4 z-50 cursor-help"
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
            >
                <div className={`flex items-center gap-3 px-4 py-2 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-full shadow-lg border border-slate-200 dark:border-slate-700 transition-all duration-300 ${isHovered ? 'pr-4' : 'pr-2'}`}>
                    <div className="relative">
                        <ShieldCheckIcon className="w-5 h-5 text-emerald-500" />
                        <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-400"></span>
                        </span>
                    </div>
                    
                    {isHovered ? (
                        <div className="flex flex-col animate-fade-in">
                            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">App Installed</span>
                            <span className="text-[10px] text-slate-500 dark:text-slate-400">Disconnect Wi-Fi to test</span>
                        </div>
                    ) : (
                        <span className="text-xs font-medium hidden sm:inline-block text-emerald-600 dark:text-emerald-400">Secure</span>
                    )}
                </div>
            </div>
        );
    }

    // 3. ONLINE & INSTALLING (Wait...)
    return (
        <div className="fixed bottom-4 right-4 z-50">
             <div className="flex items-center gap-3 px-4 py-2 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-full shadow-lg border border-slate-200 dark:border-slate-700">
                <CloudArrowDownIcon className="w-5 h-5 animate-bounce text-blue-500" />
                <div className="flex flex-col">
                    <span className="text-xs font-bold">Caching...</span>
                    <span className="text-[10px] text-slate-400">Preparing for offline</span>
                </div>
            </div>
        </div>
    );
};

export default PrivacyBadge;
