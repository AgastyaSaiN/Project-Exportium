import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';

interface VirtualGridProps {
    count: number;
    /** Renders the contents of one square cell. */
    renderCell: (index: number) => React.ReactNode;
    getCellKey: (index: number) => string | number;
    /** Cells are at least this wide (px); the grid fits as many columns as it can. */
    minCellWidth?: number;
    gap?: number;
    className?: string;
    /** Where to start, and how to hear about scrolling, so leaving and returning keeps the place. */
    initialScrollTop?: number;
    onScrollTopChange?: (scrollTop: number) => void;
}

/**
 * A scrolling grid of square tiles (a photo gallery) that only keeps the visible rows in the
 * DOM. Without this a chat with 20,000 photos creates 20,000 tiles the moment the Media tab opens.
 */
const VirtualGrid: React.FC<VirtualGridProps> = ({ count, renderCell, getCellKey, minCellWidth = 140, gap = 8, className, initialScrollTop = 0, onScrollTopChange }) => {
    const scrollRef = useRef<HTMLDivElement>(null);
    const [width, setWidth] = useState(0);

    useLayoutEffect(() => {
        const node = scrollRef.current;
        if (!node) return;
        setWidth(node.clientWidth);
        const observer = new ResizeObserver(() => setWidth(node.clientWidth));
        observer.observe(node);
        return () => observer.disconnect();
    }, []);

    const columns = Math.max(2, Math.floor((width + gap) / (minCellWidth + gap)));
    const cellSize = width > 0 ? (width - gap * (columns - 1)) / columns : minCellWidth;
    const rowCount = Math.ceil(count / columns);
    const rowHeight = cellSize + gap;

    const virtualizer = useVirtualizer({
        count: rowCount,
        getScrollElement: () => scrollRef.current,
        estimateSize: () => rowHeight,
        overscan: 4,
    });

    // Restore the saved position once the grid has a size, and report scrolling .
    const restored = useRef(false);
    useEffect(() => {
        const node = scrollRef.current;
        if (!node || width === 0 || restored.current) return;
        restored.current = true;
        if (initialScrollTop > 0) node.scrollTop = initialScrollTop;
    }, [width, initialScrollTop]);
    // One listener for the grid's lifetime that always calls the latest callback. Re-subscribing on
    // every render (the callback is a new function each time) could drop a pending position update.
    const reportScroll = useRef(onScrollTopChange);
    reportScroll.current = onScrollTopChange;
    useEffect(() => {
        const node = scrollRef.current;
        if (!node) return;
        const onScroll = () => reportScroll.current?.(node.scrollTop);
        node.addEventListener('scroll', onScroll, { passive: true });
        return () => node.removeEventListener('scroll', onScroll);
    }, []);

    // Row height changes with the window width: drop cached measurements.
    useEffect(() => { virtualizer.measure(); }, [rowHeight, virtualizer]);

    return (
        <div ref={scrollRef} className={className} style={{ overflowY: 'auto' }}>
            <div style={{ height: virtualizer.getTotalSize(), position: 'relative', width: '100%' }}>
                {virtualizer.getVirtualItems().map(row => {
                    const first = row.index * columns;
                    const cells = Math.min(columns, count - first);
                    return (
                        <div
                            key={row.key}
                            style={{
                                position: 'absolute', top: 0, left: 0, width: '100%', height: cellSize,
                                transform: `translateY(${row.start}px)`,
                                display: 'grid', gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`, gap,
                            }}
                        >
                            {Array.from({ length: cells }, (_, i) => (
                                <div key={getCellKey(first + i)} style={{ minWidth: 0 }}>{renderCell(first + i)}</div>
                            ))}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default VirtualGrid;
