
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
  /** Telegram's own label for the attachment: voice_message, video_message, video_file, audio_file, sticker, animation. */
  media_type?: string;
  file_name?: string;
  /** Filled in while importing, from `file` and `media_type`, so viewers need not know Telegram's layout. */
  sticker_file?: string;
  document_file?: string;
  location_information?: { latitude: number; longitude: number };
  poll?: { question: string; closed?: boolean; total_voters?: number; answers: { text: string; voters: number; chosen?: boolean }[] };
  contact_information?: { first_name?: string; last_name?: string; phone_number?: string };
}

export interface Chat {
  id: number;
  name: string;
  type: string;
  messages: Message[];
  lastActivity: number;
}
