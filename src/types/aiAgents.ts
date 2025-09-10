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
 * Note: For 'chattalyst' agents, the prompt is hardcoded in the backend and not customizable.
 * The prompt field is only used for 'CustomAgent' types.
 */
export interface AIAgent {
  id: string;
  name: string;
  prompt?: string; // Optional - hardcoded for chattalyst agents, customizable for CustomAgent
  knowledge_document_ids?: string[] | null;
  is_enabled?: boolean;
  agent_type: 'chattalyst' | 'CustomAgent';
  custom_agent_config?: { webhook_url?: string; [key: string]: unknown; } | null;
  commands?: Record<string, string>; // Key-value pairs for keyword-URL/response mappings
  created_at: string;
  updated_at: string;
  // This property holds the full channel-specific settings
  channels: AgentChannel[];
  appointment_booking_enabled?: boolean;
}

/**
 * Type for creating a new AI Agent.
 * Note: prompt field is excluded for chattalyst agents as they use hardcoded prompts.
 * For CustomAgent types, include prompt in the object when creating.
 */
export type NewAIAgent = Omit<AIAgent, 'id' | 'created_at' | 'updated_at' | 'channels' | 'prompt' | 'appointment_booking_enabled'> & {
  channels: AgentChannelPayload[];
  prompt?: string; // Optional - only needed for CustomAgent types
  commands?: Record<string, string>; // Key-value pairs for keyword-URL/response mappings
  appointment_booking_enabled?: boolean; // Added for new agents
};

/**
 * Type for updating an existing AI Agent.
 * Note: prompt field is excluded for chattalyst agents as they use hardcoded prompts.
 * For CustomAgent types, prompt can be updated if needed.
 */
export type UpdateAIAgent = Partial<Omit<AIAgent, 'id' | 'created_at' | 'updated_at' | 'channels' | 'prompt' | 'appointment_booking_enabled'>> & {
  channels?: AgentChannelPayload[];
  prompt?: string; // Optional - only needed for CustomAgent types
  commands?: Record<string, string>; // Key-value pairs for keyword-URL/response mappings
  appointment_booking_enabled?: boolean; // Added for updating agents
};
