import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, act, waitFor } from '@testing-library/react';
import VirtualList, { VirtualListHandle } from '../components/VirtualList';

const rowIds = (container: HTMLElement) =>
    Array.from(container.querySelectorAll('[data-row]')).map(el => Number(el.getAttribute('data-row')));

const renderList = (count: number, ref?: React.Ref<VirtualListHandle>, resetKey: unknown = 'a') =>
    render(
        <VirtualList
            ref={ref}
            count={count}
            resetKey={resetKey}
            getRowKey={(i) => i}
            renderRow={(i) => <div data-row={i}>row {i}</div>}
            className="h-full"
        />
    );

describe('VirtualList', () => {
    it('keeps the DOM small no matter how many rows there are, starting at the newest', () => {
        const { container } = renderList(200_000);
        const ids = rowIds(container);
        expect(ids.length).toBeGreaterThan(0);
        expect(ids.length).toBeLessThan(60);
        expect(Math.max(...ids)).toBe(199_999);
    });

    it('can jump to any row, including very old ones', async () => {
        const ref = React.createRef<VirtualListHandle>();
        const { container } = renderList(50_000, ref);
        await act(async () => { ref.current!.scrollToIndex(120, 'center'); });
        const ids = rowIds(container);
        expect(ids).toContain(120);
        expect(ids.length).toBeLessThan(60);
    });

    it('returns to the newest row when the reset key changes', async () => {
        const ref = React.createRef<VirtualListHandle>();
        const { container, rerender } = renderList(10_000, ref, 'chat-1');
        await act(async () => { ref.current!.scrollToIndex(5, 'start'); });
        expect(rowIds(container)).toContain(5);
        rerender(
            <VirtualList ref={ref} count={10_000} resetKey="chat-2" getRowKey={(i) => i} renderRow={(i) => <div data-row={i}>row {i}</div>} className="h-full" />
        );
        await act(async () => { await new Promise(r => setTimeout(r, 50)); });
        expect(Math.max(...rowIds(container))).toBe(9_999);
    });

    it('renders nothing for an empty list without crashing', () => {
        const { container } = renderList(0);
        expect(rowIds(container)).toEqual([]);
    });
});

describe('VirtualGrid', () => {
    it('keeps a 50,000-photo gallery to a few dozen tiles', async () => {
        const { default: VirtualGrid } = await import('../components/VirtualGrid');
        const { container } = render(
            <VirtualGrid className="h-full" count={50_000} getCellKey={(i) => i} renderCell={(i) => <div data-tile={i}>tile {i}</div>} />
        );
        const tiles = container.querySelectorAll('[data-tile]');
        expect(tiles.length).toBeGreaterThan(0);
        expect(tiles.length).toBeLessThan(150);
        expect(container.querySelector('[data-tile="0"]')).not.toBeNull();
    });

    it('handles a short last row and an empty grid', async () => {
        const { default: VirtualGrid } = await import('../components/VirtualGrid');
        const { container } = render(<VirtualGrid count={7} getCellKey={(i) => i} renderCell={(i) => <div data-tile={i} />} />);
        expect(container.querySelectorAll('[data-tile]').length).toBe(7);
        const empty = render(<VirtualGrid count={0} getCellKey={(i) => i} renderCell={(i) => <div data-tile={i} />} />);
        expect(empty.container.querySelectorAll('[data-tile]').length).toBe(0);
    });
});

describe('VirtualList sticky label', () => {
    const dayOf = (i: number) => `Day ${Math.floor(i / 10)}`;

    it('shows the day of the row at the top of the view and updates as you scroll', async () => {
        const ref = React.createRef<VirtualListHandle>();
        const { container } = render(
            <VirtualList
                ref={ref}
                count={1000}
                resetKey="a"
                getRowKey={(i) => i}
                getStickyLabel={(i) => dayOf(i)}
                renderRow={(i) => <div data-row={i}>row {i}</div>}
                className="h-full"
            />
        );
        const label = () => container.querySelector('[data-sticky-label]')?.textContent;
        // starts at the newest messages (top of the view is somewhere near row 992)
        await waitFor(() => expect(label()).toMatch(/^Day 9[89]$/));
        await act(async () => { ref.current!.scrollToIndex(0, 'start'); });
        await waitFor(() => expect(label()).toBe('Day 0'));
    });

    it('hides the pill when the top row returns no label (it already shows its own)', async () => {
        const { container } = render(
            <VirtualList count={50} resetKey="a" startAtBottom={false} getRowKey={(i) => i} getStickyLabel={() => undefined} renderRow={(i) => <div>row {i}</div>} className="h-full" />
        );
        expect(container.querySelector('[data-sticky-label]')).toBeNull();
    });
});
