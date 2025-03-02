
import { Lead } from "./lead";
import { Profile } from "./profile";

export interface ConversationParticipant {
  id: string;
  conversation_id: string;
  user_id?: string | null;
  external_user_identifier?: string | null;
  role?: string;
  joined_at?: string;
  profiles?: Profile;
}

export interface Conversation {
  conversation_id: string;
  created_at: string;
  updated_at: string;
  lead_id: string | null;
  participants?: ConversationParticipant[];
  customer_name?: string;
  lead?: Lead | null;
}

export interface ConversationSummary {
  conversation_id: string;
  created_at: string;
  id: string;
  summary: string;
}
