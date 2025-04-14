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

// Define the structure for the Setting object nested within EvolutionInstance
interface EvolutionInstanceSetting {
  id?: string;
  rejectCall?: boolean;
  msgCall?: string;
  groupsIgnore?: boolean;
  alwaysOnline?: boolean;
  readMessages?: boolean;
  readStatus?: boolean;
  syncFullHistory?: boolean;
  wavoipToken?: string;
  createdAt?: string; // Assuming ISO date string
  updatedAt?: string; // Assuming ISO date string
  instanceId?: string;
}

// Define the structure for the _count object nested within EvolutionInstance
interface EvolutionInstanceCount {
  Message?: number;
  Contact?: number;
  Chat?: number;
}

// Define the structure for an Evolution API instance based on the provided API response
export interface EvolutionInstance {
  id?: string;
  name?: string;
  connectionStatus?: 'connecting' | 'open' | 'close' | 'qrcode' | 'syncing' | string; // Allow known statuses + string
  ownerJid?: string | null;
  profileName?: string | null;
  profilePicUrl?: string | null;
  integration?: string; // e.g., "WHATSAPP-BAILEYS"
  number?: string | null;
  businessId?: string | null;
  token?: string;
  clientName?: string;
  disconnectionReasonCode?: string | null;
  disconnectionObject?: any | null; // Type unknown
  disconnectionAt?: string | null; // Assuming ISO date string
  createdAt?: string; // Assuming ISO date string
  updatedAt?: string; // Assuming ISO date string
  Chatwoot?: any | null; // Type unknown
  Proxy?: any | null; // Type unknown
  Rabbitmq?: any | null; // Type unknown
  Sqs?: any | null; // Type unknown
  Websocket?: any | null; // Type unknown
  Setting?: EvolutionInstanceSetting | null;
  _count?: EvolutionInstanceCount | null;
  // Removed the incorrect nested 'instance' object
}

// Interface for the response from the /instance/connect endpoint
export interface ConnectInstanceResponse {
  instance?: {
    instanceId?: string;
    status?: string; // e.g., 'refused', 'connecting'
  };
  qrcode?: {
    pairingCode?: string | null; // Pairing code can be null
    code?: string; // QR code string representation
    count?: number;
    base64?: string; // Base64 encoded QR code image data
  };
  // Keep potential top-level fields if they might sometimes appear (optional)
  pairingCode?: string;
  code?: string;
  count?: number;
  base64?: string;
}
