
import { openZip, ZipEntry } from '../../../utils/zipArchive';
import { Chat } from './types';
import { parseInWorker } from '../../../utils/parseInWorker';
import { relativePathOf } from '../../../utils/fileSystem';

export interface ParserResult {
    chats: Chat[];
    ownerId: string;
    fileMap: Map<string, File | ZipEntry>;
    rootPath: string;
}

const isTelegramExportJSON = (json: Record<string, unknown> & { about?: string; chats?: { list?: unknown }; name?: unknown; type?: unknown; messages?: unknown }): boolean => {
    return (
        (typeof json.about === 'string' && json.about.includes('Telegram')) || 
        (!!json.chats && Array.isArray(json.chats.list)) ||
        (json.personal_information !== undefined) ||
        (!!json.name && !!json.type && !!json.messages) // Single chat export
    );
};

export const parseTelegramArchive = async (
    input: File | FileList,
    onProgress: (step: string) => void
): Promise<ParserResult> => {
    let resultJsonContent: string = '';
    const fileMap = new Map<string, File | ZipEntry>();
    let rootPath = '';
    let usedFileName = 'result.json';

    const isFile = input instanceof File;
    const isZip = isFile && (input.name.toLowerCase().endsWith('.zip') || input.type === 'application/zip');
    const isJson = isFile && input.name.toLowerCase().endsWith('.json');
    // Check for FileList or array-like object of Files
    const isFileList = input instanceof FileList || (!isFile && (input as ArrayLike<File>).length !== undefined && (input as ArrayLike<File>)[0] instanceof File);

    // Handle ZIP
    if (isZip) {
        onProgress('Loading ZIP file...');
        const zip = await openZip(input as File);
        
        // Find result.json case-insensitively
        const files = Object.keys(zip.files);
        let resultPath = files.find(f => f.match(/result\.json$/i) && !f.startsWith('__MACOSX'));
        
        // Fallback: Look for ANY json that looks like a telegram export
        if (!resultPath) {
             const jsonFiles = files.filter(f => f.toLowerCase().endsWith('.json') && !f.startsWith('__MACOSX'));
             for (const jsonPath of jsonFiles) {
                 try {
                     const content = await zip.files[jsonPath].async('string');
                     // Quick check first few chars to avoid parsing massive non-JSON files
                     if (content.trim().startsWith('{')) {
                         const json = JSON.parse(content);
                         if (isTelegramExportJSON(json)) {
                             resultPath = jsonPath;
                             break;
                         }
                     }
                 } catch {
                     // Ignore parse errors for non-target files
                 }
             }
        }

        if (!resultPath) {
            // Check for HTML export indicators
            if (files.some(f => f.endsWith('messages.html'))) {
                throw new Error("It looks like you uploaded an HTML export. Please export your data from Telegram Desktop as JSON (Machine-readable format).");
            }
            throw new Error("Could not find 'result.json' or any valid Telegram data in the archive.");
        }

        // Set root path (e.g., "Telegram Export/result.json" -> "Telegram Export/")
        // If result.json is at root, rootPath is empty string
        const fileNameIndex = resultPath.lastIndexOf('/');
        rootPath = fileNameIndex > 0 ? resultPath.substring(0, fileNameIndex + 1) : '';
        usedFileName = resultPath.split('/').pop() || 'result.json';
        
        onProgress('Reading export data...');
        resultJsonContent = await zip.files[resultPath].async('string');

        // Build file map relative to root
        files.forEach(path => {
            if (!zip.files[path].dir && !path.startsWith('__MACOSX')) {
                // Store with path relative to the export root
                // If rootPath is "Export/", and path is "Export/photos/file.jpg", relative is "photos/file.jpg"
                const relativePath = path.startsWith(rootPath) ? path.substring(rootPath.length) : path;
                fileMap.set(relativePath, zip.files[path]);
            }
        });

    } 
    // Handle Single JSON File (Text only mode)
    else if (isJson) {
        onProgress('Reading JSON file...');
        resultJsonContent = await (input as File).text();
        // No media files in this mode
        rootPath = '';
    }
    // Handle Folder
    else if (isFileList) {
        onProgress('Scanning folder...');
        const fileList = Array.from(input as unknown as ArrayLike<File>);
        
        // 1. Try finding result.json case-insensitively
        let resultFile = fileList.find(f => f.name.toLowerCase() === 'result.json' || f.name.toLowerCase() === 'export_result.json');
        
        // 2. Fallback: Search for ANY valid Telegram JSON in the folder
        if (!resultFile) {
            const jsonCandidates = fileList.filter(f => f.name.toLowerCase().endsWith('.json') && !f.name.startsWith('.'));
            
            for (const candidate of jsonCandidates) {
                try {
                    // Read first 50KB to check structure before full parse (increased from 1KB)
                    // "about" section usually appears at the top.
                    const slice = candidate.slice(0, 1024 * 50); 
                    const text = await slice.text();
                    
                    // Basic heuristic check strings before full parse
                    // Check for quoted keys to avoid false positives in random text
                    if (
                        text.includes('"about"') || 
                        text.includes('"personal_information"') || 
                        text.includes('"chats"') || 
                        (text.includes('"name"') && text.includes('"messages"'))
                    ) {
                         // Looks promising, try full parse
                         const fullText = await candidate.text();
                         const json = JSON.parse(fullText);
                         if (isTelegramExportJSON(json)) {
                             resultFile = candidate;
                             // We'll reuse the content we just read
                             resultJsonContent = fullText; 
                             break;
                         }
                    }
                } catch {
                    continue;
                }
            }
        }

        if (!resultFile) {
            // Check for HTML export
            if (fileList.some(f => f.name.toLowerCase() === 'messages.html')) {
                throw new Error("It looks like you uploaded an HTML export. Please export your data from Telegram Desktop as JSON (Machine-readable format).");
            }
            throw new Error("Could not find 'result.json' in the folder. Please ensure you selected the correct Telegram export folder.");
        }

        // Determine root path based on webkitRelativePath
        // e.g. "Downloads/Telegram Export/result.json" -> "Downloads/Telegram Export/"
        const fullPath = relativePathOf(resultFile);
        rootPath = fullPath.includes('/') ? fullPath.substring(0, fullPath.lastIndexOf('/') + 1) : '';
        usedFileName = resultFile.name;

        if (!resultJsonContent) {
            onProgress('Reading export data...');
            resultJsonContent = await resultFile.text();
        }

        // Build file map
        fileList.forEach(file => {
            const path = relativePathOf(file);
            if (path.startsWith(rootPath)) {
                const relativePath = path.substring(rootPath.length);
                fileMap.set(relativePath, file);
            } else {
                // Fallback for flat lists or unexpected structures
                fileMap.set(file.name, file);
            }
        });
    } else {
        throw new Error("Unsupported input type. Please upload a ZIP file, a Folder, or the 'result.json' file.");
    }

    onProgress('Parsing chats...');
    const { chats, ownerId } = await parseInWorker('telegram', { text: resultJsonContent, fileName: usedFileName });

    return {
        chats,
        ownerId,
        fileMap,
        rootPath
    };
};
