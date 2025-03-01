
export interface Profile {
  id: string;
  name: string | null;
  email: string;
}

export interface Message {
  message_id: string;
  conversation_id: string;
  sender_participant_id: string;
  content: string;
  is_read: boolean;
  created_at: string;
}

export interface Conversation {
  conversation_id: string;
  created_at: string;
  updated_at: string;
  lead_id: string | null;
  sender?: Profile;
  receiver?: Profile;
  lead?: Lead | null;
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
  pipeline_id?: string;
}

export interface Pipeline {
  id: string;
  name: string;
  is_default?: boolean;
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
  updated_at?: string;
  pipeline_stage_id?: string | null;
  customer_id?: string | null;
  user_id: string;
  value?: number | null;
  company_name?: string | null;
  company_address?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
  contact_first_name?: string | null;
  customer?: Customer | null;
}
