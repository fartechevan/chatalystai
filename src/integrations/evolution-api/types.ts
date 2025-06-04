// Type for the data returned by the Evolution API fetchInstances endpoint
export interface EvolutionInstance {
  id?: string; // Instance ID from Evolution API (Made optional to resolve TS conflict)
  name?: string; // Instance Name from Evolution API (Made optional)
  connectionStatus: 'open' | 'connecting' | 'close' | 'qrcode' | 'syncing' | string; // Allow other strings too
  ownerJid: string | null;
  profileName?: string | null; // Optional profile name
  profilePictureUrl?: string | null; // Optional profile picture
  token: string; // Instance-specific token/hash
  // Add any other fields from the fetchInstances response you might need
}

// Type for the configuration data stored in the integrations_config table
// This might be slightly different from the API response structure
export interface EvolutionApiConfig {
  id?: string; // Row ID from integrations_config table
  integration_id: string; // Foreign key to integrations table
  base_url: string; // Base URL for the API (fetched from integrations table)
  instance_id: string | null; // Instance ID from Evolution API
  user_reference_id?: string | null; // Mapped from ownerJid
  token: string | null; // Instance token/hash
  instance_display_name: string | null; // Display name (might be profileName or name)
  // Add other config fields if necessary
}

// Type specifically for the data structure used when upserting into integrations_config
// This matches the interface defined in the backend function
export interface IntegrationConfigUpsertData {
  integration_id: string;
  status?: string | null; // Note: Status is usually live, not stored here long-term
  owner_id?: string | null;
  instance_display_name?: string | null;
  token?: string | null;
  user_reference_id?: string | null;
  instance_id?: string | null;
}

export type ConnectionState =
  | "open"
  | "connecting"
  | "close"
  | "qrcode"
  | "pairingCode"
  | "idle"
  | "unknown";

// You can add other Evolution API related types here as needed

// Type for the response from the connectToInstance service
export interface ConnectInstanceResponse {
  instance?: {
    instanceName?: string;
    status?: 'open' | 'connecting' | 'close' | string; // Changed from state to status
    // Add other potential instance properties if known
  };
  qrcode?: {
    base64?: string;
    pairingCode?: string;
  };
  base64?: string; // Optional top-level base64
  pairingCode?: string; // Optional top-level pairingCode
  // Add other potential top-level properties if known
}
