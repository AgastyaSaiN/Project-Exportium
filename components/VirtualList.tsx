import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useLayoutEffect, useRef, useState } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';

export interface VirtualListHandle {
    /** The scrolling element, for code that needs to read or set the scroll position directly. */
    element: HTMLDivElement | null;
    scrollToIndex: (index: number, align?: 'start' | 'center' | 'end') => void;
    scrollToBottom: () => void;
    scrollToTop: () => void;
}

interface VirtualListProps {
    count: number;
    renderRow: (index: number) => React.ReactNode;
    getRowKey: (index: number) => string | number;
    /** Rough row height used before a row has been measured. */
    estimateSize?: number;
    /** Space between rows, in px. */
    gap?: number;
    /** Changing this (e.g. selected chat, search text) jumps back to the newest row. */
    resetKey?: unknown;
    /** Start (and reset) at the newest row instead of the oldest. Defaults to true, as in a chat. */
    startAtBottom?: boolean;
    /** When set, a reset lands on this row (where the reader left off) instead of the newest. */
    startIndex?: number | null;
    className?: string;
    style?: React.CSSProperties;
    /** Classes for the centered column holding the rows. */
    contentClassName?: string;
    /**
     * Label (usually the date) for the row at the top of the view, shown in a pill that stays pinned
     * to the top while scrolling. Return undefined for rows that already show their own label.
     */
    getStickyLabel?: (index: number) => string | undefined;
    stickyClassName?: string;
    /** Label for any row, shown next to the timeline scrubber while dragging it. Enables the scrubber. */
    getScrubLabel?: (index: number) => string | undefined;
    /** Told (after the reader pauses) which row is at the top, to remember their place. */
    onFirstVisibleChange?: (index: number) => void;
}

const OVERSCAN = 8;
const SETTLE_FRAMES = 6;
/** How far from the ends (in screens) before the jump buttons appear. */
const JUMP_BUTTON_SCREENS = 1.5;

/**
 * A chat-style list that keeps only the rows near the viewport in the DOM, so an export with
 * hundreds of thousands of messages costs the same as one with fifty. Row heights are measured
 * as they render, so bubbles, images and wrapped text can be any size.
 */
