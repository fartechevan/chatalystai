
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
  sender_type: string;
  receiver_type: string;
  created_at: string;
  updated_at: string;
  sender: Profile;
  receiver: Profile;
}

export interface ConversationSummary {
  conversation_id: string;
  created_at: string;
  id: string;
  summary: string;
}

export interface PipelineStage {
  id: string;
  name: string;
  position: number;
}

export interface Pipeline {
  id: string;
  name: string;
  stages?: PipelineStage[];
}

export interface Customer {
  id: string;
  name: string;
  phone_number: string;
  email?: string;
}

export interface Lead {
  id: string;
  name: string;
  created_at: string;
  pipeline_id?: string;
  stage_id?: string;
  customer_id?: string;
  tags?: string[];
}
