// FIX: Removed circular import of 'Message' from './types' which was causing a conflict with the local declaration of the 'Message' interface.

export interface Message {
  id: string;
  sender_name: string;
  timestamp_ms: number;
  media_type: string;
  content?: string;
  linkedMedia?: SnapchatMedia;
}

export interface Chat {
  id:string;
  title: string;
  participants: { name: string }[];
  messages: Message[];
  lastActivity?: number;
}

export interface SnapchatMedia {
  type: 'image' | 'video' | 'sticker';
  path: string;
  blobUrl?: string;
  date?: number; // timestamp_ms
}