import { describe, it, expect } from 'vitest';
import JSZip from 'jszip';
import { parseSnapchatArchive } from '../pages/apps/snapchat/parser';

const makeZip = async (files: Record<string, string>) => {
    const zip = new JSZip();
    for (const [name, body] of Object.entries(files)) zip.file(name, body);
    return new File([await zip.generateAsync({ type: 'blob' })], 'mydata.zip', { type: 'application/zip' });
};

describe('parseSnapchatArchive', () => {
    it('parses chat_history.json and detects the owner', async () => {
        const history = {
            'Sent Chat History': [
                { From: 'me', To: 'sam', Created: '2023-03-12 10:00:00 UTC', Text: 'hey', 'Media Type': 'TEXT' },
                { From: 'me', To: 'sam', Created: '2023-03-12 10:01:00 UTC', Text: 'you there?', 'Media Type': 'TEXT' },
            ],
            'Received Chat History': [
                { From: 'sam', To: 'me', Created: '2023-03-12 10:02:00 UTC', Text: 'yep', 'Media Type': 'TEXT' },
            ],
        };
        const out = await parseSnapchatArchive(await makeZip({ 'json/chat_history.json': JSON.stringify(history) }), () => {});
        expect(out.owner).toBe('me');
        expect(out.chats).toHaveLength(1);
        expect(out.chats[0].messages).toHaveLength(3);
    });

    it('tells users who uploaded the HTML export what to do', async () => {
        await expect(parseSnapchatArchive(await makeZip({ 'html/chat_history.html': '<html/>' }), () => {}))
            .rejects.toThrow(/HTML export/i);
    });

    it('rejects archives without chat history', async () => {
        await expect(parseSnapchatArchive(await makeZip({ 'readme.txt': 'x' }), () => {}))
            .rejects.toThrow(/chat_history\.json/);
    });

    it('rejects files that are not zips', async () => {
        await expect(parseSnapchatArchive(new File(['nope'], 'mydata.zip'), () => {}))
            .rejects.toThrow(/valid zip/i);
    });
});
