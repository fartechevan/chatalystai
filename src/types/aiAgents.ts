// This represents the data for a channel when creating/updating an agent
export interface AgentChannelPayload {
  integrations_config_id: string;
  is_enabled_on_channel?: boolean;
  activation_mode?: 'keyword' | 'always_on';
  keyword_trigger?: string | null;
  stop_keywords?: string[] | null;
  session_timeout_minutes?: number;
  error_message?: string;
}

// This represents the full channel data received from the backend
export interface AgentChannel extends AgentChannelPayload {
  id: string;
  agent_id: string;
  created_at: string;
  updated_at: string;
}

/**
 * Represents an AI Agent configuration as received from the backend.
 */
export interface AIAgent {
  id: string;
  name: string;
  prompt: string;
  knowledge_document_ids?: string[] | null;
  is_enabled?: boolean;
  agent_type: 'chattalyst' | 'CustomAgent';
  custom_agent_config?: { webhook_url?: string; [key: string]: unknown; } | null;
  created_at: string;
  updated_at: string;
  // This property holds the full channel-specific settings
  channels: AgentChannel[];
}

/**
 * Type for creating a new AI Agent.
 */
export type NewAIAgent = Omit<AIAgent, 'id' | 'created_at' | 'updated_at' | 'channels'> & {
  channels: AgentChannelPayload[];
};

/**
 * Type for updating an existing AI Agent.
 */
export type UpdateAIAgent = Partial<Omit<AIAgent, 'id' | 'created_at' | 'updated_at' | 'channels'>> & {
  channels?: AgentChannelPayload[];
};
