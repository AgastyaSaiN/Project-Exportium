import { Chat, Message, OmittedKind } from './types';

export type DateOrder = 'dmy' | 'mdy' | 'ymd';

/**
 * One header line: "12/03/2023, 10:16 - ", "[12/03/2023, 10:16:05] ", "2023-03-12 22:16 - ", "3/14/23, 1:30 PM - ".
 * Day/month/year are captured as three numbers; which is which is decided once per file (see detectDateOrder).
 */
const HEADER = /^\[?(\d{1,4})[./-](\d{1,2})[./-](\d{1,4}),?\s+(\d{1,2}):(\d{2})(?::(\d{2}))?(?:\s?([AaPp])\.?\s?[Mm]\.?)?\]?\s*(?:-\s*)?([\s\S]*)$/;
/** Characters WhatsApp sprinkles in (LTR marks, narrow no-break spaces from iOS 17). */
const INVISIBLE_PREFIX = /^[\u200e\u200f\u202a-\u202e\ufeff]+/;
const ODD_SPACES = /[\u202f\u00a0]/g;
const CONTINUATION_HEADER = /^\[?\d{1,4}[./-]\d{1,2}[./-]\d{1,4},?\s+\d{1,2}:\d{2}/;

// Attachments, in any of WhatsApp's languages: Android "IMG-1.jpg (file attached)" / "(Datei angehängt)", iOS "<attached: x>" / "<Anhang: x>".
const ANDROID_ATTACHED = /^([^\n<>]+?\.[A-Za-z0-9]{2,5})\s*\((?:[^()\n]{3,40})\)\s*([\s\S]*)$/;
const IOS_ATTACHED = /^<[^:>\n]{2,30}:\s*([^>\n]+\.[A-Za-z0-9]{2,5})\s*>\s*([\s\S]*)$/;
const OMITTED_ANGLE = /^<[^>]*(omitted|ausgeschlossen|omitido|omis|omesso|omitida|weggelaten|utelatt|pominięt|пропущен)[^>]*>$/i;
const OMITTED_WORDS = /^(image|photo|video|audio|sticker|gif|document|contact card|voice message|bild|vidéo|imagen)\s+(omitted|weggelassen|omitido|omis)$/i;

const IMAGE = /\.(jpe?g|png|webp|gif|heic|heif|bmp)$/i;
const VIDEO = /\.(mp4|mov|avi|mkv|3gp|webm|m4v)$/i;
const AUDIO = /\.(opus|m4a|mp3|ogg|amr|wav|aac|oga)$/i;

const omittedKind = (text: string): OmittedKind | null => {
    const trimmed = text.replace(INVISIBLE_PREFIX, '').trim();
    if (!OMITTED_ANGLE.test(trimmed) && !OMITTED_WORDS.test(trimmed)) return null;
    if (/image|photo|bild|imagen/i.test(trimmed)) return 'photo';
    if (/video|vidéo/i.test(trimmed)) return 'video';
    if (/audio|voice/i.test(trimmed)) return 'audio';
    if (/sticker/i.test(trimmed)) return 'sticker';
    if (/gif/i.test(trimmed)) return 'photo';
    if (/document|contact/i.test(trimmed)) return 'document';
    return 'media';
};

interface Header {
    a: number; b: number; c: number;
    hour: number; minute: number; second: number;
    meridiem: string | null;
    rest: string;
}

const readHeader = (line: string): Header | null => {
    const match = line.match(HEADER);
    if (!match) return null;
    return {
        a: parseInt(match[1], 10), b: parseInt(match[2], 10), c: parseInt(match[3], 10),
        hour: parseInt(match[4], 10), minute: parseInt(match[5], 10), second: match[6] ? parseInt(match[6], 10) : 0,
        meridiem: match[7] ? match[7].toLowerCase() : null,
        rest: match[8],
    };
};

const clean = (rawLine: string) => rawLine.replace(ODD_SPACES, ' ').replace(INVISIBLE_PREFIX, '').replace(/\r$/, '');

export interface DateFormatGuess {
    order: DateOrder;
    /** True when nothing in the file settles it (every day and month is 12 or less). */
    ambiguous: boolean;
}

/**
 * Works out which of day / month / year comes first by looking at every header in the file, not
 * line by line: one "14/03" anywhere proves day-first for the whole chat.
 */
export const detectDateOrder = (lines: string[]): DateFormatGuess => {
    let yearFirst = 0, aOver12 = 0, bOver12 = 0, headers = 0;
    for (const raw of lines) {
        const header = readHeader(clean(raw));
        if (!header) continue;
        headers++;
        if (header.a > 31) { yearFirst++; if (header.c > 12) aOver12++; continue; }
        if (header.a > 12) aOver12++;
        if (header.b > 12) bOver12++;
    }
    if (headers > 0 && yearFirst > headers / 2) return { order: 'ymd', ambiguous: false };
    if (aOver12 > 0 && bOver12 === 0) return { order: 'dmy', ambiguous: false };
    if (bOver12 > 0 && aOver12 === 0) return { order: 'mdy', ambiguous: false };
    if (aOver12 > 0 && bOver12 > 0) return { order: aOver12 >= bOver12 ? 'dmy' : 'mdy', ambiguous: false };
    return { order: 'dmy', ambiguous: true };
};

const toTimestamp = (h: Header, order: DateOrder): number => {
    let day: number, month: number, year: number;
    if (order === 'ymd') { year = h.a; month = h.b; day = h.c; }
    else if (order === 'mdy') { month = h.a; day = h.b; year = h.c; }
    else { day = h.a; month = h.b; year = h.c; }
    // A line that cannot be valid in the chosen order (month 14) is read the other way round.
    if (month > 12 && day <= 12) { [day, month] = [month, day]; }
    if (year < 100) year += 2000;

    let hour = h.hour;
    if (h.meridiem === 'p' && hour < 12) hour += 12;
    if (h.meridiem === 'a' && hour === 12) hour = 0;
    return new Date(year, month - 1, day, hour, h.minute, h.second).getTime();
};

export type ParsedChat = Omit<Chat, 'fileMap'>;

export interface ParseOptions {
    /** Force a date order instead of detecting it. */
    dateOrder?: DateOrder;
}

/**
 * Parses the text of a WhatsApp "_chat.txt" export. Pure and synchronous: it runs inside a
 * Web Worker (see workers/handlers.ts), so a 100k-line chat never blocks the window.
 */
export function parseWhatsAppChat(
    fileContent: string,
    fileName: string,
    onProgress?: (processed: number, total: number) => void,
    options: ParseOptions = {}
): ParsedChat {
    const lines = fileContent.split('\n');
    const totalLines = lines.length;
    const guess = detectDateOrder(lines);
    const order = options.dateOrder ?? guess.order;
    const messages: Message[] = [];
    const participants = new Set<string>();
    let lastMessage: Message | null = null;

    for (let i = 0; i < lines.length; i++) {
        const line = clean(lines[i]);
        if (!line.trim()) continue;
        if (onProgress && i > 0 && i % 5000 === 0) onProgress(i, totalLines);

        const header = readHeader(line);
        if (!header) {
            // Not a header: the continuation of the previous message (a multi-line text).
            if (lastMessage && lastMessage.type === 'message' && !CONTINUATION_HEADER.test(line)) {
                lastMessage.content += `\n${line.trim()}`;
            }
            continue;
        }

        const timestamp = toTimestamp(header, order);
        const authored = header.rest.match(/^([^:\n]{1,80}?):\s([\s\S]*)$/);

        if (!authored) {
            const text = header.rest.trim();
            if (!text) continue;
            messages.push({ id: `${timestamp}-${messages.length}`, type: 'system', sender_name: null, timestamp_ms: timestamp, content: text });
            lastMessage = null;
            continue;
        }

        const sender = authored[1].trim();
        const body = authored[2].trim();
        participants.add(sender);

        const message: Message = { id: `${timestamp}-${messages.length}`, type: 'message', sender_name: sender, timestamp_ms: timestamp, content: body };

        const omitted = omittedKind(body);
        if (omitted) {
            message.omitted = omitted;
            message.content = '';
        } else {
            const attached = body.match(IOS_ATTACHED) || body.match(ANDROID_ATTACHED);
            if (attached) {
                const filename = attached[1].trim().replace(INVISIBLE_PREFIX, '');
                const caption = (attached[2] ?? '').trim();
                if (IMAGE.test(filename)) message.photo = { uri: filename };
                else if (VIDEO.test(filename)) message.video = { uri: filename };
                else if (AUDIO.test(filename)) message.audio = { uri: filename };
                else message.document = { uri: filename, name: filename.split('/').pop() || filename };
                message.content = caption;
            }
        }

        messages.push(message);
        lastMessage = message;
    }

    if (messages.length === 0) {
        throw new Error("Could not find any valid messages. Please ensure this is a standard WhatsApp chat export file.");
    }

    const title = fileName
        .replace("WhatsApp Chat with ", "")
        .replace(/\.zip$/, "")
        .replace(/\.txt$/, "");

    return {
        id: fileName,
        title,
        participants: Array.from(participants).map(name => ({ name })),
        messages,
        lastActivity: messages[messages.length - 1]?.timestamp_ms || Date.now(),
        dateOrder: order,
        dateOrderAmbiguous: guess.ambiguous && !options.dateOrder,
    };
}
