import { useEffect, useRef } from 'react';

const onPhone = () => typeof document !== 'undefined' && document.documentElement.classList.contains('native-mobile');

/** The full-screen layers currently open, newest last. */
const layers: Array<() => void> = [];

declare global {
    interface Window {
        /** Called by the Android shell when Back is pressed. Returns true when the page used the press. */
        __exportiumBack?: () => boolean;
    }
}

if (typeof window !== 'undefined') {
    window.__exportiumBack = () => {
        const top = layers.pop();
        if (top) { top(); return true; }
        // Nothing open: step back from a chat or app page to the screen before it; leave the app from Home.
        const here = window.location.hash;
        if (here && here !== '#/' && here !== '#') { window.history.back(); return true; }
        return false;
    };
}

/**
 * Phone only: makes the Android Back button (or back swipe) close a full-screen layer such as the photo viewer
 * or the settings page, instead of leaving the screen behind it. While the layer is on screen it is on a stack;
 * Back closes the newest one by calling `onClose`.
 */
export const useBackToClose = (onClose: () => void): void => {
    const latest = useRef(onClose);
    latest.current = onClose;

    useEffect(() => {
        if (!onPhone()) return;
        const entry = () => latest.current();
        layers.push(entry);
        return () => {
            const at = layers.indexOf(entry);
            if (at >= 0) layers.splice(at, 1);
        };
    }, []);
};
