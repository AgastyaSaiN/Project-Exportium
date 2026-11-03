import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

// jsdom has no layout engine, so the browser APIs the viewers rely on are simulated here:
// a 600px-tall scroll viewport, ResizeObserver (used by the virtual list to measure rows),
// IntersectionObserver (lazy media) and a scrollTop that actually stores a value.
const VIEWPORT_HEIGHT = 600;
const VIEWPORT_WIDTH = 900;
const ROW_HEIGHT = 80;

class FakeIntersectionObserver {
    // Everything counts as on screen, so lazily loaded media loads as soon as it mounts.
    constructor(private cb?: IntersectionObserverCallback) {}
    observe(target?: Element) { this.cb?.([{ isIntersecting: true, target } as unknown as IntersectionObserverEntry], this as unknown as IntersectionObserver); }
    unobserve() {}
    disconnect() {}
    takeRecords() { return []; }
}
vi.stubGlobal('IntersectionObserver', FakeIntersectionObserver);

class FakeResizeObserver {
    constructor(private callback: ResizeObserverCallback) {}
    observe(target: Element) {
        const entry = {
            target,
            contentRect: { width: VIEWPORT_WIDTH, height: VIEWPORT_HEIGHT, top: 0, left: 0, right: VIEWPORT_WIDTH, bottom: VIEWPORT_HEIGHT, x: 0, y: 0 },
            borderBoxSize: [{ inlineSize: VIEWPORT_WIDTH, blockSize: target.hasAttribute('data-index') ? ROW_HEIGHT : VIEWPORT_HEIGHT }],
            contentBoxSize: [{ inlineSize: VIEWPORT_WIDTH, blockSize: target.hasAttribute('data-index') ? ROW_HEIGHT : VIEWPORT_HEIGHT }],
            devicePixelContentBoxSize: [],
        } as unknown as ResizeObserverEntry;
        this.callback([entry], this as unknown as ResizeObserver);
    }
    unobserve() {}
    disconnect() {}
}
vi.stubGlobal('ResizeObserver', FakeResizeObserver);

if (typeof Element !== 'undefined') {
    Element.prototype.scrollIntoView = vi.fn();

    const scrollTops = new WeakMap<Element, number>();
    Object.defineProperty(Element.prototype, 'scrollTop', {
        configurable: true,
        get() { return scrollTops.get(this) ?? 0; },
        set(value: number) {
            scrollTops.set(this, value);
            this.dispatchEvent(new Event('scroll'));
        },
    });
    Element.prototype.scrollTo = function (this: Element, arg?: ScrollToOptions | number) {
        scrollTops.set(this, typeof arg === 'object' ? (arg.top ?? 0) : 0);
        this.dispatchEvent(new Event('scroll'));
    } as typeof Element.prototype.scrollTo;

    const rowOrViewport = (el: HTMLElement) => (el.hasAttribute('data-index') ? ROW_HEIGHT : VIEWPORT_HEIGHT);
    Object.defineProperty(HTMLElement.prototype, 'offsetHeight', { configurable: true, get() { return rowOrViewport(this); } });
    Object.defineProperty(HTMLElement.prototype, 'offsetWidth', { configurable: true, get() { return VIEWPORT_WIDTH; } });
    Object.defineProperty(HTMLElement.prototype, 'clientHeight', { configurable: true, get() { return rowOrViewport(this); } });
    Object.defineProperty(HTMLElement.prototype, 'clientWidth', { configurable: true, get() { return VIEWPORT_WIDTH; } });
    // The virtual list's scroll height is the explicit height of its sizer element.
    Object.defineProperty(HTMLElement.prototype, 'scrollHeight', {
        configurable: true,
        get() {
            const sizer = this.querySelector?.('[data-virtual-sizer]') as HTMLElement | null | undefined;
            return parseFloat(sizer?.style?.height ?? '') || rowOrViewport(this);
        },
    });
    HTMLElement.prototype.getBoundingClientRect = function (this: HTMLElement) {
        const height = rowOrViewport(this);
        return { width: VIEWPORT_WIDTH, height, top: 0, left: 0, right: VIEWPORT_WIDTH, bottom: height, x: 0, y: 0, toJSON() {} };
    };
}

afterEach(() => cleanup());
