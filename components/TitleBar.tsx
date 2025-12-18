import React, { useEffect, useState } from 'react';
import './TitleBar.css';
import './TitleBar.css';

// Define the interface for the exposed API
interface WindowControls {
    minimize: () => void;
    maximize: () => void;
    close: () => void;
    onMaximizeChange: (callback: (isMaximized: boolean) => void) => void;
}

declare global {
    interface Window {
        electronAPI?: {
            windowControls: WindowControls;
        };
    }
}

const TitleBar: React.FC = () => {
    const [isMaximized, setIsMaximized] = useState(false);

    useEffect(() => {
        if (window.electronAPI?.windowControls) {
            window.electronAPI.windowControls.onMaximizeChange((maximized) => {
                setIsMaximized(maximized);
            });
        }
    }, []);

    const handleMinimize = () => window.electronAPI?.windowControls.minimize();
    const handleMaximize = () => window.electronAPI?.windowControls.maximize();
    const handleClose = () => window.electronAPI?.windowControls.close();

    // If we are not in Electron (e.g. browser dev), we might want to hide this or just show valid UI
    if (!window.electronAPI) return null;

    return (
        <div className="titlebar">
            <div className="titlebar-logo">
                <img src="/logo keicei.png" alt="Logo" />
                <span>Exportium</span>
            </div>
            <div className="titlebar-controls">
                <div className="titlebar-button" onClick={handleMinimize} title="Minimize">
                    <svg className="icon" viewBox="0 0 10 1" fill="currentColor"><path d="M0 0h10v1H0z" /></svg>
                </div>
                <div className="titlebar-button" onClick={handleMaximize} title="Maximize">
                    {isMaximized ? (
                        // Restore icon
                        <svg className="icon" viewBox="0 0 10 10" fill="currentColor"><path d="M2.1,0v2H0v8.1h8.2v-2h2.1V0H2.1z M8.2,9.2H1V2.9h1V8.2h6.2v1H8.2z M11.2,7.2h-1V1.9H2.9V1H11.2V7.2z" /></svg>
                    ) : (
                        // Maximize icon
                        <svg className="icon" viewBox="0 0 10 10" fill="currentColor"><path d="M0 0h10v10H0z M1 1v8h8V1z" /></svg>
                    )}
                </div>
                <div className="titlebar-button close" onClick={handleClose} title="Close">
                    <svg className="icon" viewBox="0 0 10 10" fill="currentColor"><path d="M0 0h10v1H0z" transform="rotate(45 5 5)" /><path d="M0 0h10v1H0z" transform="rotate(-45 5 5)" /></svg>
                </div>
            </div>
        </div>
    );
};

export default TitleBar;
