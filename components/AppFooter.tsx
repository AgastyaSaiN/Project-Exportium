import React, { useState } from 'react';

/** Version, "check for updates" and the log folder, for the desktop app (hidden in a plain browser). */
const AppFooter: React.FC = () => {
    const api = window.electronAPI;
    const [message, setMessage] = useState('');
    const [busy, setBusy] = useState(false);
    if (!api) return <p className="text-xs text-slate-400 dark:text-slate-500">Version {__APP_VERSION__}</p>;

    const check = async () => {
        setBusy(true);
        setMessage('Checking…');
        const result = await api.checkForUpdates();
        setBusy(false);
        setMessage(
            result.state === 'available' ? `Version ${result.version} found: downloading in the background.`
            : result.state === 'current' ? "You're on the latest version."
            : result.state === 'unavailable' ? 'Updates are only checked in the installed app.'
            : 'Could not check for updates. Are you online?'
        );
    };

    return (
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
            <span>Version {__APP_VERSION__}</span>
            <button type="button" onClick={check} disabled={busy} className="underline underline-offset-2 hover:text-slate-800 dark:hover:text-slate-200 disabled:opacity-50">Check for updates</button>
            <button type="button" onClick={() => api.openLogs()} className="underline underline-offset-2 hover:text-slate-800 dark:hover:text-slate-200">Open log folder</button>
            {message && <span role="status">{message}</span>}
        </div>
    );
};

export default AppFooter;
