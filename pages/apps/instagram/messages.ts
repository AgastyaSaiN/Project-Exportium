import { Message } from './types';

/**
 * Instagram exports UTF-8 text as latin-1 escaped bytes ("RÃ©pondu"), so re-decode it.
 * Falls back to the original string when it was already correct.
 */
export const fixEncoding = (text: string): string => {
    if (typeof text !== 'string') return text;
    try {
        return decodeURIComponent(escape(text));
    } catch {
        return text;
    }
};

interface RawInstagramMessage {
    sender_name: string;
    timestamp_ms: number;
    content?: string;
    photos?: Message['photos'];
    videos?: Message['videos'];
    audio_files?: Message['audio_files'];
    gifs?: Message['gifs'];
    sticker?: Message['sticker'];
    share?: { link?: string; share_text?: string; original_content_owner?: string };
    reactions?: { reaction?: string; actor?: string }[];
    call_duration?: number;
    is_unsent?: boolean;
}

export const normalizeMessages = (rawMessages: RawInstagramMessage[]): Message[] =>
    rawMessages
        .map((msg, index): Message => ({
            id: `${msg.timestamp_ms}-${index}`,
            sender_name: fixEncoding(msg.sender_name),
            timestamp_ms: msg.timestamp_ms,
            content: msg.content ? fixEncoding(msg.content) : undefined,
            photos: msg.photos,
            videos: msg.videos,
            audio_files: msg.audio_files?.length ? msg.audio_files : undefined,
            gifs: msg.gifs?.length ? msg.gifs : undefined,
            sticker: msg.sticker?.uri ? msg.sticker : undefined,
            share: msg.share && (msg.share.link || msg.share.share_text)
                ? { link: msg.share.link, share_text: msg.share.share_text ? fixEncoding(msg.share.share_text) : undefined, original_content_owner: msg.share.original_content_owner ? fixEncoding(msg.share.original_content_owner) : undefined }
                : undefined,
            reactions: msg.reactions?.length
                ? msg.reactions.map(r => ({ reaction: fixEncoding(r.reaction ?? ''), actor: fixEncoding(r.actor ?? '') })).filter(r => r.reaction)
                : undefined,
            call_duration: typeof msg.call_duration === 'number' ? msg.call_duration : undefined,
            is_unsent: msg.is_unsent || undefined,
        }))
        .sort((a, b) => a.timestamp_ms - b.timestamp_ms);

/** Parses and merges every message_N.json of one conversation (text in), oldest message first. */
export const parseMessageFiles = (texts: string[]): Message[] => {
    const raw: RawInstagramMessage[] = [];
    for (const text of texts) {
        const data = JSON.parse(text);
        if (data.messages) {
            for (const msg of data.messages) raw.push(msg);
        }
    }
    return normalizeMessages(raw);
};

export interface SearchHit {
    id: string;
    sender: string;
    ts: number;
    text: string;
}

/** Messages in one chat whose text contains `query` (case-insensitive), capped, newest first. */
export const searchMessageFiles = (texts: string[], query: string, limit: number): SearchHit[] => {
    const needle = query.toLowerCase();
    const hits: SearchHit[] = [];
    for (const message of parseMessageFiles(texts)) {
        if (message.content && message.content.toLowerCase().includes(needle)) {
            hits.push({ id: message.id, sender: message.sender_name, ts: message.timestamp_ms, text: message.content });
        }
    }
    return hits.reverse().slice(0, limit);
};

export interface ChatHead {
    title: string;
    participants: { name: string }[];
    lastActivity: number;
}

/** Reads just enough of a chat's first message file to list it in the sidebar. */
export const parseChatHead = (text: string): ChatHead => {
    const chatData = JSON.parse(text);
    let lastActivity = 0;
    if (chatData.messages && chatData.messages.length > 0) {
        for (const msg of chatData.messages) lastActivity = Math.max(lastActivity, msg.timestamp_ms);
    }
    return {
        title: fixEncoding(chatData.title),
        participants: chatData.participants.map((p: { name: string }) => ({ name: fixEncoding(p.name) })),
        lastActivity,
    };
};
