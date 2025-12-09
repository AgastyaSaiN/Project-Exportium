
export interface SnapchatChatHistory {
  // Allow for any keys since structure varies
  [key: string]: any;
}

export interface RawSnapchatMessage {
  // Allow for any keys and case variations
  [key: string]: any;
}

export interface InternalMessage {
  id: string;
  sender: string;
  timestamp: number;
  type: 'TEXT' | 'IMAGE' | 'VIDEO' | 'AUDIO' | 'STICKER' | 'SNAP' | 'UNKNOWN';
  content?: string;
  media?: InternalMedia;
  isSaved: boolean; // Differentiates "Chat History" vs "Saved-in-Chat History"
}

export interface InternalMedia {
  type: 'image' | 'video' | 'audio';
  uri: string;
  blobUrl?: string;
  filename: string;
}

export interface InternalChat {
  id: string;
  participant: string; // The "other" person
  messages: InternalMessage[];
  messageCount: number;
  mediaCount: number;
  lastActivity: number;
}
