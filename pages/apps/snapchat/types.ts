
export interface Message {
  id: string;
  sender_name: string;
  timestamp_ms: number;
  media_type: string;
  content?: string;
}

export interface Chat {
  id: string;
  title: string;
  participants: { name: string }[];
  messages: Message[];
  lastActivity?: number;
}
