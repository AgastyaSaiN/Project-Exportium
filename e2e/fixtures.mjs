// Generators for the synthetic exports the end-to-end test imports. Nothing here needs network
// access or real personal data; everything is built from counters.
import { deflateSync, crc32 } from 'node:zlib';
import { createWriteStream } from 'node:fs';
import { once } from 'node:events';
import JSZip from 'jszip';

/** A valid solid-colour PNG. Large dimensions compress to a few KB but decode to megabytes. */
export const makePng = (width, height, [r, g, b] = [200, 80, 120]) => {
    const row = Buffer.alloc(1 + width * 3);
    for (let x = 0; x < width; x++) { row[1 + x * 3] = r; row[2 + x * 3] = g; row[3 + x * 3] = b; }
    const raw = Buffer.concat(Array.from({ length: height }, () => row));
    const chunk = (type, data) => {
        const body = Buffer.concat([Buffer.from(type), data]);
        const out = Buffer.alloc(12 + data.length);
        out.writeUInt32BE(data.length, 0);
        body.copy(out, 4);
        out.writeUInt32BE(crc32(body), 8 + data.length);
        return out;
    };
    const header = Buffer.alloc(13);
    header.writeUInt32BE(width, 0);
    header.writeUInt32BE(height, 4);
    header[8] = 8; header[9] = 2; // 8-bit RGB
    return Buffer.concat([
        Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
        chunk('IHDR', header),
        chunk('IDAT', deflateSync(raw)),
        chunk('IEND', Buffer.alloc(0)),
    ]);
};

export const whatsappText = (count) => {
    const lines = new Array(count);
    for (let i = 0; i < count; i++) {
        const d = new Date(2020, 0, 1 + Math.floor(i / 400));
        const date = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
        lines[i] = `${date}, 10:${String(i % 60).padStart(2, '0')} - ${i % 2 ? 'Alice' : 'Bob'}: message number ${i}`;
    }
    return lines.join('\n');
};

export const telegramJson = (count) => JSON.stringify({
    about: 'Here is your Telegram data',
    personal_information: { user_id: 42 },
    chats: {
        list: [{
            id: 1, name: 'Big chat', type: 'personal_chat',
            messages: Array.from({ length: count }, (_, i) => ({
                id: i + 1, type: 'message', date: new Date(2021, 0, 1, 0, i).toISOString(),
                date_unixtime: String(1609459200 + i * 60), from: i % 2 ? 'Sam' : 'Me', from_id: i % 2 ? 'user7' : 'user42',
                text: `telegram message ${i}`,
            })),
        }],
    },
});

/**
 * An Instagram export zip: one conversation with `messageCount` messages, `smallPhotos` tiny
 * photos spread through it, and `bigPhotos` 3000x2000 photos at the very end (the first thing on screen).
 */
export const instagramZip = async ({ messageCount, smallPhotos, bigPhotos }) => {
    const folder = 'your_instagram_activity/messages/inbox/friend_123';
    const zip = new JSZip();
    const small = makePng(64, 64);
    const big = makePng(3000, 2000);
    const messages = [];
    const base = 1700000000000;
    const photoEvery = Math.max(1, Math.floor(messageCount / Math.max(1, smallPhotos)));
    let photoIndex = 0;
    for (let i = 0; i < messageCount; i++) {
        const message = {
            sender_name: i % 2 ? 'friend_one' : 'testuser',
            timestamp_ms: base + i * 120000,
            content: `instagram message ${i}`,
        };
        if (i % photoEvery === 0 && photoIndex < smallPhotos) {
            const uri = `${folder}/photos/small_${photoIndex}.png`;
            zip.file(uri, small);
            message.photos = [{ uri, creation_timestamp: Math.floor(message.timestamp_ms / 1000) }];
            photoIndex++;
        }
        messages.push(message);
    }
    for (let b = 0; b < bigPhotos; b++) {
        const uri = `${folder}/photos/big_${b}.png`;
        zip.file(uri, big);
        messages.push({
            sender_name: 'friend_one',
            timestamp_ms: base + (messageCount + b) * 120000,
            photos: [{ uri, creation_timestamp: Math.floor(base / 1000) }],
        });
    }
    // Instagram lists newest messages first.
    messages.reverse();
    zip.file(`${folder}/message_1.json`, JSON.stringify({
        participants: [{ name: 'friend_one' }, { name: 'testuser' }],
        messages,
        title: 'Friend One',
        thread_path: 'inbox/friend_123',
    }));
    const data = await zip.generateAsync({ type: 'nodebuffer', compression: 'STORE' });
    return { data, mediaCount: smallPhotos + bigPhotos };
};

/**
 * Writes a STORE-only zip holding `chatName` plus one filler entry of `fillerBytes` zero bytes,
 * streamed to disk so the filler never exists in memory. Stays under 4 GB so no Zip64 is needed.
 */
