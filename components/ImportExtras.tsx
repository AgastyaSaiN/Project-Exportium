import React, { useState } from 'react';
import { canReopenRecents, reopenRecent } from '../utils/recentFiles';
import { forgetRecent, readRecents } from '../utils/storage';
import type { RecentExport } from '../utils/storage';

/** Full-window hint shown while a file is being dragged over the app. */
export const DropOverlay: React.FC<{ show: boolean; label: string }> = ({ show, label }) => {
    if (!show) return null;
    return (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm pointer-events-none" aria-hidden="true">
            <div className="px-10 py-8 rounded-2xl border-2 border-dashed border-white/70 text-white text-2xl font-semibold text-center">
                {label}
            </div>
        </div>
    );
};

const sizeLabel = (bytes: number) => (bytes >= 1024 ** 3 ? `${(bytes / 1024 ** 3).toFixed(1)} GB` : `${Math.max(1, Math.round(bytes / 1024 ** 2))} MB`);

const agoLabel = (timestamp: number) => {
    const minutes = Math.round((Date.now() - timestamp) / 60000);
    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes} min ago`;
    const hours = Math.round(minutes / 60);
    if (hours < 24) return `${hours} h ago`;
    return `${Math.round(hours / 24)} d ago`;
};

interface RecentExportsProps {
    platform: string;
    /** Called with the file read back from disk. */
    onOpen: (file: File) => void;
}

/** The exports opened before on this platform: one click reopens them (desktop app only). */
export const RecentExports: React.FC<RecentExportsProps> = ({ platform, onOpen }) => {
    const [recents, setRecents] = useState<RecentExport[]>(() => readRecents().filter(r => r.platform === platform && r.path));
    const [message, setMessage] = useState('');

    if (!canReopenRecents() || recents.length === 0) return null;

    const open = async (entry: RecentExport) => {
        setMessage('');
        const file = await reopenRecent(entry);
        if (file) { onOpen(file); return; }
        forgetRecent(entry);
        setRecents(list => list.filter(r => r !== entry));
        setMessage(`"${entry.name}" could not be opened. It may have been moved or deleted.`);
    };

    return (
        <div className="mt-10 text-left max-w-xl mx-auto">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Recent</h3>
            <ul className="mt-2 divide-y divide-slate-200 dark:divide-slate-700 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/60">
                {recents.map(entry => (
                    <li key={`${entry.name}-${entry.size}-${entry.lastModified}`} className="flex items-center">
                        <button type="button" onClick={() => open(entry)} className="flex-1 min-w-0 text-left px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded-l-lg">
                            <span className="block font-semibold text-slate-800 dark:text-slate-100 truncate">{entry.name}</span>
                            <span className="block text-xs text-slate-500 dark:text-slate-400">{sizeLabel(entry.size)} · opened {agoLabel(entry.openedAt)}</span>
                        </button>
                        <button
                            type="button"
                            aria-label={`Remove ${entry.name} from recent`}
                            onClick={() => { forgetRecent(entry); setRecents(list => list.filter(r => r !== entry)); }}
                            className="px-4 py-3 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                        >
                            ✕
                        </button>
                    </li>
                ))}
            </ul>
            {message && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{message}</p>}
        </div>
    );
};
