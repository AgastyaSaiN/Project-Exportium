import React, { useEffect, useRef, useState } from 'react';
import { INLINE_THUMBNAIL_WIDTH } from '../utils/mediaLoader';
import type { MediaSource } from '../utils/mediaLoader';
import { useLightbox } from './Lightbox';

export type MediaKind = 'image' | 'video' | 'audio';

const OBSERVER_OPTIONS: IntersectionObserverInit = { rootMargin: '200px' };

const SpinnerIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className={className}>
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);

const PhotoIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
        <path fillRule="evenodd" d="M1.5 6a2.25 2.25 0 012.25-2.25h16.5A2.25 2.25 0 0122.5 6v12a2.25 2.25 0 01-2.25 2.25H3.75A2.25 2.25 0 011.5 18V6zM3 16.06V18c0 .414.336.75.75.75h16.5A.75.75 0 0021 18v-1.94l-2.69-2.689a1.5 1.5 0 00-2.12 0l-.88.879.97.97a.75.75 0 11-1.06 1.06l-5.16-5.159a1.5 1.5 0 00-2.12 0L3 16.061zm10.125-7.81a1.125 1.125 0 112.25 0 1.125 1.125 0 01-2.25 0z" clipRule="evenodd" />
    </svg>
);

interface LazyMediaProps {
    uri: string;
    media: MediaSource;
    kind: MediaKind;
    className?: string;
    alt?: string;
    /**
     * Inline (chat bubble) use: show the picture at its own proportions. Bubbles are column flex
     * containers, which stretch children sideways; with a capped height that squashes photos, so
     * natural media opts out of stretching and gets a fixed-width placeholder.
     */
    natural?: boolean;
    /** Clicking a photo opens it full-size when a LightboxProvider is present (default). */
    enlargeable?: boolean;
}

/**
 * Shows one attachment, extracting it from the export only once it is near the screen, and
 * handing it back when it scrolls away (or the row is recycled by the virtual list) so the
 * loader can free its memory.
 */
const LazyMedia: React.FC<LazyMediaProps> = ({ uri, media, kind, className = '', alt = 'Attachment', natural = false, enlargeable = true }) => {
    const lightbox = useLightbox();
    const [url, setUrl] = useState<string | null>(null);
    const [visible, setVisible] = useState(false);
    const [failed, setFailed] = useState(false);
    const placeholderRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const node = placeholderRef.current;
        if (!node || visible) return;
        const observer = new IntersectionObserver(([entry]) => {
            if (entry.isIntersecting) { setVisible(true); observer.disconnect(); }
        }, OBSERVER_OPTIONS);
        observer.observe(node);
        return () => observer.disconnect();
    }, [visible]);

    useEffect(() => {
        if (!visible) return;
        let cancelled = false;
        const options = kind === 'image' ? { thumbnail: INLINE_THUMBNAIL_WIDTH } : undefined;
        media(uri, options).then(result => {
            if (cancelled) return;
            if (result) setUrl(result); else setFailed(true);
        });
        return () => {
            cancelled = true;
            media.release(uri, options);
            setUrl(null);
        };
    }, [visible, uri, kind, media]);

    const shapeClass = natural ? 'self-start' : '';

    if (url) {
        if (kind === 'video') return <video src={url} controls preload="metadata" className={`${className} ${shapeClass}`} />;
        if (kind === 'audio') return <audio src={url} controls className="w-full h-10" />;
        if (lightbox && enlargeable) {
            const enlarge = (event: React.SyntheticEvent) => { event.stopPropagation(); lightbox.open(uri); };
            return (
                <img
                    src={url}
                    alt={alt}
                    className={`${className} ${shapeClass} cursor-zoom-in`}
                    decoding="async"
                    role="button"
                    tabIndex={0}
                    aria-label="View photo full size"
                    onClick={enlarge}
                    onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); enlarge(event); } }}
                />
            );
        }
        return <img src={url} alt={alt} className={`${className} ${shapeClass}`} decoding="async" />;
    }

    if (kind === 'audio') {
        return (
            <div ref={placeholderRef} className="w-full flex items-center justify-center bg-slate-200 dark:bg-slate-700 rounded-lg p-2">
                {failed ? <span className="text-xs text-slate-500">Audio unavailable</span> : <SpinnerIcon className="w-4 h-4 text-slate-400 animate-spin" />}
            </div>
        );
    }

    const aspect = kind === 'video' ? 'aspect-video' : 'aspect-square';
    const placeholderWidth = natural ? 'w-64 max-w-full self-start' : '';
    return (
        <div ref={placeholderRef} className={`${className} ${aspect} ${placeholderWidth} bg-slate-200 dark:bg-slate-700 flex items-center justify-center`}>
            {visible && !failed
                ? <SpinnerIcon className="w-6 h-6 text-slate-400 animate-spin" />
                : <PhotoIcon className="w-8 h-8 text-slate-400" />}
        </div>
    );
};

export default LazyMedia;
