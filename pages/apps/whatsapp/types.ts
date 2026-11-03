import type { ZipEntry } from '../../../utils/zipArchive';


export interface Photo {
  uri: string;
  blobUrl?: string;
}

export interface Video {
  uri: string;
  blobUrl?: string;
}

export interface Audio {
  uri: string;
  blobUrl?: string;
}

export interface Document {
  uri: string;
  name: string;
}

/** What an attachment was, for exports made "Without media": the file is gone but we know it existed. */
export type OmittedKind = 'photo' | 'video' | 'audio' | 'sticker' | 'document' | 'media';

export interface Message {
  id: string;
  type: 'message' | 'system';
  sender_name: string | null; // Null for system messages
  timestamp_ms: number;
  content: string;
  photo?: Photo;
  video?: Video;
  audio?: Audio;
  document?: Document;
  omitted?: OmittedKind;
}

export interface Chat {
  id: string;
  title: string;
  participants: { name: string }[];
  messages: Message[];
  lastActivity?: number;
  /** Which of day / month / year comes first in the file's dates. */
  dateOrder?: 'dmy' | 'mdy' | 'ymd';
  /** True when the dates alone could not settle the order, so the reader should confirm it. */
  dateOrderAmbiguous?: boolean;
  fileMap?: Map<string, ZipEntry>; // Used to store file objects from a ZIP
}
