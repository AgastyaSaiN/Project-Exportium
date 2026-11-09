import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import { Capacitor } from '@capacitor/core';

// Only the Android app gets the phone layout (see the `mobile:` variant in tailwind.config.js).
if (Capacitor.isNativePlatform()) document.documentElement.classList.add('native-mobile');

// Forward unexpected renderer errors to the main-process log file (no-op outside Electron).
const reportError = (message: string, detail?: string) => {
  window.electronAPI?.logError(message, detail);
};
window.addEventListener('error', (e) => reportError(e.message, e.error?.stack));
window.addEventListener('unhandledrejection', (e) => reportError('Unhandled rejection', String((e.reason as Error | undefined)?.stack ?? e.reason)));

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
