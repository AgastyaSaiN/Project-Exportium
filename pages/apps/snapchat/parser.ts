
import { openZip, ZipArchive, ZipEntry } from '../../../utils/zipArchive';
import { InternalChat, InternalMessage, InternalMedia } from './types';

type JsonRecord = Record<string, unknown>;

const isRecord = (value: unknown): value is JsonRecord => !!value && typeof value === 'object' && !Array.isArray(value);

// Helper to get property case-insensitively
const getProp = (obj: unknown, ...keys: string[]): unknown => {
    if (!isRecord(obj)) return undefined;

    // First try exact matches
    for (const key of keys) {
        if (obj[key] !== undefined) return obj[key];
    }

    // Then try case-insensitive matches
    const objKeys = Object.keys(obj);
    for (const key of keys) {
        const lowerKey = key.toLowerCase();
        const found = objKeys.find(k => k.toLowerCase() === lowerKey);
        if (found) return obj[found];
    }

    return undefined;
};

const getString = (obj: unknown, ...keys: string[]): string | undefined => {
    const value = getProp(obj, ...keys);
    return typeof value === 'string' && value !== '' ? value : undefined;
};

// Helper to parse Snapchat's UTC strings
const parseTimestamp = (dateStr: string | undefined): number => {
    if (!dateStr) return 0;
    try {
        let clean = dateStr.trim();
        // Standardize to ISO 8601
        if (clean.includes(' UTC')) {
            clean = clean.replace(' UTC', 'Z').replace(' ', 'T');
        } else if (clean.match(/^\d{4}-\d{2}-\d{2}\s\d{2}:\d{2}:\d{2}$/)) {
            // Assume UTC if no timezone specified
            clean = clean.replace(' ', 'T') + 'Z';
        }
        
        const ts = new Date(clean).getTime();
        return isNaN(ts) ? 0 : ts;
    } catch {
        return 0;
    }
};

// Helper to extract timestamp from filenames
const extractDateFromFilename = (filename: string): number | null => {
    const match = filename.match(/(\d{4}-\d{2}-\d{2})[_-](\d{2}-\d{2}-\d{2})/);
    if (match) {
        const iso = `${match[1]}T${match[2].replace(/-/g, ':')}Z`;
        const ts = new Date(iso).getTime();
        return isNaN(ts) ? null : ts;
    }
    return null;
};

export interface SnapchatStats {
    totalChats: number;
    totalMessages: number;
    totalMedia: number;
}

export interface SnapchatImport {
    chats: InternalChat[];
    owner: string;
    stats: SnapchatStats;
    /** The opened archive, reused by the viewer to load attachments on demand. */
    zip: ZipArchive;
}

