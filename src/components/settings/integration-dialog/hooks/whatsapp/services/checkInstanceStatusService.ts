
import { evolutionServerUrl, getEvolutionApiKey } from "./config";

/**
 * Checks the connection status of a specific WhatsApp instance
 * 
 * @param instanceId ID of the instance to check
 * @returns Object with connection state information or error
 */
export default async function checkInstanceStatus(instanceId: string) {
  try {
    // Get API key
    const apiKey = await getEvolutionApiKey();
    if (!apiKey) {
      console.error("Failed to retrieve Evolution API key for checking instance status");
      return { error: "API key not available" };
    }

    const baseUrl = evolutionServerUrl;
    if (!baseUrl) {
      console.error("Evolution API base URL is not configured");
      return { error: "API URL not configured" };
    }

    // Build URL for connection state check
    const statusUrl = `${baseUrl}/instance/connectionState/${instanceId}`;
    console.log(`Checking instance status at: ${statusUrl}`);

    // Send request
    const response = await fetch(statusUrl, {
      method: 'GET',
      headers: {
        'apikey': apiKey
      }
    });

    // Handle error responses
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Error checking instance status: ${response.status} - ${errorText}`);
      return { error: `Server error: ${response.status}` };
    }

    // Parse response
    const data = await response.json();
    console.log(`Status for instance ${instanceId}:`, data);

    // Extract connection state from different possible response formats
    const state = data.state || 
                  data.connectionStatus || 
                  data.status || 
                  (data.instance && data.instance.state);

    return { state };
  } catch (error) {
    console.error(`Exception checking status for instance ${instanceId}:`, error);
    return { error: error.message };
  }
}
