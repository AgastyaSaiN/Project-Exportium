import { useEffect, useRef } from 'react';

interface ChatShortcuts {
    /** Ctrl/Cmd+F: put the cursor in the message search box. */
    onFind?: () => void;
    /** Ctrl/Cmd+Shift+F: search every conversation. */
    onGlobalFind?: () => void;
    /** Ctrl/Cmd+G: open the "go to date" calendar. */
    onGoToDate?: () => void;
    /** Home / End while not typing. */
    onTop?: () => void;
    onBottom?: () => void;
    /** Escape: leave search, close the match navigator. Return true if it did something. */
    onEscape?: () => boolean | void;
}

const isTyping = (target: EventTarget | null) => {
    const el = target as HTMLElement | null;
    return !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable);
};

/** Keyboard shortcuts for reading a chat. Ignored while a dialog (such as the photo viewer) is open. */
export const useChatShortcuts = (shortcuts: ChatShortcuts, enabled = true): void => {
    const latest = useRef(shortcuts);
    latest.current = shortcuts;

    useEffect(() => {
        if (!enabled) return;
        const onKey = (event: KeyboardEvent) => {
            if (document.querySelector('[role="dialog"]')) return;
            const mod = event.ctrlKey || event.metaKey;
            const s = latest.current;
            if (mod && event.shiftKey && event.key.toLowerCase() === 'f' && s.onGlobalFind) { event.preventDefault(); s.onGlobalFind(); return; }
            if (mod && event.key.toLowerCase() === 'f' && s.onFind) { event.preventDefault(); s.onFind(); return; }
            if (mod && event.key.toLowerCase() === 'g' && s.onGoToDate) { event.preventDefault(); s.onGoToDate(); return; }
            if (event.key === 'Escape') { if (s.onEscape?.()) event.preventDefault(); return; }
            if (isTyping(event.target) || mod || event.altKey) return;
            if (event.key === 'Home' && s.onTop) { event.preventDefault(); s.onTop(); }
            else if (event.key === 'End' && s.onBottom) { event.preventDefault(); s.onBottom(); }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [enabled]);
};

/** Focuses the message search box (the one marked data-chat-search). */
export const focusChatSearch = (): void => {
    const input = document.querySelector<HTMLInputElement>('input[data-chat-search]');
    input?.focus();
    input?.select();
};
