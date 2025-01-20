export interface User {
  id: string;
  email: string;
  role: "admin" | "user";
  name: string;
  createdAt: Date;
}

export interface Conversation {
  id: string;
  userId: string;
  sessionId: string;
  messages: Message[];
  sentiment: "good" | "bad";
  createdAt: Date;
}

export interface Message {
  id: string;
  content: string;
  timestamp: Date;
  sender: "user" | "system";
}

export interface UserStats {
  activeMonthly: number;
  activeWeekly: number;
  newUsers: number;
}