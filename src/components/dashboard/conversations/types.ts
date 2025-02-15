
export interface Profile {
  id: string;
  name: string | null;
  email: string;
}

export interface Message {
  message_id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  is_read: boolean;
  created_at: string;
}

export interface Conversation {
  conversation_id: string;
  sender_id: string;
  receiver_id: string;
  created_at: string;
  updated_at: string;
  sender: Profile;
  receiver: Profile;
}
