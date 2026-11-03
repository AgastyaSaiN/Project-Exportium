import React, { useEffect, useState } from 'react';

type Status = { state: 'downloading' | 'ready'; version: string; notes?: string };

/**
 * Shows when the desktop app has found, or finished downloading, a newer version. Updates install
 * when the app is closed; this banner lets the reader restart into the new version right away.
 */
const UpdateBanner: React.FC = () => {
    const [status, setStatus] = useState<Status | null>(null);
    const [dismissed, setDismissed] = useState(false);

    useEffect(() => window.electronAPI?.onUpdateStatus(next => { setStatus(next); setDismissed(false); }), []);

    if (!status || dismissed) return null;

    return (
        <div role="status" className="fixed bottom-4 right-4 z-40 max-w-sm rounded-xl shadow-2xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 p-4">
            {status.state === 'downloading' ? (
                <p className="text-sm"><strong>Version {status.version}</strong> is downloading in the background.</p>
            ) : (
                <>
                    <p className="text-sm font-semibold">Version {status.version} is ready</p>
                    {status.notes && <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 line-clamp-4 whitespace-pre-line">{status.notes.replace(/<[^>]+>/g, '')}</p>}
                    <div className="mt-3 flex gap-2">
                        <button type="button" onClick={() => window.electronAPI?.installUpdate()} className="px-3 py-1.5 text-sm font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-700">Restart to update</button>
                        <button type="button" onClick={() => setDismissed(true)} className="px-3 py-1.5 text-sm rounded-lg border border-slate-300 dark:border-slate-600">Later</button>
                    </div>
                    <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Or just close the app: it updates itself on exit.</p>
                </>
            )}
        </div>
    );
};

export default UpdateBanner;
