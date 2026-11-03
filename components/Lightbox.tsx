import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { INLINE_THUMBNAIL_WIDTH } from '../utils/mediaLoader';
import type { MediaSource } from '../utils/mediaLoader';
import { saveMedia } from '../utils/saveMedia';

export interface LightboxItem {
    uri: string;
    kind: 'image' | 'video';
    sender?: string | null;
    timestamp?: number;
    /** The viewer's own handle on the message this came from, passed back to `onShowInChat`. */
    ref: unknown;
}

interface LightboxApi {
    open: (uri: string) => void;
}

const LightboxContext = createContext<LightboxApi | null>(null);

/** Null outside a provider, so media components still work (without click-to-enlarge) in isolation. */
export const useLightbox = () => useContext(LightboxContext);

interface LightboxProviderProps {
    /** The set of photos/videos that the arrows page through, in display order. */
    items: LightboxItem[];
    media: MediaSource;
    onShowInChat?: (item: LightboxItem) => void;
    children: React.ReactNode;
}

const formatWhen = (timestamp?: number) =>
    timestamp ? new Date(timestamp).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : '';

const CloseIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
);
const ChevronIcon: React.FC<{ direction: 'left' | 'right' }> = ({ direction }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-7 h-7" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d={direction === 'left' ? 'M15.75 19.5L8.25 12l7.5-7.5' : 'M8.25 4.5l7.5 7.5-7.5 7.5'} /></svg>
);

/**
 * Full-screen viewer for photos and videos: opens at full resolution, pages through the chat's
 * media with the arrow keys or buttons, and can jump back to the message the picture came from.
 */
export const LightboxProvider: React.FC<LightboxProviderProps> = ({ items, media, onShowInChat, children }) => {
    const [index, setIndex] = useState<number | null>(null);
    const indexByUri = useMemo(() => {
        const map = new Map<string, number>();
        items.forEach((item, i) => { if (!map.has(item.uri)) map.set(item.uri, i); });
        return map;
    }, [items]);

    const open = useCallback((uri: string) => {
        const found = indexByUri.get(uri);
        if (found !== undefined) setIndex(found);
    }, [indexByUri]);

    const api = useMemo<LightboxApi>(() => ({ open }), [open]);

    // Switching chats replaces the items: close rather than show a picture from another chat.
    useEffect(() => { setIndex(null); }, [items]);

    const close = useCallback(() => setIndex(null), []);
    const step = useCallback((delta: number) => {
        setIndex(current => (current === null ? null : Math.min(items.length - 1, Math.max(0, current + delta))));
    }, [items.length]);

    const item = index !== null ? items[index] : undefined;

    return (
        <LightboxContext.Provider value={api}>
            {children}
            {item && index !== null && (
                <LightboxModal
                    key="lightbox"
                    item={item}
                    position={index + 1}
                    total={items.length}
                    media={media}
                    canPrev={index > 0}
                    canNext={index < items.length - 1}
                    onPrev={() => step(-1)}
                    onNext={() => step(1)}
                    onClose={close}
                    onShowInChat={onShowInChat ? () => { close(); onShowInChat(item); } : undefined}
                />
            )}
        </LightboxContext.Provider>
    );
};

interface LightboxModalProps {
    item: LightboxItem;
    position: number;
    total: number;
    media: MediaSource;
    canPrev: boolean;
    canNext: boolean;
    onPrev: () => void;
    onNext: () => void;
    onClose: () => void;
    onShowInChat?: () => void;
}

