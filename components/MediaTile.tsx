import React from 'react';
import LazyMedia from './LazyMedia';
import type { MediaSource } from '../utils/mediaLoader';

interface MediaTileProps {
    uri: string;
    kind: 'image' | 'video';
    media: MediaSource;
    /** Jump from the gallery to this picture's message in the chat. */
    onShowInChat: () => void;
}

/**
 * One square in a photo gallery. Clicking a photo opens it full-size (see Lightbox); a small
 * button on hover goes to the message it was sent in.
 */
const MediaTile: React.FC<MediaTileProps> = ({ uri, kind, media, onShowInChat }) => (
    <div className="aspect-square bg-slate-200 dark:bg-slate-800 rounded-md overflow-hidden relative group">
        <LazyMedia uri={uri} media={media} kind={kind} className="w-full h-full object-cover" />
        <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onShowInChat(); }}
            className="absolute bottom-1.5 left-1.5 px-2 py-1 text-xs font-semibold rounded-md bg-black/60 text-white opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
        >
            Show in chat
        </button>
    </div>
);

export default MediaTile;
