
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
