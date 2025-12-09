
export interface TelegramTextEntity {
  type: string;
  text: string;
  href?: string;
}

export type TelegramText = string | (string | TelegramTextEntity)[];

export interface Message {
  id: number;
  type: string;
  date: string;
  date_unixtime: string;
  from: string | null;
  from_id: string;
  text: TelegramText;
  file?: string;
  photo?: string;
  video_file?: string;
  voice_message?: string;
  audio_file?: string;
  sticker_emoji?: string;
  reply_to_message_id?: number;
  forwarded_from?: string;
  width?: number;
  height?: number;
  duration_seconds?: number;
  mime_type?: string;
  thumbnail?: string;
}

export interface Chat {
  id: number;
  name: string;
  type: string;
  messages: Message[];
  lastActivity: number;
}
