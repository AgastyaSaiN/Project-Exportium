import { describe, it, expect } from 'vitest';
import JSZip from 'jszip';
import { parseTelegramArchive } from '../pages/apps/telegram/parser';

const exportJson = {
    about: 'Here is your Telegram data',
    personal_information: { user_id: 42 },
    chats: {
        list: [
            {
                id: 1, name: 'Sam', type: 'personal_chat',
                messages: [
                    { id: 1, type: 'message', date: '2023-03-12T10:00:00', date_unixtime: '1678615200', from: 'Sam', from_id: 'user7', text: 'hi' },
                    { id: 2, type: 'message', date: '2023-03-12T10:01:00', date_unixtime: '1678615260', from: 'Me', from_id: 'user42', text: [{ type: 'bold', text: 'yo' }], photo: 'photos/a.jpg' },
                ],
            },
        ],
    },
};

const zipFile = async (files: Record<string, string>) => {
    const zip = new JSZip();
    for (const [name, body] of Object.entries(files)) zip.file(name, body);
    return new File([await zip.generateAsync({ type: 'blob' })], 'export.zip', { type: 'application/zip' });
};

describe('parseTelegramArchive', () => {
    it('parses a bare result.json file', async () => {
        const file = new File([JSON.stringify(exportJson)], 'result.json', { type: 'application/json' });
        const out = await parseTelegramArchive(file, () => {});
        expect(out.chats).toHaveLength(1);
        expect(out.chats[0].messages).toHaveLength(2);
        expect(out.ownerId).toBe('user42');
    });

    it('parses result.json inside a zip', async () => {
        const out = await parseTelegramArchive(await zipFile({ 'ChatExport/result.json': JSON.stringify(exportJson) }), () => {});
        expect(out.chats[0].name).toBe('Sam');
    });

    it('explains HTML exports instead of crashing', async () => {
        await expect(parseTelegramArchive(await zipFile({ 'messages.html': '<html></html>' }), () => {}))
            .rejects.toThrow(/HTML export/i);
    });

    it('reports corrupt JSON', async () => {
        const file = new File(['{ not json'], 'result.json');
        await expect(parseTelegramArchive(file, () => {})).rejects.toThrow(/corrupt|parse/i);
    });
});

describe('Telegram attachments in real exports', () => {
    it('turns `file` + `media_type` into the fields the viewer shows', async () => {
        const { withAttachmentFields } = await import('../pages/apps/telegram/chats');
        const base = { id: 1, type: 'message', date: '2023-01-01T00:00:00', date_unixtime: '1', from: 'Sam', from_id: 'user7', text: '' };
        expect(withAttachmentFields({ ...base, file: 'video_files/a.mp4', media_type: 'video_file' }).video_file).toBe('video_files/a.mp4');
        expect(withAttachmentFields({ ...base, file: 'voice_messages/a.ogg', media_type: 'voice_message' }).voice_message).toBe('voice_messages/a.ogg');
        expect(withAttachmentFields({ ...base, file: 'files/a.mp3', media_type: 'audio_file' }).audio_file).toBe('files/a.mp3');
        expect(withAttachmentFields({ ...base, file: 'stickers/a.webp', media_type: 'sticker' }).sticker_file).toBe('stickers/a.webp');
        expect(withAttachmentFields({ ...base, file: 'files/report.pdf', file_name: 'report.pdf' }).document_file).toBe('files/report.pdf');
        // photos keep their own field and are not duplicated
        expect(withAttachmentFields({ ...base, photo: 'photos/a.jpg', file: 'photos/a.jpg' }).document_file).toBeUndefined();
    });
});
