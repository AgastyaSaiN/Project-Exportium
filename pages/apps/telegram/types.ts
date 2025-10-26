
export interface Photo {
  file: string; // path to file
  width: number;
  height: number;
  blobUrl?: string;
}

export interface Video {
  file: string;
  width: number;
  height: number;
  duration_seconds: number;
  mime_type: string;
  thumb: string; // path to thumbnail
  blobUrl?: string;
  thumbBlobUrl?: string;
}

// Telegram text can be a string or an array of rich text objects
export type TelegramText = string | (string | { type: string; text: string })[];

export interface Message {
  id: number;
  type: string;
  date: string; // ISO 8601 format
  date_unixtime: string;
  from: string | null; // Can be null for service messages
  from_id: string;
  text: TelegramText;
  photo?: string; // path to photo
  video_file?: string; // path to video
  file?: string; // path to generic file
  sticker_emoji?: string;
  width?: number;
  height?: number;
  mime_type?: string;
  duration_seconds?: number;
  thumbnail?: string; // path to thumbnail
  // Custom properties for viewer
  photoData?: Photo;
  videoData?: Video;
}

export interface Chat {
  id: number;
  name: string;
  type: string;
  messages: Message[];
  // Custom properties for viewer
  lastActivity: number;
}
