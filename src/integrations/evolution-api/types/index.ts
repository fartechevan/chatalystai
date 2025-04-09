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
  instance_display_name?: string; // Added field for stored display name
}

// Define the structure for an Evolution API instance
// Based on typical response from /instance/fetchInstances
export interface EvolutionInstance {
  instance: {
    instanceName: string;
    status: 'open' | 'connecting' | 'close' | 'qrcode' | 'syncing'; // Common statuses
    owner?: string; // Typically the phone number
    ownerJid?: string; // Added ownerJid based on API response and usage
    instanceId?: string; // Added instanceId based on API response and usage
    profileName?: string;
    profilePictureUrl?: string;
    // Add other relevant fields as needed based on actual API response
  };
  // Include other top-level properties if the API returns them
  // e.g., apiKey, version, etc. if they are part of the array elements
}
