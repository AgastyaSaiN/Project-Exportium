
import { Chat, Message, Photo, Video } from './types';

// Main message format: [DD/MM/YY, HH:MM:SS] Author: Message
const MESSAGE_REGEX = /^\[?(\d{1,2}[./]\d{1,2}[./]\d{2,4}), (\d{1,2}:\d{2}(?::\d{2})?(?: [AP]M)?)\]? -? ([^:]+): ([\s\S]*)/;
// For lines that don't match the main format but seem to be continuations
const CONTINUATION_REGEX = /^(?!\[?\d{1,2}[./]\d{1,2}[./]\d{2,4}, \d{1,2}:\d{2}.*\]? -? .*)/;
// Media attachment patterns
const MEDIA_ATTACHED_REGEX = /([\w-]+\.(?:jpg|jpeg|png|webp|gif|mp4|mov|avi|mkv))\s*\(file attached\)/;
const MEDIA_ATTACHED_IOS_REGEX = /<attached: ([\w-]+\.(?:jpg|jpeg|png|webp|gif|mp4|mov|avi|mkv))>/;

const isImage = (filename: string) => /\.(jpg|jpeg|png|webp|gif)$/i.test(filename);
const isVideo = (filename: string) => /\.(mp4|mov|avi|mkv)$/i.test(filename);

const parseTimestamp = (dateStr: string, timeStr: string): number => {
    // Normalize date separator
    const cleanDateStr = dateStr.replace(/\./g, '/');
    const dateParts = cleanDateStr.split('/').map(Number);
    let day: number, month: number, year: number;

    // Common ambiguity: D/M/Y vs M/D/Y. WhatsApp is often locale-dependent.
    // We'll try a common one (D/M/Y) and acknowledge it might be imperfect.
    if (dateParts.length === 3) {
        day = dateParts[0];
        month = dateParts[1] - 1; // Month is 0-indexed
        year = dateParts[2] < 100 ? 2000 + dateParts[2] : dateParts[2];
    } else {
        return Date.now(); // Fallback
    }

    let hour = 0, minute = 0;
    const timeLower = timeStr.toLowerCase();
    const isPm = timeLower.includes('pm');
    const isAm = timeLower.includes('am');
    const timeClean = timeLower.replace(/\s*(am|pm)/, '').trim();
    const timeParts = timeClean.split(':').map(Number);

    if (timeParts.length >= 2) {
        hour = timeParts[0];
        minute = timeParts[1];
    }

    if (isPm && hour < 12) {
        hour += 12;
    }
    if (isAm && hour === 12) { // Handle 12 AM (midnight)
        hour = 0;
    }
    
    // Create date in local time, as WhatsApp exports usually are.
    return new Date(year, month, day, hour, minute).getTime();
};

export const parseWhatsAppChat = (fileContent: string, fileName: string): Omit<Chat, 'fileMap'> => {
    const lines = fileContent.split('\n');
    const messages: Message[] = [];
    const participants = new Set<string>();
    let lastMessage: Message | null = null;

    for (const line of lines) {
        const match = line.match(MESSAGE_REGEX);

        if (match) {
            const [, dateStr, timeStr, sender, rawContent] = match;
            const content = rawContent.trim();
            const timestamp = parseTimestamp(dateStr, timeStr);
            
            // This is a special character used by WhatsApp for media captions with no text.
            if (content === '‎') continue;
            
            // Add sender to participants list
            if (sender && !sender.includes('added') && !sender.includes('changed')) {
                participants.add(sender.trim());
            }

            let photo: Photo | undefined;
            let video: Video | undefined;
            let messageContent = content;

            const mediaMatch = content.match(MEDIA_ATTACHED_REGEX) || content.match(MEDIA_ATTACHED_IOS_REGEX);
            if (mediaMatch) {
                const filename = mediaMatch[1];
                if (isImage(filename)) {
                    photo = { uri: filename };
                    messageContent = '📷 Photo';
                } else if (isVideo(filename)) {
                    video = { uri: filename };
                    messageContent = '📹 Video';
                }
            }
            
            const newMessage: Message = {
                id: `${timestamp}-${messages.length}`,
                sender_name: sender.trim(),
                timestamp_ms: timestamp,
                content: messageContent,
                photo,
                video,
            };

            messages.push(newMessage);
            lastMessage = newMessage;
        } else if (lastMessage && line.match(CONTINUATION_REGEX) && line.trim()) {
            // Append to the content of the last message
            lastMessage.content += `\n${line.trim()}`;
        }
    }

    if (messages.length === 0) {
        throw new Error("Could not find any valid messages. Please ensure this is a standard WhatsApp chat export file.");
    }

    const title = fileName
        .replace("WhatsApp Chat with ", "")
        .replace(/\.\w+$/, ""); // remove extension

    return {
        id: fileName,
        title,
        participants: Array.from(participants).map(name => ({ name })),
        messages,
        lastActivity: messages[messages.length - 1]?.timestamp_ms || Date.now(),
    };
};
