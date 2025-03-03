
import type { Lead } from "./lead";
import type { Message } from "./message";

export interface Conversation {
  conversation_id: string;
  created_at: string;
  updated_at: string;
  lead_id?: string;
  lead?: Lead;
  participants?: any[]; // Conversation participants
  customer_name?: string; // Added for display purposes
  messages?: Message[];
}
