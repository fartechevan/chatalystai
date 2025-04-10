import { apiServiceInstance } from '@/services/api/apiService';
import { getEvolutionCredentials } from '../utils/credentials';

// Interface for the expected response structure when connecting
interface ConnectInstanceResponse {
  instance?: {
    instanceId?: string;
    status?: string;
  };
  qrcode?: {
    pairingCode?: string | null; // Pairing code can be null
    code?: string;
    count?: number;
    base64?: string;
  };
  // Keep top-level fields if they might sometimes appear (optional)
  pairingCode?: string;
  code?: string;
  count?: number;
  base64?: string;
}


export async function connectToInstance(
  instanceName: string,
  integrationId: string,
): Promise<ConnectInstanceResponse | null> {
  if (!instanceName) {
    // console.error("connectToInstance: Instance name is required."); // Removed log
    // Optionally throw an error or return null based on desired strictness
    return null;
  }
   if (!integrationId) {
    // console.error("connectToInstance: Integration ID is required."); // Removed log
    return null;
  }

  try {
    // 1. Get credentials
    const { apiKey, baseUrl } = await getEvolutionCredentials(integrationId);

    // 2. Construct URL
    const connectUrl = `${baseUrl}/instance/connect/${instanceName}`;

    // 3. Make request using ApiService
    const responseData = await apiServiceInstance.request<ConnectInstanceResponse>(connectUrl, {
      method: 'GET',
      headers: {
        apikey: apiKey,
        'Content-Type': 'application/json',
      },
    });

    // 4. Return successful response data
    // Logging is handled by ApiService if enabled
    return responseData;

  } catch (error) {
    // Log the specific service error context before returning null
    // console.error(`connectToInstance: Error connecting to instance ${instanceName} (Integration: ${integrationId}):`, error); // Removed log
    // Return null to indicate connection failure, as per original logic
    return null;
  }
}
