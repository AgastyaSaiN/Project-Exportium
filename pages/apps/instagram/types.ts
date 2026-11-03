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

export interface AudioClip {
  uri: string;
  creation_timestamp?: number;
}

export interface Reaction {
  reaction: string;
  actor: string;
}

/** A post, reel or link someone sent into the chat. */
export interface SharedLink {
  link?: string;
  share_text?: string;
  original_content_owner?: string;
}

export interface Message {
  id: string;
  sender_name: string;
  timestamp_ms: number;
  content?: string;
  photos?: Photo[];
  videos?: Video[];
  audio_files?: AudioClip[];
  gifs?: { uri: string }[];
  sticker?: { uri: string };
  share?: SharedLink;
  reactions?: Reaction[];
  /** Length of a call, in seconds, for call entries. */
  call_duration?: number;
  is_unsent?: boolean;
}

export interface Chat {
  id: string;
  path: string;
  title: string;
  participants: { name: string }[];
  messages: Message[];
  lastActivity?: number;
}