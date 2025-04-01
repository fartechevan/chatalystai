
// Import the centralized API key and server URL
import { evolutionApiKey, evolutionServerUrl, getEvolutionApiKey } from "./config";
import { getDirectApiKey, getCurrentApiKey } from "./directKeyService";

/**
 * Checks the connection state of a specific Evolution API instance.
 * @param instanceName The name of the instance to check.
 * @returns An object containing the instance state or an error object.
 */
async function checkInstanceStatus(instanceName: string) {
  console.log(`Starting status check for instance: ${instanceName}`);
  
  // Try to use the imported key first
  let apiKey = evolutionApiKey;
  console.log('Initial API key state:', apiKey ? `${apiKey.substring(0, 5)}...` : 'empty');
  
  // If the key is empty, try various fallback methods
  if (!apiKey) {
    console.log('API key not loaded yet, trying multiple fallback methods...');
    
    // First check if we have a temporary key in localStorage
    const tempKey = getCurrentApiKey();
    if (tempKey) {
      console.log('Using temporary key from localStorage');
      apiKey = tempKey;
    } else {
      // Try the original method
      try {
        console.log('Trying original vault method...');
        apiKey = await getEvolutionApiKey();
        console.log('Successfully fetched API key from vault:', apiKey.substring(0, 5) + '...');
      } catch (vaultError) {
        console.error('Failed with original vault method:', vaultError);
        
        // Try the edge function method as last resort
        try {
          console.log('Trying Edge Function method...');
          apiKey = await getDirectApiKey();
          console.log('Successfully fetched API key from Edge Function:', apiKey.substring(0, 5) + '...');
        } catch (edgeError) {
          console.error('Failed with Edge Function method:', edgeError);
          return { error: 'Could not retrieve API key through any available method.' };
        }
      }
    }
  }
  
  const serverUrl = evolutionServerUrl; // Use the imported server URL
  // Assuming the endpoint to check a specific instance's state is /instance/connectionState/{instanceName}
  // Verify this endpoint with the Evolution API documentation if issues arise.
  const url = `${serverUrl}/instance/connectionState/${instanceName}`;

  if (!apiKey) {
    console.error('API key is missing - cannot proceed with status check');
    return { error: 'API key is required and could not be retrieved' };
  }
  
  if (!instanceName) {
    console.error('Instance name is missing.');
    return { error: 'Instance name is required' };
  }

  try {
    console.log(`Checking status for instance ${instanceName} with API key: ${apiKey.substring(0, 5)}...`);
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'apikey': apiKey,
        'Content-Type': 'application/json' // Often needed, though GET might not strictly require it
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
    // The result structure might be simple like { state: 'open' } or more complex.
    // Adjust parsing based on the actual API response.
    console.log(`Status check result for ${instanceName}:`, result);
    return result; // e.g., { state: 'open' } or similar
  } catch (error) {
    console.error(`Error during instance status check for ${instanceName}:`, error);
    return { error: `Internal server error during status check: ${(error as Error).message}` };
  }
}

export default checkInstanceStatus;