export const writeHugeZip = async (filePath, { chatName, chatText, fillerName, fillerBytes }) => {
    if (fillerBytes >= 0xffffffff) throw new Error('filler must stay below 4 GB (no Zip64 writer here)');
    const out = createWriteStream(filePath);
    const write = async (buffer) => { if (!out.write(buffer)) await once(out, 'drain'); };
    const entries = [];
    let offset = 0;

    const localHeader = (name, crc, size) => {
        const nameBytes = Buffer.from(name);
        const h = Buffer.alloc(30 + nameBytes.length);
        h.writeUInt32LE(0x04034b50, 0);
        h.writeUInt16LE(20, 4);          // version needed
        h.writeUInt16LE(0x0800, 6);      // UTF-8 names
        h.writeUInt16LE(0, 8);           // method: store
        h.writeUInt16LE(0, 10); h.writeUInt16LE(0x21, 12); // time/date
        h.writeUInt32LE(crc, 14);
        h.writeUInt32LE(size, 18);
        h.writeUInt32LE(size, 22);
        h.writeUInt16LE(nameBytes.length, 26);
        h.writeUInt16LE(0, 28);
        nameBytes.copy(h, 30);
        return h;
    };

    // Entry 1: the chat text
    const chat = Buffer.from(chatText);
    const chatCrc = crc32(chat);
    entries.push({ name: chatName, crc: chatCrc, size: chat.length, offset });
    const chatHeader = localHeader(chatName, chatCrc, chat.length);
    await write(chatHeader); await write(chat);
    offset += chatHeader.length + chat.length;

    // Entry 2: filler zeros; the CRC needs the data, so compute it first (cheap on zeros)
    const block = Buffer.alloc(8 * 1024 * 1024);
    let fillerCrc = 0;
    for (let remaining = fillerBytes; remaining > 0; remaining -= block.length) {
        fillerCrc = crc32(remaining >= block.length ? block : block.subarray(0, remaining), fillerCrc);
    }
    entries.push({ name: fillerName, crc: fillerCrc, size: fillerBytes, offset });
    const fillerHeader = localHeader(fillerName, fillerCrc, fillerBytes);
    await write(fillerHeader);
    for (let remaining = fillerBytes; remaining > 0; remaining -= block.length) {
        await write(remaining >= block.length ? block : block.subarray(0, remaining));
    }
    offset += fillerHeader.length + fillerBytes;

    // Central directory
    const centralStart = offset;
    for (const entry of entries) {
        const nameBytes = Buffer.from(entry.name);
        const c = Buffer.alloc(46 + nameBytes.length);
        c.writeUInt32LE(0x02014b50, 0);
        c.writeUInt16LE(20, 4); c.writeUInt16LE(20, 6);
        c.writeUInt16LE(0x0800, 8); c.writeUInt16LE(0, 10);
        c.writeUInt16LE(0, 12); c.writeUInt16LE(0x21, 14);
        c.writeUInt32LE(entry.crc, 16);
        c.writeUInt32LE(entry.size, 20); c.writeUInt32LE(entry.size, 24);
        c.writeUInt16LE(nameBytes.length, 28);
        c.writeUInt32LE(entry.offset, 42);
        nameBytes.copy(c, 46);
        await write(c);
        offset += c.length;
    }
    const eocd = Buffer.alloc(22);
    eocd.writeUInt32LE(0x06054b50, 0);
    eocd.writeUInt16LE(entries.length, 8); eocd.writeUInt16LE(entries.length, 10);
    eocd.writeUInt32LE(offset - centralStart, 12);
    eocd.writeUInt32LE(centralStart, 16);
    await write(eocd);
    out.end();
    await once(out, 'finish');
};

/** A WhatsApp export ZIP whose chat contains a very wide and a very tall photo. */
export const whatsappMediaZip = async () => {
    const zip = new JSZip();
    zip.file('_chat.txt', [
        '01/01/2024, 10:00 - Alice: hello',
        '01/01/2024, 10:01 - Bob: IMG-WIDE.png (file attached)',
        '01/01/2024, 10:02 - Alice: IMG-TALL.png (file attached)',
        '01/01/2024, 10:03 - Bob: nice',
    ].join('\n'));
    zip.file('IMG-WIDE.png', makePng(3000, 1000));
    zip.file('IMG-TALL.png', makePng(1000, 3000));
    return zip.generateAsync({ type: 'nodebuffer', compression: 'STORE' });
};

/** A Telegram export ZIP with the same wide and tall photos. */
export const telegramMediaZip = async () => {
    const zip = new JSZip();
    const message = (id, photo) => ({
        id, type: 'message', date: `2024-01-01T10:0${id}:00`, date_unixtime: String(1704103200 + id * 60),
        from: 'Sam', from_id: 'user7', text: '', photo,
    });
    zip.file('result.json', JSON.stringify({
        about: 'Here is your Telegram data',
        personal_information: { user_id: 42 },
        chats: { list: [{ id: 1, name: 'Photos', type: 'personal_chat', messages: [message(1, 'photos/wide.png'), message(2, 'photos/tall.png')] }] },
    }));
    zip.file('photos/wide.png', makePng(3000, 1000));
    zip.file('photos/tall.png', makePng(1000, 3000));
    return zip.generateAsync({ type: 'nodebuffer', compression: 'STORE' });
};
