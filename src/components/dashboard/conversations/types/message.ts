
export interface Message {
  message_id: string;
  conversation_id: string;
  content: string | null; // Can be null, e.g., for media messages without caption
  is_read: boolean;
  created_at: string;
  sender_participant_id: string;
  sender: { // Made sender non-optional
    id: string;
    role: 'admin' | 'member';
    external_user_identifier: string | null; // Explicitly allow null
    customer_id: string | null; // Explicitly allow null
  };
  participant_info?: string;
  whatsapp_id?: string; // Optional ID linking to WhatsApp message
  wamid: string | null; // WhatsApp Message ID, can be null from DB
  media_type: string | null;
  media_data: unknown | null; // Can be complex object like imageMessage, videoMessage etc.
}