export const parseSnapchatArchive = async (
    file: File, 
    onProgress: (msg: string) => void
): Promise<SnapchatImport> => {
    
    onProgress('Reading zip file...');
    let zip: ZipArchive;
    try {
        zip = await openZip(file);
    } catch {
        throw new Error("Failed to read the ZIP file. Please ensure it is a valid zip archive.");
    }

    // 1. Locate Chat History
    onProgress('Locating chat data...');
    const filePaths = Object.keys(zip.files);
    
    let chatHistoryPath = filePaths.find(p => p.match(/(^|\/)json\/chat_history\.json$/i));
    if (!chatHistoryPath) {
        chatHistoryPath = filePaths.find(p => p.match(/(^|\/)chat_history\.json$/i));
    }

    if (!chatHistoryPath) {
        if (filePaths.some(p => p.endsWith('.html'))) {
             throw new Error("It looks like you uploaded an HTML export. Please request a JSON export from Snapchat Settings.");
        }
        throw new Error("Could not find 'chat_history.json' in the archive. Please ensure you uploaded the correct 'mydata.zip'.");
    }

    // 2. Index Media Files
    onProgress('Indexing media files...');
    const mediaMap = new Map<string, ZipEntry>(); 
    const mediaTimeMap: { ts: number; file: ZipEntry; type: 'image' | 'video' }[] = [];

    filePaths.forEach(path => {
        const entry = zip.files[path];
        if (entry.dir || path.startsWith('__MACOSX')) return;
        
        const name = path.split('/').pop() || '';
        const lowerName = name.toLowerCase();

        mediaMap.set(path, entry);
        if (!mediaMap.has(name)) {
            mediaMap.set(name, entry);
        }

        if (lowerName.match(/\.(jpg|jpeg|png|mp4|mov|webp)$/)) {
            let ts = extractDateFromFilename(name);
            if (!ts) {
                ts = entry.date.getTime();
            }
            
            mediaTimeMap.push({
                ts,
                file: entry,
                type: (lowerName.endsWith('.mp4') || lowerName.endsWith('.mov')) ? 'video' : 'image'
            });
        }
    });

    mediaTimeMap.sort((a, b) => a.ts - b.ts);

    // First media file within 15 seconds of `ts`. The list is sorted, so a binary search finds the
    // window start instead of scanning every file for every message.
    const MATCH_WINDOW_MS = 15000;
    const findMediaNear = (ts: number) => {
        let low = 0;
        let high = mediaTimeMap.length;
        while (low < high) {
            const mid = (low + high) >> 1;
            if (mediaTimeMap[mid].ts > ts - MATCH_WINDOW_MS) high = mid; else low = mid + 1;
        }
        const candidate = mediaTimeMap[low];
        return candidate && candidate.ts < ts + MATCH_WINDOW_MS ? candidate : undefined;
    };

    // 3. Parse Messages
    onProgress('Parsing JSON data...');
    const chatHistoryFile = zip.files[chatHistoryPath];
    let rawData: unknown;
    
    try {
        const content = await chatHistoryFile.async('string');
        rawData = JSON.parse(content);
    } catch {
        throw new Error("Failed to parse 'chat_history.json'. The file might be corrupted.");
    }

    // 4. Dynamic Discovery of Message Lists
    // Instead of relying on hardcoded keys, we recursively scan for arrays containing message-like objects
    const messageLists: { key: string, list: unknown[], isSaved: boolean }[] = [];

    const isMessageLike = (item: unknown) => {
        if (!isRecord(item)) return false;
        // Check for common message properties
        return (getProp(item, 'From') !== undefined || getProp(item, 'To') !== undefined) && 
               (getProp(item, 'Created') !== undefined || getProp(item, 'Date') !== undefined);
    };

    const scanForMessages = (obj: unknown, path: string) => {
        if (!obj || typeof obj !== 'object') return;

        // If it's an array, check if it contains messages
        if (Array.isArray(obj)) {
            if (obj.length > 0 && isMessageLike(obj[0])) {
                const isSaved = path.toLowerCase().includes('saved');
                messageLists.push({ key: path, list: obj, isSaved });
            }
            return;
        }

        // Recursively scan object properties
        for (const [key, value] of Object.entries(obj)) {
            // Avoid scanning into individual messages or huge strings
            if (typeof value === 'object') {
                scanForMessages(value, path ? `${path}.${key}` : key);
            }
        }
    };

    scanForMessages(rawData, '');

    if (messageLists.length === 0) {
        throw new Error("No chat messages found in the JSON file. The format might be unsupported.");
    }

    // 5. Identify Owner
    // Robust detection: Scan 'Sent' lists for frequent 'From' values.
    // Scan 'Received' lists for frequent 'To' values.
    const sentSenders = new Map<string, number>();
    const receivedRecipients = new Map<string, number>();

    for (const item of messageLists) {
        const isSent = item.key.toLowerCase().includes('sent');
        const isReceived = item.key.toLowerCase().includes('received');
        
        for (const msg of item.list) {
            if (isSent) {
                const from = getString(msg, 'From');
                if (from) sentSenders.set(from, (sentSenders.get(from) || 0) + 1);
            }
            if (isReceived) {
                const to = getString(msg, 'To');
                if (to) receivedRecipients.set(to, (receivedRecipients.get(to) || 0) + 1);
            }
        }
    }

    let owner = "You";
    
    // Primary strategy: most frequent sender in Sent lists
    if (sentSenders.size > 0) {
        owner = [...sentSenders.entries()].reduce((a, b) => b[1] > a[1] ? b : a)[0];
    } 
    // Secondary strategy: most frequent recipient in Received lists
    else if (receivedRecipients.size > 0) {
        owner = [...receivedRecipients.entries()].reduce((a, b) => b[1] > a[1] ? b : a)[0];
    }


    // 6. Process Messages
    onProgress('Organizing conversations...');
    const chatsMap = new Map<string, InternalChat>();

    const processMessageList = (list: unknown[], isSaved: boolean) => {
        for (const msg of list) {
            const from = getString(msg, 'From') || "Unknown";
            const to = getString(msg, 'To');
            const created = getString(msg, 'Created');
            const mediaTypeRaw = (getString(msg, 'Media Type') || '').toUpperCase();
            const textContent = getString(msg, 'Text') || getString(msg, 'Content');
            const mediaRef = getString(msg, 'Media');

            // Determine participant
            let participant: string;
            
            // If the sender is me, the participant is the other person (To)
            if (from === owner) {
                participant = to || "Unknown Recipient"; 
            } else {
                // If I received it, the participant is the sender (From)
                participant = from;
            }

            if (!chatsMap.has(participant)) {
                chatsMap.set(participant, {
                    id: participant,
                    participant,
                    messages: [],
                    messageCount: 0,
                    mediaCount: 0,
                    lastActivity: 0
                });
            }

            const chat = chatsMap.get(participant)!;
            const timestamp = parseTimestamp(created);
            
            // Determine Type
            let type: InternalMessage['type'] = 'TEXT';
            
            if (['IMAGE', 'MEDIA', 'SNAP', 'FRIEND_DEAL'].includes(mediaTypeRaw)) type = 'IMAGE';
            else if (['VIDEO', 'VIDEO_NO_SOUND'].includes(mediaTypeRaw)) type = 'VIDEO';
            else if (['AUDIO', 'AUDIO_NOTE'].includes(mediaTypeRaw)) type = 'AUDIO';
            else if (['STICKER'].includes(mediaTypeRaw)) type = 'STICKER';
            else if (['TEXT', 'CHAT'].includes(mediaTypeRaw) && !mediaRef) type = 'TEXT';
            else if (mediaTypeRaw) type = 'UNKNOWN';

            // HEURISTIC MEDIA LINKING
            let linkedMedia: InternalMedia | undefined;
            if (type === 'IMAGE' || type === 'VIDEO' || (type === 'UNKNOWN' && mediaRef)) {
                // 1. Exact match
                if (mediaRef && mediaMap.has(mediaRef)) {
                    const file = mediaMap.get(mediaRef)!;
                    linkedMedia = {
                        type: type === 'VIDEO' ? 'video' : 'image',
                        uri: file.name,
                        filename: file.name.split('/').pop() || ''
                    };
                } 
                // 2. Time-based match (Window of 15 seconds, wider window for safety)
                if (!linkedMedia) {
                    const match = findMediaNear(timestamp);
                    if (match) {
                        linkedMedia = {
                            type: match.type,
                            uri: match.file.name,
                            filename: match.file.name.split('/').pop() || ''
                        };
                    }
                }
                
                if (linkedMedia && type === 'UNKNOWN') {
                    type = linkedMedia.type === 'video' ? 'VIDEO' : 'IMAGE';
                }
            }

            if (textContent || linkedMedia || (type !== 'TEXT' && type !== 'UNKNOWN')) {
                chat.messages.push({
                    id: `${timestamp}-${chat.messages.length}`,
                    sender: from,
                    timestamp,
                    type,
                    content: textContent,
                    media: linkedMedia,
                    isSaved
                });
                
                chat.messageCount++;
                if (linkedMedia) chat.mediaCount++;
                if (timestamp > chat.lastActivity) chat.lastActivity = timestamp;
            }
        }
    };

    for (const listData of messageLists) {
        processMessageList(listData.list, listData.isSaved);
    }

    const chats = Array.from(chatsMap.values())
        .sort((a, b) => b.lastActivity - a.lastActivity);

    const validChats = chats.filter(c => c.messages.length > 0);
    validChats.forEach(c => c.messages.sort((a, b) => a.timestamp - b.timestamp));

    if (validChats.length === 0) {
        throw new Error("No messages could be parsed. Please check if the archive contains valid chat history.");
    }

    return {
        chats: validChats,
        owner,
        zip,
        stats: {
            totalChats: validChats.length,
            totalMessages: validChats.reduce((acc, c) => acc + c.messageCount, 0),
            totalMedia: validChats.reduce((acc, c) => acc + c.mediaCount, 0)
        }
    };
};
