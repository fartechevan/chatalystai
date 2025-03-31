
// Import the centralized API key and server URL
import { getEvolutionApiKey, evolutionServerUrl } from "./config";

/**
 * Checks the connection state of a specific Evolution API instance.
 * @param instanceName The name of the instance to check.
 * @returns An object containing the instance state or an error object.
 */
async function checkInstanceStatus(instanceName: string) {
  try {
    const apiKey = await getEvolutionApiKey();
    const serverUrl = evolutionServerUrl;
    
    // Verify required parameters
    if (!apiKey) {
      console.error('API key is missing from vault.');
      return { error: 'API key is required' };
    }
    
    if (!instanceName) {
      console.error('Instance name is missing.');
      return { error: 'Instance name is required' };
    }

    // Check instance connection state
    const url = `${serverUrl}/instance/connectionState/${instanceName}`;

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
      // Return a structured error
      return { error: `Failed to check instance status: ${response.status} ${response.statusText}`, status: response.status };
    }

    const result = await response.json();
    console.log(`Status check result for ${instanceName}:`, result);
    return result;
  } catch (error) {
    console.error(`Error during instance status check for ${instanceName}:`, error);
    return { error: `Internal error during status check: ${(error as Error).message}` };
  }
}

export default checkInstanceStatus;
