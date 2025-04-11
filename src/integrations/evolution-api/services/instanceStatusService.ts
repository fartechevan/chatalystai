
import type { ConnectionState } from "@/components/settings/types";
import { getEvolutionApiCredentials } from "./utils/credentials";

/**
 * Check the status of an Evolution API instance
 * @param instanceId The ID of the instance
 * @param token Optional token for the instance (overrides credentials from other sources)
 * @param baseUrl Optional base URL for the instance (overrides credentials from other sources)
 * @returns The connection state
 */
export async function checkInstanceStatus(
  instanceId: string,
  token?: string,
  baseUrl?: string
): Promise<ConnectionState> {
  try {
    console.log(`Checking status for instance: ${instanceId}`);
    
    // Get credentials if not provided
    if (!token || !baseUrl) {
      const credentials = await getEvolutionApiCredentials(undefined, instanceId);
      if (!token) token = credentials.apiKey || undefined;
      if (!baseUrl) baseUrl = credentials.baseUrl || undefined;
    }
    
    // If still no credentials, return unknown
    if (!token || !baseUrl) {
      console.error("Missing credentials for instance status check");
      return 'unknown';
    }

    const endpoint = `${baseUrl}/instance/connectionState/${instanceId}`;
    
    const response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'apikey': token,
      },
    });

    // Attempt to parse the response
    const data = await response.json();
    
    if (!response.ok) {
      console.error(`Error checking instance status: ${data.error || response.statusText}`);
      return 'unknown';
    }
    
    console.log('Instance status response:', data);
    
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
