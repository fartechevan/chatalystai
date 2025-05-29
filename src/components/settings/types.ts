
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
  status?: 'available' | 'coming_soon' | string; // Original availability status
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
