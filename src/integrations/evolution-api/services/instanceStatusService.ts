
import type { ConnectionState } from "../types"; // Corrected import path for ConnectionState
import { getEvolutionCredentials } from "../utils/credentials"; // Corrected import path and function name

/**
 * Check the connection status of an Evolution API instance using its name and integration ID.
 * @param instanceName The name of the instance.
 * @param integrationId The ID of the integration to fetch credentials for.
 * @returns The connection state
 */
export async function checkInstanceStatus(
  instanceName: string,
  integrationId: string // Added integrationId parameter
): Promise<ConnectionState> {
  // Removed optional token/baseUrl parameters as credentials should always be fetched via integrationId
  try {

    if (!integrationId) {
        console.error("[checkInstanceStatus] Integration ID is required.");
        return 'unknown';
    }
     if (!instanceName) {
        console.error("[checkInstanceStatus] Instance Name is required.");
        return 'unknown';
    }

    // Fetch credentials using the correct function and integrationId
    const { apiKey, baseUrl } = await getEvolutionCredentials(integrationId);

    // Use instanceName in the endpoint URL
    const endpoint = `${baseUrl}/instance/connectionState/${instanceName}`;

    const response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        // 'Content-Type': 'application/json', // Not typically needed for GET
        'apikey': apiKey, // Use the fetched apiKey
      },
    });

    if (!response.ok) {
      const errorText = await response.text(); // Get raw response text
      console.error(`[checkInstanceStatus] Error: Status ${response.status} ${response.statusText}. URL: ${endpoint}. Response Text: ${errorText}`);
      return 'unknown';
    }

    // Attempt to parse the response *only if response.ok*
    const data = await response.json();

    // Map the response to a connection state
    let state: string | undefined = undefined;
    if (data.state) {
      state = data.state.toLowerCase();
    } else if (data.instance && data.instance.state) {
      state = String(data.instance.state).toLowerCase();
    }

    if (state) {
      // Map Evolution API states to our ConnectionState type
      if (state === 'open') return 'open';
      if (state === 'connecting') return 'connecting';
      if (state === 'close') return 'close';
      if (state.includes('qrcode')) return 'qrcode';
      if (state.includes('pairing')) return 'pairingCode';
    }

    return 'unknown';
  } catch (error) {
    console.error('Error checking instance status:', error);
    return 'unknown';
  }
}
