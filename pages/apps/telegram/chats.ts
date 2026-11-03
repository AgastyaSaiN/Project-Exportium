import { Chat, Message } from './types';

interface RawTelegramChat {
    id: number;
    name?: string;
    type: string;
    messages: Message[];
}

interface RawTelegramExport {
    id?: string | number;
    list?: RawTelegramChat[];
    name?: string;
    messages?: Message[];
    personal_information?: { user_id?: string | number; id?: string | number };
    chats?: { list: RawTelegramChat[] };
}

/**
 * Real exports describe attachments as `file` + `media_type` (a video is `file` with media_type
 * "video_file"). Spread that into the specific fields the viewer uses.
 */
export const withAttachmentFields = (message: Message): Message => {
    const file = message.file;
    if (!file || message.photo) return message;
    switch (message.media_type) {
        case 'video_file':
        case 'video_message':
        case 'animation':
            return { ...message, video_file: message.video_file ?? file };
        case 'voice_message':
            return { ...message, voice_message: message.voice_message ?? file };
        case 'audio_file':
            return { ...message, audio_file: message.audio_file ?? file };
        case 'sticker':
            return { ...message, sticker_file: file };
        default:
            return { ...message, document_file: file };
    }
};

export interface TelegramChats {
    chats: Chat[];
    ownerId: string;
}

/**
 * Turns the text of Telegram's result.json into chats. Pure (no DOM, no files) so it can run
 * in a Web Worker: parsing and filtering a multi-hundred-MB export must not freeze the window.
 */
export const buildTelegramChats = (jsonText: string, sourceName = 'result.json'): TelegramChats => {
    let data: RawTelegramExport;
    try {
        data = JSON.parse(jsonText);
    } catch {
        throw new Error(`Failed to parse '${sourceName}'. The file might be corrupted.`);
    }

    if (!data.chats || !data.chats.list) {
        // Some exports have a flat structure or different root
        if (data.list && Array.isArray(data.list)) {
            data.chats = { list: data.list };
        } else if (data.name && data.messages) {
            // Single chat export
            data.chats = { list: [data as RawTelegramChat] };
        } else {
            throw new Error(`Invalid Telegram export format in '${sourceName}'. Could not find chat list.`);
        }
    }

    let ownerId = '';
    const detectedId = data.personal_information?.user_id || data.personal_information?.id || data.id;
    if (detectedId) {
        const idStr = String(detectedId);
        ownerId = idStr.startsWith('user') ? idStr : `user${idStr}`;
    }

    const chats: Chat[] = data.chats!.list
        .filter((chat) => chat.messages && chat.messages.length > 0)
        .map((chat): Chat => {
            const lastMessage = chat.messages[chat.messages.length - 1];
            return {
                id: chat.id,
                name: chat.name || "Deleted Account",
                type: chat.type,
                messages: chat.messages.filter((m) => m.type === 'message').map(withAttachmentFields),
                lastActivity: lastMessage ? new Date(lastMessage.date).getTime() : 0,
            };
        })
        .sort((a: Chat, b: Chat) => b.lastActivity - a.lastActivity);

    if (chats.length === 0) {
        throw new Error("No conversations found in this export.");
    }

    return { chats, ownerId };
};
