
import type { ConnectionState } from "@/components/settings/types";
import { getEvolutionApiCredentials } from "./utils/credentials";

/**
 * Check the status of an Evolution API instance
 */
export async function checkInstanceStatus(
  instanceId: string, 
  token?: string,
  baseUrl?: string
): Promise<ConnectionState> {
  try {
    // Get credentials if not provided
    if (!token || !baseUrl) {
      const credentials = await getEvolutionApiCredentials(undefined, instanceId);
      token = token || credentials.apiKey || '';
      baseUrl = baseUrl || credentials.baseUrl || 'https://api.evoapicloud.com';
    }
    
    if (!token) {
      console.error('No API key available for instance status check');
      return 'unknown';
    }
    
    const endpoint = `${baseUrl}/instance/connectionState/${instanceId}`;
    
    const response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'apikey': token,
      }
    });
    
    if (!response.ok) {
      const error = await response.text();
      console.error(`Error checking instance status: ${error}`);
      return 'unknown';
    }
    
    const data = await response.json();
    console.log('Instance status data:', data);
    
    // Map the Evolution API state to our ConnectionState type
    if (data.state) {
      const state = data.state.toLowerCase();
      
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
