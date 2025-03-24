
// Types for the settings section
export interface Integration {
  id: string;
  name: string;
  type: string;
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
