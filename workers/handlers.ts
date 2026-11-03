import { parseWhatsAppChat } from '../pages/apps/whatsapp/parser';
import type { ParsedChat } from '../pages/apps/whatsapp/parser';
import { buildTelegramChats } from '../pages/apps/telegram/chats';
import type { TelegramChats } from '../pages/apps/telegram/chats';
import { parseChatHead, parseMessageFiles, searchMessageFiles } from '../pages/apps/instagram/messages';
import type { ChatHead, SearchHit } from '../pages/apps/instagram/messages';
import type { Message as InstagramMessage } from '../pages/apps/instagram/types';

/**
 * Everything heavy that happens while importing an export: reading huge JSON/text files into
 * chats. These are pure functions of text, so they run in a Web Worker and the window stays
 * responsive; in environments without Workers (unit tests) they run inline.
 */
export interface ParseRequests {
    whatsapp: { text: string; fileName: string; dateOrder?: 'dmy' | 'mdy' | 'ymd' };
    telegram: { text: string; fileName: string };
    instagramMessages: { texts: string[] };
    instagramChatHead: { text: string };
    instagramSearch: { texts: string[]; query: string; limit: number };
}

export interface ParseResults {
    whatsapp: ParsedChat;
    telegram: TelegramChats;
    instagramMessages: InstagramMessage[];
    instagramChatHead: ChatHead;
    instagramSearch: SearchHit[];
}

export type ParseOp = keyof ParseRequests;
export type ProgressCallback = (processed: number, total: number) => void;

export const runParse = <Op extends ParseOp>(
    op: Op,
    payload: ParseRequests[Op],
    onProgress?: ProgressCallback
): ParseResults[Op] => {
    switch (op) {
        case 'whatsapp': {
            const { text, fileName, dateOrder } = payload as ParseRequests['whatsapp'];
            return parseWhatsAppChat(text, fileName, onProgress, { dateOrder }) as ParseResults[Op];
        }
        case 'telegram': {
            const { text, fileName } = payload as ParseRequests['telegram'];
            return buildTelegramChats(text, fileName) as ParseResults[Op];
        }
        case 'instagramMessages':
            return parseMessageFiles((payload as ParseRequests['instagramMessages']).texts) as ParseResults[Op];
        case 'instagramSearch': {
            const { texts, query, limit } = payload as ParseRequests['instagramSearch'];
            return searchMessageFiles(texts, query, limit) as ParseResults[Op];
        }
        case 'instagramChatHead':
            return parseChatHead((payload as ParseRequests['instagramChatHead']).text) as ParseResults[Op];
        default:
            throw new Error(`Unknown parse operation: ${String(op)}`);
    }
};
