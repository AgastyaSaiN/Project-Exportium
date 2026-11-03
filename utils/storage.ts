import { useCallback, useEffect, useRef, useState } from 'react';

const PREFIX = 'exportium:';

/** localStorage can be blocked or full; reading and writing must never take the app down. */
export const readJson = <T,>(key: string, fallback: T): T => {
    try {
        const raw = window.localStorage.getItem(PREFIX + key);
        return raw === null ? fallback : (JSON.parse(raw) as T);
    } catch {
        return fallback;
    }
};

export const writeJson = (key: string, value: unknown): void => {
    try {
        window.localStorage.setItem(PREFIX + key, JSON.stringify(value));
    } catch {
        // Out of space or storage disabled: the setting simply is not remembered.
    }
};

export const removeKey = (key: string): void => {
    try { window.localStorage.removeItem(PREFIX + key); } catch { /* nothing to remove */ }
};

/** useState that survives restarts. */
export const usePersistentState = <T,>(key: string, initial: T): [T, (value: T | ((previous: T) => T)) => void] => {
    const [value, setValue] = useState<T>(() => readJson(key, initial));
    const set = useCallback((next: T | ((previous: T) => T)) => {
        setValue(previous => {
            const resolved = typeof next === 'function' ? (next as (p: T) => T)(previous) : next;
            writeJson(key, resolved);
            return resolved;
        });
    }, [key]);
    return [value, set];
};

/**
 * Identifies an export between sessions without storing its path: the same file picked again has
 * the same name, size and modified time, so what you set up for it (who you are, starred messages,
 * where you stopped reading) is found again.
 */
export const exportKeyFor = (platform: string, file: { name: string; size: number; lastModified: number }): string =>
    `${platform}:${file.name}:${file.size}:${file.lastModified}`;

export interface ExportPrefs {
    /** Who "you" are, by name, per chat. */
    owner?: Record<string, string>;
    alignment?: Record<string, string>;
    chatTheme?: Record<string, string>;
    /** Built-in wallpaper (`wp:<id>`) per chat; an uploaded image is not saved. */
    wallpaper?: Record<string, string>;
    showAvatars?: boolean;
    /** Starred message ids per chat. */
    stars?: Record<string, string[]>;
    /** The message each chat was last read up to, per chat. */
    positions?: Record<string, string>;
}

const prefsKey = (exportKey: string) => `prefs:${exportKey}`;

/**
 * Per-export settings, remembered between sessions. With no key (an export we cannot identify)
 * it still works, it just forgets everything on exit.
 */
export const useExportPrefs = (exportKey?: string): [ExportPrefs, (change: (current: ExportPrefs) => ExportPrefs) => void] => {
    const [prefs, setPrefs] = useState<ExportPrefs>(() => (exportKey ? readJson<ExportPrefs>(prefsKey(exportKey), {}) : {}));
    const keyRef = useRef(exportKey);

    useEffect(() => {
        keyRef.current = exportKey;
        setPrefs(exportKey ? readJson<ExportPrefs>(prefsKey(exportKey), {}) : {});
    }, [exportKey]);

    const update = useCallback((change: (current: ExportPrefs) => ExportPrefs) => {
        setPrefs(current => {
            const next = change(current);
            if (keyRef.current) writeJson(prefsKey(keyRef.current), next);
            return next;
        });
    }, []);

    return [prefs, update];
};

/** Exports opened recently, newest first, shown on the start screen. */
export interface RecentExport {
    platform: string;
    name: string;
    size: number;
    lastModified: number;
    openedAt: number;
    /** Where the file lives, when the desktop app can reopen it without asking again. */
    path?: string;
}

const MAX_RECENTS = 8;
const recentKeyOf = (r: Pick<RecentExport, 'platform' | 'name' | 'size' | 'lastModified'>) => `${r.platform}:${r.name}:${r.size}:${r.lastModified}`;

export const readRecents = (): RecentExport[] => readJson<RecentExport[]>('recents', []);

export const rememberRecent = (entry: Omit<RecentExport, 'openedAt'>): void => {
    const next: RecentExport = { ...entry, openedAt: Date.now() };
    const rest = readRecents().filter(r => recentKeyOf(r) !== recentKeyOf(next));
    writeJson('recents', [next, ...rest].slice(0, MAX_RECENTS));
};

export const forgetRecent = (entry: RecentExport): void => {
    writeJson('recents', readRecents().filter(r => recentKeyOf(r) !== recentKeyOf(entry)));
};
