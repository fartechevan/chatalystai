
import type { Lead } from "./lead";
import type { Message } from "./message";

export interface ConversationParticipant {
  id: string;
  conversation_id: string;
  role: 'admin' | 'member';
  external_user_identifier?: string;
  profiles?: {
    email?: string;
  };
}

export interface Conversation {
  conversation_id: string;
  created_at: string;
  updated_at: string;
  lead_id?: string;
  lead?: Lead;
  participants?: ConversationParticipant[];
  customer_name?: string;
  messages?: Message[];
  integrations_config_id?: string;
}