const VirtualList = forwardRef<VirtualListHandle, VirtualListProps>(({
    count, renderRow, getRowKey, estimateSize = 80, gap = 4, resetKey, startAtBottom = true, startIndex,
    className, style, contentClassName, getStickyLabel, stickyClassName, getScrubLabel, onFirstVisibleChange,
}, ref) => {
    const scrollRef = useRef<HTMLDivElement>(null);
    // Cancels the "land on the right row" loop below once anything else takes over scrolling.
    const cancelSettle = useRef<() => void>(() => {});

    const virtualizer = useVirtualizer({
        count,
        getScrollElement: () => scrollRef.current,
        estimateSize: () => estimateSize,
        overscan: OVERSCAN,
        gap,
        getItemKey: getRowKey,
    });

    // Plain scrollTop rather than virtualizer.scrollToIndex: the latter keeps re-checking its target
    // for a while after it is called, which would pull the reader back if they scroll away.
    const scrollToBottom = useCallback(() => {
        const element = scrollRef.current;
        if (element) element.scrollTop = element.scrollHeight;
    }, []);
    const scrollToTop = useCallback(() => {
        const element = scrollRef.current;
        if (element) element.scrollTop = 0;
    }, []);

    useImperativeHandle(ref, () => ({
        get element() { return scrollRef.current; },
        scrollToIndex: (index, align = 'center') => {
            cancelSettle.current();
            // Nearby targets glide there so the reader keeps their bearings; far ones (a search hit
            // 100,000 messages back) cut straight to the place, since gliding would take forever.
            const element = scrollRef.current;
            const target = virtualizer.getOffsetForIndex(index, align)?.[0];
            const near = element !== null && target !== undefined && Math.abs(target - element.scrollTop) < element.clientHeight * 3;
            virtualizer.scrollToIndex(index, { align, behavior: near ? 'smooth' : 'auto' });
        },
        scrollToBottom,
        scrollToTop,
    }), [virtualizer, scrollToBottom, scrollToTop]);

    // Land on the right row whenever the content is replaced: the newest one, or where the reader
    // left off. Rows are measured after they render, which moves things, so re-assert it for a few
    // frames until it settles.
    useLayoutEffect(() => {
        if (count === 0) return;
        const element = scrollRef.current;
        if (!element) return;
        const wantsIndex = startIndex !== null && startIndex !== undefined && startIndex >= 0 && startIndex < count;
        if (!wantsIndex && !startAtBottom) return;
        let frames = 0;
        let raf = 0;
        let pinnedTop = -1;
        // Anything else that moves the scroll position (the reader, a jump) ends the pinning.
        const onScroll = () => { if (pinnedTop >= 0 && Math.abs(element.scrollTop - pinnedTop) > 4) stop(); };
        const stop = () => {
            cancelAnimationFrame(raf);
            frames = Infinity;
            element.removeEventListener('scroll', onScroll);
        };
        element.addEventListener('scroll', onScroll);
        cancelSettle.current = stop;
        const settle = () => {
            if (wantsIndex) {
                // The first frame runs before the virtualizer has hooked up to the scroll element, so
                // aim by the row estimate; later frames use its measured offsets to settle exactly.
                const offset = frames === 0
                    ? (startIndex as number) * (estimateSize + gap)
                    : virtualizer.getOffsetForIndex(startIndex as number, 'start')?.[0];
                if (offset !== undefined) element.scrollTop = offset;
            } else {
                scrollToBottom();
            }
            pinnedTop = element.scrollTop;
            if (++frames < SETTLE_FRAMES) raf = requestAnimationFrame(settle); else stop();
        };
        settle();
        return stop;
        // Only a new `resetKey` (or the first rows arriving) should re-run this; growth in `count`
        // from loading more must not yank the reader back.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [resetKey, count === 0]);

    const firstVisible = virtualizer.range?.startIndex;
    const stickyLabel = getStickyLabel && firstVisible !== undefined && firstVisible < count ? getStickyLabel(firstVisible) : undefined;

    // Remember the reader's place, but only once they stop moving.
    const reportRef = useRef(onFirstVisibleChange);
    reportRef.current = onFirstVisibleChange;
    useEffect(() => {
        if (firstVisible === undefined || !reportRef.current) return;
        const timer = setTimeout(() => reportRef.current?.(firstVisible), 600);
        return () => clearTimeout(timer);
    }, [firstVisible]);

    // Track the scroll position for the jump buttons and the scrubber.
    const [view, setView] = useState({ top: 0, height: 0, total: 0 });
    useEffect(() => {
        const element = scrollRef.current;
        if (!element) return;
        let raf = 0;
        const read = () => {
            raf = 0;
            setView(previous => {
                const next = { top: element.scrollTop, height: element.clientHeight, total: element.scrollHeight };
                return previous.top === next.top && previous.height === next.height && previous.total === next.total ? previous : next;
            });
        };
        const schedule = () => { if (!raf) raf = requestAnimationFrame(read); };
        element.addEventListener('scroll', schedule, { passive: true });
        const observer = new ResizeObserver(schedule);
        observer.observe(element);
        schedule();
        return () => { cancelAnimationFrame(raf); element.removeEventListener('scroll', schedule); observer.disconnect(); };
    }, []);

    const awayFromBottom = view.height > 0 && view.total - view.top - view.height > view.height * JUMP_BUTTON_SCREENS;
    const awayFromTop = view.height > 0 && view.top > view.height * JUMP_BUTTON_SCREENS;

    // Timeline scrubber: drag along the right edge to move through the whole history.
    const [scrub, setScrub] = useState<{ fraction: number } | null>(null);
    const scrubTo = (clientY: number, track: HTMLElement) => {
        const rect = track.getBoundingClientRect();
        const fraction = Math.min(1, Math.max(0, (clientY - rect.top) / Math.max(1, rect.height)));
        const element = scrollRef.current;
        if (element) {
            cancelSettle.current();
            element.scrollTop = fraction * Math.max(0, element.scrollHeight - element.clientHeight);
        }
        setScrub({ fraction });
    };
    const scrubIndex = scrub ? Math.min(count - 1, Math.max(0, Math.round(scrub.fraction * (count - 1)))) : 0;
    const scrubLabel = scrub && getScrubLabel ? getScrubLabel(scrubIndex) : undefined;
    const showScrubber = !!getScrubLabel && count > 1 && view.height > 0 && view.total > view.height * 2;
    const thumbFraction = view.total > view.height ? view.top / (view.total - view.height) : 0;

    return (
        <div
            ref={scrollRef}
            // The timeline slider stands in for the browser's own scrollbar, so two are never shown side by side.
            className={`${className ?? ''}${showScrubber ? ' ep-no-scrollbar' : ''}`}
            style={{ overflowY: 'auto', ...style }}
            onWheel={() => cancelSettle.current()}
            onTouchStart={() => cancelSettle.current()}
            onPointerDown={() => cancelSettle.current()}
        >
            <div className={contentClassName}>
                {stickyLabel && (
                    // Zero-height so it takes no room; sticky keeps it in view as the list scrolls under it.
                    <div style={{ position: 'sticky', top: 8, height: 0, zIndex: 5, display: 'flex', justifyContent: 'center', pointerEvents: 'none' }}>
                        <span
                            data-sticky-label
                            className={stickyClassName ?? 'bg-slate-200/95 dark:bg-slate-700/95 text-slate-600 dark:text-slate-200 text-xs font-semibold px-3 py-1 rounded-full shadow'}
                            style={{ height: 'fit-content' }}
                        >
                            {stickyLabel}
                        </span>
                    </div>
                )}
                {/* Overlays come before the rows and stick to the viewport: placed after them, their boxes would add scrollable space below the last message. */}
                {(awayFromBottom || awayFromTop) && (
                    <div style={{ position: 'sticky', top: Math.max(0, view.height - 14), height: 0, zIndex: 6, display: 'flex', justifyContent: 'flex-end', pointerEvents: 'none' }}>
                        <div className="flex flex-col gap-2 mr-1" style={{ transform: 'translateY(-100%)', pointerEvents: 'auto' }}>
                            {awayFromTop && (
                                <button type="button" aria-label="Jump to the start of the chat" title="Jump to the start" onClick={() => { cancelSettle.current(); scrollToTop(); }}
                                    className="w-10 h-10 rounded-full bg-white/95 dark:bg-slate-700/95 text-slate-700 dark:text-slate-100 shadow-lg border border-slate-200 dark:border-slate-600 hover:scale-105 transition-transform">↑</button>
                            )}
                            {awayFromBottom && (
                                <button type="button" aria-label="Jump to the latest message" title="Jump to the latest" onClick={() => { cancelSettle.current(); scrollToBottom(); }}
                                    className="w-10 h-10 rounded-full bg-white/95 dark:bg-slate-700/95 text-slate-700 dark:text-slate-100 shadow-lg border border-slate-200 dark:border-slate-600 hover:scale-105 transition-transform">↓</button>
                            )}
                        </div>
                    </div>
                )}
                {showScrubber && (
                    <div style={{ position: 'sticky', top: 0, height: 0, zIndex: 6, pointerEvents: 'none' }}>
                        <div
                            data-scrubber
                            role="slider"
                            aria-label="Timeline"
                            aria-valuemin={0}
                            aria-valuemax={100}
                            aria-valuenow={Math.round(thumbFraction * 100)}
                            className="group/scrub"
                            style={{ position: 'absolute', right: 0, top: 12, width: 22, height: Math.max(40, view.height - 24), pointerEvents: 'auto', touchAction: 'none', cursor: 'ns-resize' }}
                            onPointerDown={(event) => { event.currentTarget.setPointerCapture(event.pointerId); scrubTo(event.clientY, event.currentTarget); }}
                            onPointerMove={(event) => { if (event.buttons) scrubTo(event.clientY, event.currentTarget); }}
                            onPointerUp={() => setScrub(null)}
                            onPointerCancel={() => setScrub(null)}
                        >
                            <div className={`absolute right-1 top-0 bottom-0 w-1.5 rounded-full bg-slate-400/30 transition-opacity ${scrub ? 'opacity-100 bg-slate-400/50' : 'opacity-100 group-hover/scrub:bg-slate-400/50'}`} />
                            <div
                                className={`absolute right-0 w-3.5 h-3.5 rounded-full bg-sky-500 shadow transition-opacity ${scrub ? 'opacity-100' : 'opacity-70 group-hover/scrub:opacity-100'}`}
                                style={{ top: `calc(${thumbFraction * 100}% - 7px)` }}
                            />
                            {scrub && scrubLabel && (
                                <div
                                    className="absolute right-6 px-3 py-1 rounded-md bg-slate-900/90 text-white text-xs font-semibold whitespace-nowrap shadow-lg"
                                    style={{ top: `calc(${scrub.fraction * 100}% - 14px)` }}
                                >
                                    {scrubLabel}
                                </div>
                            )}
                        </div>
                    </div>
                )}
                <div data-virtual-sizer style={{ height: virtualizer.getTotalSize(), position: 'relative', width: '100%' }}>
                    {virtualizer.getVirtualItems().map(item => (
                        <div
                            key={item.key}
                            data-index={item.index}
                            ref={virtualizer.measureElement}
                            // A column flex container, like the plain list this replaces: rows can shrink-wrap
                            // (`self-start`) or push to the right (`self-end`) instead of filling the width.
                            style={{ position: 'absolute', top: 0, left: 0, width: '100%', transform: `translateY(${item.start}px)`, display: 'flex', flexDirection: 'column' }}
                        >
                            {renderRow(item.index)}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
});

VirtualList.displayName = 'VirtualList';
export default VirtualList;
