// Import the ConnectionState type from the main settings types file to ensure consistency
import { ConnectionState as MainConnectionState } from '@/components/settings/types'; // Updated import path

// Use the same type definition as in the main types file
export type ConnectionState = MainConnectionState;

// Define the WhatsApp configuration type (keeping it generic for potential reuse)
export interface EvolutionApiConfig {
  integration_id?: string;
  instance_id?: string;
  base_url?: string;
  user_reference_id?: string;
  id?: string;
  token?: string; // Added token field as it's used in hooks
}
