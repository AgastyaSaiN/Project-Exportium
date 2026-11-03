import { describe, it, expect, beforeEach } from 'vitest';
import { exportKeyFor, forgetRecent, readJson, readRecents, rememberRecent, writeJson } from '../utils/storage';
import { folderExportKey } from '../utils/recentFiles';

beforeEach(() => window.localStorage.clear());

describe('storage', () => {
    it('round-trips JSON and falls back when nothing (or garbage) is stored', () => {
        expect(readJson('missing', 7)).toBe(7);
        writeJson('x', { a: 1 });
        expect(readJson('x', null)).toEqual({ a: 1 });
        window.localStorage.setItem('exportium:bad', '{not json');
        expect(readJson('bad', 'fallback')).toBe('fallback');
    });

    it('survives storage being unavailable', () => {
        const original = Storage.prototype.setItem;
        Storage.prototype.setItem = () => { throw new Error('quota'); };
        expect(() => writeJson('x', 1)).not.toThrow();
        Storage.prototype.setItem = original;
    });

    it('identifies the same file by name, size and modified time', () => {
        const file = { name: 'chat.zip', size: 10, lastModified: 5 };
        expect(exportKeyFor('whatsapp', file)).toBe(exportKeyFor('whatsapp', { ...file }));
        expect(exportKeyFor('whatsapp', file)).not.toBe(exportKeyFor('whatsapp', { ...file, size: 11 }));
        expect(exportKeyFor('whatsapp', file)).not.toBe(exportKeyFor('telegram', file));
    });

    it('keeps the most recent exports first, without duplicates, capped', () => {
        for (let i = 0; i < 12; i++) rememberRecent({ platform: 'telegram', name: `e${i}.zip`, size: i, lastModified: i, path: `C:/e${i}.zip` });
        rememberRecent({ platform: 'telegram', name: 'e11.zip', size: 11, lastModified: 11, path: 'C:/e11.zip' });
        const recents = readRecents();
        expect(recents).toHaveLength(8);
        expect(recents[0].name).toBe('e11.zip');
        expect(new Set(recents.map(r => r.name)).size).toBe(8);
        forgetRecent(recents[0]);
        expect(readRecents()[0].name).toBe('e10.zip');
    });

    it('gives a folder export a stable key from its top folder and size', () => {
        const file = (path: string) => Object.assign(new File(['x'], 'a'), { webkitRelativePath: path });
        expect(folderExportKey('instagram', [file('inbox/chat_1/a.json'), file('inbox/chat_1/b.jpg')])).toBe('instagram:folder:inbox:2');
    });
});
