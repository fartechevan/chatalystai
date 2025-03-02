
export interface Message {
  message_id: string;
  conversation_id: string;
  content: string;
  is_read: boolean;
  created_at: string;
  sender_participant_id: string;
  participant_info?: string;
}
