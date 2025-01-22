export type TimeRange = "daily" | "weekly" | "monthly" | "yearly";

export interface ConversationMessage {
  sender: "user" | "bot";
  content: string;
  timestamp: string;
}

export interface Conversation {
  id: string;
  user_id: string;
  session_id: string;
  created_at: string;
  messages: ConversationMessage[];
}

export interface ChartData {
  name: string;
  users: number;
}