const LightboxModal: React.FC<LightboxModalProps> = ({ item, position, total, media, canPrev, canNext, onPrev, onNext, onClose, onShowInChat }) => {
    const [preview, setPreview] = useState<string | null>(null);
    const [full, setFull] = useState<string | null>(null);
    const [failed, setFailed] = useState(false);
    const [zoomed, setZoomed] = useState(false);
    const closeButton = useRef<HTMLButtonElement>(null);

    useEffect(() => { closeButton.current?.focus(); }, []);

    // Show the already-cached preview immediately while the original loads.
    useEffect(() => {
        let cancelled = false;
        setPreview(null); setFull(null); setFailed(false); setZoomed(false);
        const previewOptions = item.kind === 'image' ? { thumbnail: INLINE_THUMBNAIL_WIDTH } : undefined;
        if (previewOptions) media(item.uri, previewOptions).then(url => { if (!cancelled && url) setPreview(url); });
        media(item.uri).then(url => { if (cancelled) return; if (url) setFull(url); else setFailed(true); });
        return () => {
            cancelled = true;
            media.release(item.uri);
            if (previewOptions) media.release(item.uri, previewOptions);
        };
    }, [item.uri, item.kind, media]);

    useEffect(() => {
        const onKey = (event: KeyboardEvent) => {
            if (event.key === 'Escape') onClose();
            else if (event.key === 'ArrowLeft') onPrev();
            else if (event.key === 'ArrowRight') onNext();
            else return;
            event.preventDefault();
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onClose, onPrev, onNext]);

    const shown = full ?? preview;
    const caption = [item.sender, formatWhen(item.timestamp)].filter(Boolean).join(' · ');

    return (
        <div
            role="dialog"
            aria-modal="true"
            aria-label="Photo viewer"
            className="fixed inset-0 z-50 bg-black/92 flex flex-col"
            style={{ backgroundColor: 'rgba(0,0,0,0.92)' }}
            onClick={onClose}
        >
            <div className="flex items-center justify-between gap-4 px-4 py-3 text-white" onClick={e => e.stopPropagation()}>
                <div className="min-w-0">
                    <p className="text-sm font-semibold truncate">{caption || 'Photo'}</p>
                    <p className="text-xs text-white/60">{position.toLocaleString()} of {total.toLocaleString()}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                    <button type="button" onClick={() => void saveMedia(media, item.uri)} disabled={!full} className="px-3 py-1.5 text-sm font-semibold rounded-lg bg-white/15 hover:bg-white/25 disabled:opacity-40 transition-colors" title="Save the original file">
                        Save
                    </button>
                    {onShowInChat && (
                        <button type="button" onClick={onShowInChat} className="px-3 py-1.5 text-sm font-semibold rounded-lg bg-white/15 hover:bg-white/25 transition-colors">
                            Show in chat
                        </button>
                    )}
                    <button ref={closeButton} type="button" aria-label="Close photo viewer" onClick={onClose} className="p-2 rounded-full hover:bg-white/15 transition-colors">
                        <CloseIcon />
                    </button>
                </div>
            </div>

            <div className="relative flex-1 min-h-0 flex items-center justify-center">
                {canPrev && (
                    <button type="button" aria-label="Previous" onClick={e => { e.stopPropagation(); onPrev(); }} className="absolute left-3 z-10 p-3 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors">
                        <ChevronIcon direction="left" />
                    </button>
                )}
                <div className={`w-full h-full flex ${zoomed ? 'overflow-auto' : 'items-center justify-center'}`} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
                    {shown && item.kind === 'image' && (
                        <img
                            src={shown}
                            alt="Full-size photo"
                            onClick={e => { e.stopPropagation(); if (full) setZoomed(z => !z); }}
                            className={zoomed ? 'max-w-none m-auto cursor-zoom-out' : 'max-w-[94vw] max-h-full object-contain m-auto cursor-zoom-in'}
                            draggable={false}
                        />
                    )}
                    {full && item.kind === 'video' && (
                        <video src={full} controls autoPlay className="max-w-[94vw] max-h-full m-auto" onClick={e => e.stopPropagation()} />
                    )}
                    {!shown && !failed && <div className="m-auto w-10 h-10 border-4 border-white/20 border-t-white rounded-full animate-spin" role="status" aria-label="Loading" />}
                    {failed && !shown && <p className="m-auto text-white/70">This photo is not in the export.</p>}
                </div>
                {canNext && (
                    <button type="button" aria-label="Next" onClick={e => { e.stopPropagation(); onNext(); }} className="absolute right-3 z-10 p-3 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors">
                        <ChevronIcon direction="right" />
                    </button>
                )}
            </div>
        </div>
    );
};
