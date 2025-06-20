
// Types for the settings section
export interface Integration {
  id: string;
  name: string;
  type: string; // This property is required
  configuration?: Record<string, unknown>; // Changed any to unknown
  created_at?: string;
  updated_at?: string;
  base_url?: string;
  provider?: string;
  category?: string;
  // status?: string; // Removed duplicate string status
  icon?: string;
  // Additional fields needed in the application
  icon_url?: string;
  description?: string;
  // is_connected?: boolean; // Remove is_connected
  status?: string; // Original availability status - Broadened to string
  connectionStatus?: ConnectionState; // New field for connection state
  config_id?: string; // Added optional config ID for access checks
}

// Define the connection state type to include 'unknown', 'qrcode', and 'pairingCode'
export type ConnectionState = 'idle' | 'connecting' | 'open' | 'close' | 'unknown' | 'qrcode' | 'pairingCode';

// Define a type for plan details, including integration limits
// This might require Json type from '@/types/supabase' if integration_limits is truly dynamic Json
// For now, using Record for more specific structure.
export interface PlanDetails {
  id: string;
  name: string;
  integrations_allowed?: number | null; // Total number of integration instances allowed by the plan
  max_integrations?: number | null; // Potentially for distinct integration *types* - needs clarification if different from integrations_allowed
  integration_limits?: Record<string, number | null> | null; // Specific limits for instances of a certain integration type, e.g., { "WhatsApp": 2, "Telegram": 1 }
  // Add other plan fields as necessary
}

// Type for the raw integration type data from 'integrations' table
export type DBIntegrationType = {
  id: string; 
  name: string;
  description?: string;
  base_url?: string;
  icon_url?: string;
  status?: string; // Broadened to string
  type?: string; // Optional to match potential DB nullability
};

// Type for the user's specific configuration from 'integrations_config' table
export type DBUserIntegrationConfig = {
  id: string; 
  integration_id: string; 
  profile_id?: string; 
  instance_id?: string;
  token?: string;
  status?: string | null; // Reverted to string | null to match DB
};

// Combined type for display, used in IntegrationsView and passed to cards/dialogs
export interface ProcessedIntegration {
  id: string;
  name: string;
  type: string; // Revert to required, as mapping logic provides a default
  description?: string;
  base_url?: string;
  icon_url?: string;
  status?: string; // Availability status of the integration type - Broadened to string
  connectionStatus: ConnectionState; // Actual connection status from user's config

  user_config_id?: string; // ID of the user's integrations_config record
  instance_id?: string;    // From user's config
  token?: string;          // From user's config
  connectedInstances: number; // 1 if user has a config, 0 otherwise
}
