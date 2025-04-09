import { getEvolutionCredentials } from '../utils/credentials';

// Updated interface to match observed log structure
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
  integrationId: string
): Promise<ConnectInstanceResponse | null> {
  try {
    const { apiKey, baseUrl } = await getEvolutionCredentials(integrationId);
    const connectUrl = `${baseUrl}/instance/connect/${instanceName}`;

    const response = await fetch(connectUrl, {
      method: 'GET',
      headers: {
        apikey: apiKey,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.error(`Failed to connect instance ${instanceName}: ${response.status} ${response.statusText}`);
      return null;
    }

    const responseData: ConnectInstanceResponse = await response.json();
    console.log(`Successfully connected to instance ${instanceName}. Response:`, responseData);
    return responseData;
  } catch (error) {
    console.error(`Error connecting to instance ${instanceName}:`, error);
    return null;
  }
}
