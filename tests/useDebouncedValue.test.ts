import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDebouncedValue } from '../utils/useDebouncedValue';

describe('useDebouncedValue', () => {
    it('only updates after the value stops changing', () => {
        vi.useFakeTimers();
        const { result, rerender } = renderHook(({ v }) => useDebouncedValue(v, 200), { initialProps: { v: 'a' } });
        rerender({ v: 'ab' });
        rerender({ v: 'abc' });
        act(() => { vi.advanceTimersByTime(150); });
        expect(result.current).toBe('a');
        act(() => { vi.advanceTimersByTime(100); });
        expect(result.current).toBe('abc');
        vi.useRealTimers();
    });
});
