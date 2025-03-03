
import type { Lead } from "./lead";

export interface Conversation {
  conversation_id: string;
  created_at: string;
  updated_at: string;
  lead_id?: string;
  lead?: Lead;
  customer_name?: string;
}
