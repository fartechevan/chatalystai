import { Customer } from "./customer";
import type { Lead } from "./lead";
import type { Message } from "./message";

export interface ConversationParticipant {
  id: string;
  conversation_id: string;
  role: 'admin' | 'member';
  external_user_identifier?: string;
  customer_id?: string; // Add this property to match the database schema
  profiles?: {
    email?: string;
  };
  customer?: Customer | null;
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
  customer?: { customer: { id?: string; name: string } }[];
}
