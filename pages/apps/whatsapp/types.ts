
export interface Photo {
  uri: string;
  blobUrl?: string;
}

export interface Video {
  uri: string;
  blobUrl?: string;
}

export interface Message {
  id: string;
  type: 'message' | 'system';
  sender_name: string | null; // Null for system messages
  timestamp_ms: number;
  content: string;
  photo?: Photo;
  video?: Video;
}

export interface Chat {
  id: string;
  title: string;
  participants: { name: string }[];
  messages: Message[];
  lastActivity?: number;
  fileMap?: Map<string, any>; // Used to store file objects from a ZIP
}
