
// Import services from the correct location, not from config
import { ConnectionState } from "@/components/settings/types";

/**
 * Checks the connection state of a specific Evolution API instance.
 * @param instanceName The name of the instance to check.
 * @param apiKey The API key for authentication.
 * @param serverUrl The server URL to make the request to.
 * @returns Connection state as a string.
 */
async function checkInstanceStatus(
  instanceName: string,
  apiKey: string,
  serverUrl: string
): Promise<ConnectionState> {
  // Verify essential parameters
  if (!apiKey) {
    console.error('API key is missing.');
    return 'unknown';
  }
  if (!instanceName) {
    console.error('Instance name is missing.');
    return 'unknown';
  }
  if (!serverUrl) {
    console.error('Server URL is missing.');
    return 'unknown';
  }

  // Construct the URL for the status check endpoint
  const url = `${serverUrl}/instance/connectionState/${instanceName}`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'apikey': apiKey,
        'Content-Type': 'application/json'
      },
    });

    if (!response.ok) {
      // Log more details for debugging
      const errorBody = await response.text();
      console.error(`Error checking instance status for ${instanceName}:`, response.status, response.statusText, errorBody);
      return 'close';
    }

    const result = await response.json();
    // The API might return different formats, but we want to extract the state
    const state = result.state || 
                 (result.instance && result.instance.state) || 
                 (result.connection && result.connection.state) || 
                 'unknown';
    
    console.log(`Status check result for ${instanceName}:`, result, 'Extracted state:', state);
    
    // Map API response to our ConnectionState type
    if (state === 'open') return 'open';
    if (state === 'close' || state === 'closed') return 'close';
    if (state === 'connecting') return 'connecting';
    if (state === 'qrcode' || state === 'qr') return 'qrcode';
    
    // Default fallback
    return 'unknown';
  } catch (error) {
    console.error(`Error during instance status check for ${instanceName}:`, error);
    return 'unknown';
  }
}

export default checkInstanceStatus;
