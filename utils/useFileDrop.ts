import { useEffect, useRef, useState } from 'react';

const carriesFiles = (event: DragEvent) => Array.from(event.dataTransfer?.types ?? []).includes('Files');

/**
 * Lets the user drop files anywhere on the window. Returns whether a drag is in progress so the
 * page can show a drop hint. Dropping is ignored while `enabled` is false.
 */
export const useFileDrop = (onFiles: (files: File[]) => void, enabled = true): boolean => {
    const [dragging, setDragging] = useState(false);
    const handler = useRef(onFiles);
    handler.current = onFiles;

    useEffect(() => {
        if (!enabled) { setDragging(false); return; }
        let depth = 0;
        const enter = (event: DragEvent) => { if (!carriesFiles(event)) return; event.preventDefault(); depth++; setDragging(true); };
        const over = (event: DragEvent) => { if (carriesFiles(event)) event.preventDefault(); };
        const leave = (event: DragEvent) => { if (!carriesFiles(event)) return; depth = Math.max(0, depth - 1); if (depth === 0) setDragging(false); };
        const drop = (event: DragEvent) => {
            if (!carriesFiles(event)) return;
            event.preventDefault();
            depth = 0;
            setDragging(false);
            const files = Array.from(event.dataTransfer?.files ?? []);
            if (files.length > 0) handler.current(files);
        };
        window.addEventListener('dragenter', enter);
        window.addEventListener('dragover', over);
        window.addEventListener('dragleave', leave);
        window.addEventListener('drop', drop);
        return () => {
            window.removeEventListener('dragenter', enter);
            window.removeEventListener('dragover', over);
            window.removeEventListener('dragleave', leave);
            window.removeEventListener('drop', drop);
        };
    }, [enabled]);

    return dragging;
};
