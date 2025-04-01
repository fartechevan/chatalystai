
// Import the centralized API key and server URL
import { evolutionApiKey, evolutionServerUrl } from "./config";

/**
 * Checks the connection state of a specific Evolution API instance.
 * @param instanceName The name of the instance to check.
 * @returns An object containing the instance state or an error object.
 */
// Remove apiKey parameter as it's now imported
async function checkInstanceStatus(instanceName: string) {
  const serverUrl = evolutionServerUrl; // Use the imported server URL
  // Assuming the endpoint to check a specific instance's state is /instance/connectionState/{instanceName}
  // Verify this endpoint with the Evolution API documentation if issues arise.
  const url = `${serverUrl}/instance/connectionState/${instanceName}`;

  // Use the imported key
  if (!evolutionApiKey) {
    console.error('API key is missing from config.');
    return { error: 'API key is required' };
  }
  if (!instanceName) {
    console.error('Instance name is missing.');
    return { error: 'Instance name is required' };
  }

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'apikey': evolutionApiKey, // Use imported key
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
