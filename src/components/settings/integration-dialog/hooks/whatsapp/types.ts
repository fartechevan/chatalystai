
// Import the ConnectionState type from the main types file to ensure consistency
import { ConnectionState as MainConnectionState } from '../../../types';

// Use the same type definition as in the main types file
export type ConnectionState = MainConnectionState;

// Define the WhatsApp configuration type
export interface WhatsAppConfig {
  integration_id?: string;
  instance_id?: string;
  base_url?: string;
  user_reference_id?: string;
  id?: string;
}
