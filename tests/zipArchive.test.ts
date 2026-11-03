// @vitest-environment node
import { describe, it, expect } from 'vitest';
import JSZip from 'jszip';
import { openZip } from '../utils/zipArchive';

const zipOf = async (files: Record<string, string | Uint8Array>, compression: 'STORE' | 'DEFLATE' = 'DEFLATE') => {
    const zip = new JSZip();
    for (const [name, body] of Object.entries(files)) zip.file(name, body);
    zip.folder('empty_dir');
    return new File([await zip.generateAsync({ type: 'blob', compression })], 'test.zip');
};

describe('openZip', () => {
    it.each(['STORE', 'DEFLATE'] as const)('reads text and binary entries (%s)', async (compression) => {
        const bytes = new Uint8Array([0, 1, 2, 250, 251, 252]);
        const archive = await openZip(await zipOf({ 'a/hello.txt': 'héllo wörld', 'a/photo.jpg': bytes }, compression));
        expect(await archive.file('a/hello.txt')!.async('string')).toBe('héllo wörld');
        const blob = await archive.file('a/photo.jpg')!.async('blob');
        expect(blob.type).toBe('image/jpeg');
        expect(new Uint8Array(await blob.arrayBuffer())).toEqual(bytes);
    });

    it('looks files up by path and by pattern, and skips folders', async () => {
        const archive = await openZip(await zipOf({ 'x/message_1.json': '{}', 'x/message_2.json': '{}', 'y/other.txt': 'z' }));
        expect(archive.file('x/message_1.json')?.name).toBe('x/message_1.json');
        expect(archive.file('missing')).toBeNull();
        expect(archive.file('empty_dir/')).toBeNull();
        expect(archive.file(/message_\d+\.json$/).map(f => f.name).sort()).toEqual(['x/message_1.json', 'x/message_2.json']);
        expect(archive.files['empty_dir/'].dir).toBe(true);
    });

    it('handles archives with thousands of entries and reads any single one on demand', async () => {
        const files: Record<string, string> = {};
        for (let i = 0; i < 5000; i++) files[`media/${i}.txt`] = `content ${i}`;
        const archive = await openZip(await zipOf(files));
        expect(Object.keys(archive.files).length).toBeGreaterThanOrEqual(5000);
        expect(await archive.file('media/4321.txt')!.async('string')).toBe('content 4321');
    });

    it('rejects data that is not a zip', async () => {
        await expect(openZip(new File(['definitely not a zip'], 'x.zip'))).rejects.toThrow();
    });
});
