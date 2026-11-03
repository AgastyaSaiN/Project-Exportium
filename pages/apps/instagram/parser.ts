import type { ZipArchive } from '../../../utils/zipArchive';
import { Chat, Message } from './types';
import { fixEncoding, normalizeMessages } from './messages';
import { parseInWorker } from '../../../utils/parseInWorker';
import { relativePathOf } from '../../../utils/fileSystem';
import type { PickedFile } from '../../../utils/fileSystem';

export { fixEncoding, normalizeMessages };

export interface PendingChatData {
    title: string;
    lastActivity: number;
    id: string;
    path: string;
    participants: { name: string }[];
    messages: Message[];
    fileMap: Map<string, File>;
}

// Chat folder names can contain regex metacharacters, e.g. "john_(work)".
export const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
export const messageFilePattern = (folderPath: string) =>
    new RegExp(`^${escapeRegExp(folderPath)}/message_\\d+\\.json$`);

// Runs `task` over `items` with at most `limit` in flight, keeping memory bounded on big archives.
export const mapWithConcurrency = async <T, R>(
    items: T[],
    limit: number,
    task: (item: T) => Promise<R>
): Promise<R[]> => {
    const results: R[] = new Array(items.length);
    let cursor = 0;
    const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
        while (cursor < items.length) {
            const index = cursor++;
            results[index] = await task(items[index]);
        }
    });
    await Promise.all(workers);
    return results;
};

const findUsernameRecursive = (obj: unknown): string | null => {
    if (!obj || typeof obj !== 'object') return null;
    for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
            const value = (obj as Record<string, unknown>)[key];
            if (key.toLowerCase() === 'username' && typeof value === 'string') return value;
            const result = findUsernameRecursive(value);
            if (result) return result;
        }
    }
    return null;
};

/** Works out whose archive this is from the file name, falling back to the account info JSON. */
export const detectOwnerName = async (zip: ZipArchive, archiveFileName: string): Promise<string | null> => {
    const match = archiveFileName.match(/^instagram-(.+?)-\d{4}-\d{2}-\d{2}-/);
    if (match && match[1]) return fixEncoding(match[1]);

    const userInfoFiles = ['account_information/personal_information.json', 'personal_information/personal_information.json'];
    for (const path of userInfoFiles) {
        const file = zip.file(path);
        if (!file) continue;
        try {
            const data = JSON.parse(await file.async('string'));
            const username = data?.profile_user?.username || findUsernameRecursive(data.profile) || findUsernameRecursive(data);
            if (username) return fixEncoding(username);
        } catch (e) {
            console.warn(`Could not parse user info file: ${path}`, e);
        }
    }
    return null;
};

/** Lists conversations (title, participants, last activity) without loading every message. */
export const scanChats = async (zip: ZipArchive): Promise<Chat[]> => {
    const chatFolders = new Set<string>();
    zip.file(/message_1\.json$/).forEach(file => {
        if (!file.name.includes('messages/')) return;
        const pathParts = file.name.split('/');
        pathParts.pop();
        const folderPath = pathParts.join('/');
        if (folderPath) chatFolders.add(folderPath);
    });

    const scanned = await mapWithConcurrency(Array.from(chatFolders), 4, async (folderPath): Promise<Chat | null> => {
        try {
            const firstMessageFile = zip.file(`${folderPath}/message_1.json`);
            if (!firstMessageFile) return null;
            const head = await parseInWorker('instagramChatHead', { text: await firstMessageFile.async('string') });
            return {
                id: folderPath,
                path: folderPath,
                title: head.title,
                participants: head.participants,
                messages: [],
                lastActivity: head.lastActivity,
            };
        } catch {
            return null;
        }
    });

    return scanned
        .filter((c): c is Chat => c !== null && (c.lastActivity ?? 0) > 0)
        .sort((a, b) => (b.lastActivity ?? 0) - (a.lastActivity ?? 0));
};

/** Loads and merges every message_N.json of one conversation, oldest first. */
export const loadChatMessagesFromZip = async (zip: ZipArchive, chatPath: string): Promise<Message[]> => {
    const messageFiles = zip.file(messageFilePattern(chatPath));
    if (!messageFiles || messageFiles.length === 0) return [];

    try {
        const texts = await Promise.all(messageFiles.map(file => file.async('string')));
        return await parseInWorker('instagramMessages', { texts });
    } catch (error) {
        console.error(`Failed to load messages for ${chatPath}:`, error);
        throw new Error("Could not load conversation. The file might be corrupt.");
    }
};

/** Reads a single unzipped chat folder (the files picked via a directory input). */
export const readChatFolder = async (fileList: File[]): Promise<{ pending: PendingChatData; participants: string[] }> => {
    const firstPath = (fileList[0] as PickedFile).webkitRelativePath;
    if (!firstPath) {
        throw new Error("Your browser does not support folder uploads. Please try Chrome, Edge, or Firefox.");
    }
    const basePath = firstPath.substring(0, firstPath.indexOf('/') + 1);

    const fileMap = new Map<string, File>();
    fileList.forEach((file) => {
        const relativePath = relativePathOf(file).replace(basePath, '');
        if (relativePath) fileMap.set(relativePath, file);
    });

    const message1File = fileMap.get('message_1.json');
    if (!message1File) {
        throw new Error("This doesn't look like a valid Instagram chat folder. Could not find 'message_1.json'.");
    }

    const head = await parseInWorker('instagramChatHead', { text: await message1File.text() });
    const participants = head.participants.map(p => p.name);

    const messageFileNames = Array.from(fileMap.keys()).filter(k => /^message_\d+\.json$/.test(k));
    const texts = await Promise.all(messageFileNames.map(name => fileMap.get(name)!.text()));
    const messages = await parseInWorker('instagramMessages', { texts });
    if (messages.length === 0) {
        throw new Error("No messages found in the provided folder.");
    }

    return {
        participants,
        pending: {
            title: head.title,
            lastActivity: messages[messages.length - 1].timestamp_ms,
            id: basePath,
            path: basePath,
            participants: head.participants,
            messages,
            fileMap,
        },
    };
};
