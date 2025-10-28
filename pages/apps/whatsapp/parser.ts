import { Chat, Message, Photo, Video } from './types';

// Regex to capture a message with an author. Handles different timestamp formats and separators.
const MESSAGE_WITH_AUTHOR_REGEX = /^\[?(\d{1,2}[./]\d{1,2}[./]\d{2,4}),?\s(\d{1,2}:\d{2}(?::\d{2})?(?:\s[AaPp][Mm])?)\]?(?:\s-\s|\s)([^:]+?):\s([\s\S]+)/;
// Regex for lines that have a timestamp but no author, typically system messages.
const MESSAGE_WITHOUT_AUTHOR_REGEX = /^\[?(\d{1,2}[./]\d{1,2}[./]\d{2,4}),?\s(\d{1,2}:\d{2}(?::\d{2})?(?:\s[AaPp][Mm])?)\]?(?:\s-\s|\s)([\s\S]+)/;
// Regex for message continuations on new lines.
const CONTINUATION_REGEX = /^(?!\[?\d{1,2}[./]\d{1,2}[./]\d{2,4},?)/;

// Media attachment patterns for both Android and iOS.
const MEDIA_ATTACHED_REGEX = /([\w\s-]+\.(?:jpg|jpeg|png|webp|gif|mp4|mov|avi|mkv|opus))\s*\(file attached\)/;
const MEDIA_ATTACHED_IOS_REGEX = /<attached:\s*([\w\s-]+\.(?:jpg|jpeg|png|webp|gif|mp4|mov|avi|mkv|opus))>/;
const MEDIA_OMITTED_REGEX = /<media omitted>/i;


const isImage = (filename: string) => /\.(jpg|jpeg|png|webp|gif)$/i.test(filename);
const isVideo = (filename: string) => /\.(mp4|mov|avi|mkv)$/i.test(filename);

const parseTimestamp = (dateStr: string, timeStr: string): number => {
    const cleanDateStr = dateStr.replace(/\./g, '/');
    const dateParts = cleanDateStr.split('/').map(part => parseInt(part, 10));
    let day: number, month: number, year: number;

    // Try to smartly guess date format (DMY vs MDY)
    if (dateParts[0] > 12 && dateParts[1] <= 12) { // DD/MM/YY
        day = dateParts[0]; month = dateParts[1] - 1; year = dateParts[2];
    } else if (dateParts[0] <= 12 && dateParts[1] > 12) { // MM/DD/YY
        day = dateParts[1]; month = dateParts[0] - 1; year = dateParts[2];
    } else { // Ambiguous (e.g., 01/02/2023), default to DMY as it's more common globally
        day = dateParts[0]; month = dateParts[1] - 1; year = dateParts[2];
    }

    if (year < 100) {
        year += 2000;
    }
    
    let hour = 0, minute = 0, second = 0;
    const timeLower = timeStr.toLowerCase();
    const isPm = timeLower.includes('pm');
    const isAm = timeLower.includes('am');
    const timeClean = timeLower.replace(/\s*(am|pm)/, '').trim();
    const timeParts = timeClean.split(':').map(part => parseInt(part, 10));

    if (timeParts.length >= 2) {
        hour = timeParts[0];
        minute = timeParts[1];
        second = timeParts[2] || 0;
    }

    if (isPm && hour < 12) {
        hour += 12;
    }
    if (isAm && hour === 12) { // Handle 12 AM (midnight)
        hour = 0;
    }
    
    return new Date(year, month, day, hour, minute, second).getTime();
};

export interface ParserProgress {
    type: 'progress';
    processed: number;
    total: number;
}

export interface ParserComplete {
    type: 'complete';
    chat: Omit<Chat, 'fileMap'>;
}

export type ParserResult = ParserProgress | ParserComplete;


export async function* parseWhatsAppChat(fileContent: string, fileName: string): AsyncGenerator<ParserResult> {
    const lines = fileContent.split('\n');
    const totalLines = lines.length;
    const messages: Message[] = [];
    const participants = new Set<string>();
    let lastMessage: Message | null = null;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (!line.trim()) continue;

        if (i > 0 && i % 1000 === 0) {
            // Yield progress and give the main thread a break
            yield { type: 'progress', processed: i, total: totalLines };
            await new Promise(resolve => setTimeout(resolve, 0));
        }

        const authorMatch = line.match(MESSAGE_WITH_AUTHOR_REGEX);
        const systemMatch = !authorMatch ? line.match(MESSAGE_WITHOUT_AUTHOR_REGEX) : null;
        
        if (authorMatch) {
            const [, dateStr, timeStr, sender, rawContent] = authorMatch;
            const content = rawContent.trim();
            const timestamp = parseTimestamp(dateStr, timeStr);
            
            if (content === '‎' || MEDIA_OMITTED_REGEX.test(content)) {
                lastMessage = null; 
                continue;
            }
            
            participants.add(sender.trim());

            let photo: Photo | undefined;
            let video: Video | undefined;
            let messageContent = content;

            const mediaMatch = content.match(MEDIA_ATTACHED_REGEX) || content.match(MEDIA_ATTACHED_IOS_REGEX);
            if (mediaMatch) {
                const filename = mediaMatch[1].trim();
                if (isImage(filename)) {
                    photo = { uri: filename };
                } else if (isVideo(filename)) {
                    video = { uri: filename };
                }
                messageContent = content.replace(mediaMatch[0], '').trim();
                if (!messageContent) {
                   messageContent = photo ? '📷 Photo' : '📹 Video';
                }
            }
            
            const newMessage: Message = {
                id: `${timestamp}-${messages.length}`,
                type: 'message',
                sender_name: sender.trim(),
                timestamp_ms: timestamp,
                content: messageContent,
                photo,
                video,
            };

            messages.push(newMessage);
            lastMessage = newMessage;

        } else if (systemMatch) {
             const [, dateStr, timeStr, content] = systemMatch;
             const timestamp = parseTimestamp(dateStr, timeStr);
             const newMessage: Message = {
                id: `${timestamp}-${messages.length}`,
                type: 'system',
                sender_name: null,
                timestamp_ms: timestamp,
                content: content.trim(),
             };
             messages.push(newMessage);
             lastMessage = null;

        } else if (lastMessage && lastMessage.type === 'message' && line.match(CONTINUATION_REGEX) && line.trim()) {
            lastMessage.content += `\n${line.trim()}`;
        }
    }

    if (messages.length === 0) {
        throw new Error("Could not find any valid messages. Please ensure this is a standard WhatsApp chat export file.");
    }

    const title = fileName
        .replace("WhatsApp Chat with ", "")
        .replace(/\.zip$/, "")
        .replace(/\.txt$/, "");

    yield {
        type: 'complete',
        chat: {
            id: fileName,
            title,
            participants: Array.from(participants).map(name => ({ name })),
            messages,
            lastActivity: messages[messages.length - 1]?.timestamp_ms || Date.now(),
        }
    };
}