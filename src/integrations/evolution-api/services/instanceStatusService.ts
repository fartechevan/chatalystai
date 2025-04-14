
import type { ConnectionState } from "@/components/settings/types";
import { getEvolutionApiCredentials } from "./utils/credentials";

/**
 * Check the connection status of an Evolution API instance using its name.
 * @param instanceName The name of the instance (corresponds to instance_display_name in config).
 * @param token Optional token for the instance (overrides credentials from other sources)
 * @param baseUrl Optional base URL for the instance (overrides credentials from other sources)
 * @returns The connection state
 */
export async function checkInstanceStatus(
  instanceName: string, // Renamed parameter
  token?: string,
  baseUrl?: string
): Promise<ConnectionState> {
  try {
    console.log(`Checking status for instance: ${instanceName}`); // Log instanceName

    // Get credentials if not provided
    // TODO: Revisit credential fetching logic. Does getEvolutionApiCredentials need instanceName or instanceId?
    if (!token || !baseUrl) {
      // Passing undefined for instanceId as it's not available directly here.
      const credentials = await getEvolutionApiCredentials(undefined, undefined); // Pass undefined for instanceId
      if (!token) token = credentials.apiKey || undefined;
      if (!baseUrl) baseUrl = credentials.baseUrl || undefined;
    }
    
    // If still no credentials, return unknown
    if (!token || !baseUrl) {
      console.error("Missing credentials for instance status check");
      return 'unknown';
    }

    // Use instanceName in the endpoint URL
    const endpoint = `${baseUrl}/instance/connectionState/${instanceName}`;
    console.log(`[checkInstanceStatus] Requesting URL: ${endpoint}`); // Log the exact URL

    const response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'apikey': token,
      },
    });

    if (!response.ok) {
      const errorText = await response.text(); // Get raw response text
      console.error(`[checkInstanceStatus] Error: Status ${response.status} ${response.statusText}. URL: ${endpoint}. Response Text: ${errorText}`);
      return 'unknown';
    }

    // Attempt to parse the response *only if response.ok*
    const data = await response.json();
    
    // console.log('Instance status response:', data); // Removed log
    
    // Map the response to a connection state
    if (data.state) {
      // The API returns state as a string - map it to our ConnectionState type
      const state = data.state.toLowerCase();
      
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
