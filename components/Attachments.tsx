import React, { useState } from 'react';
import type { MediaSource } from '../utils/mediaLoader';
import { fileNameFor, saveMedia } from '../utils/saveMedia';

const DocumentIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 flex-shrink-0" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>
);

interface AttachmentChipProps {
    uri: string;
    name?: string;
    media: MediaSource;
    /** Shown under the name, e.g. "PDF" or "Voice note". */
    kind?: string;
}

/** A file that is not a picture: shows its name and saves the original on click. */
export const AttachmentChip: React.FC<AttachmentChipProps> = ({ uri, name, media, kind }) => {
    const [state, setState] = useState<'idle' | 'saving' | 'missing'>('idle');
    const label = name || fileNameFor(uri);

    const save = async () => {
        setState('saving');
        const ok = await saveMedia(media, uri, label);
        setState(ok ? 'idle' : 'missing');
    };

    return (
        <button
            type="button"
            onClick={(e) => { e.stopPropagation(); void save(); }}
            title={state === 'missing' ? 'This file is not in the export' : `Save ${label}`}
            className="self-start max-w-full flex items-center gap-3 px-3 py-2 rounded-lg bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20 text-left transition-colors"
        >
            <DocumentIcon />
            <span className="min-w-0">
                <span className="block text-sm font-semibold truncate">{label}</span>
                <span className="block text-xs opacity-70">
                    {state === 'missing' ? 'Not included in this export' : state === 'saving' ? 'Saving...' : `${kind ?? 'File'} · click to save`}
                </span>
            </span>
        </button>
    );
};

const OMITTED_LABEL: Record<string, string> = {
    photo: 'Photo', video: 'Video', audio: 'Voice message', sticker: 'Sticker', document: 'File', media: 'Attachment', gif: 'GIF',
};

/** Placeholder for something the export left out ("Without media" exports), so the gap is visible instead of silent. */
export const OmittedNote: React.FC<{ kind: string }> = ({ kind }) => (
    <div className="self-start flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed border-current/30 text-sm opacity-70 italic">
        <DocumentIcon />
        {OMITTED_LABEL[kind] ?? 'Attachment'} not included in this export
    </div>
);
