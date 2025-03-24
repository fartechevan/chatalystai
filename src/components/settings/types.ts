
// Types for the settings section
export interface Integration {
  id: string;
  name: string;
  type: string; // This property is required
  configuration?: Record<string, any>;
  created_at?: string;
  updated_at?: string;
  base_url?: string;
  provider?: string;
  category?: string;
  status?: string;
  icon?: string;
  // Additional fields needed in the application
  icon_url?: string;
  description?: string;
  is_connected?: boolean;
}

// Define the connection state type to include 'unknown'
export type ConnectionState = 'idle' | 'connecting' | 'open' | 'close' | 'unknown';
