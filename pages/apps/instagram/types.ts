export interface Photo {
  uri: string;
  creation_timestamp: number;
  blobUrl?: string;
}

export interface Video {
  uri: string;
  creation_timestamp: number;
  blobUrl?: string;
}

export interface Message {
  id: string;
  sender_name: string;
  timestamp_ms: number;
  content?: string;
  photos?: Photo[];
  videos?: Video[];
}

export interface Chat {
  id: string;
  path: string;
  title: string;
  participants: { name: string }[];
  messages: Message[];
  lastActivity?: number;
}