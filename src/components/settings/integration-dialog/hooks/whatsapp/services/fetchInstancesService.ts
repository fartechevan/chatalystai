
import { evolutionServerUrl, getEvolutionApiKey } from "./config";

/**
 * Fetches all WhatsApp instances from the Evolution API
 * 
 * @returns Array of instances or error object
 */
export default async function fetchInstances() {
  try {
    // Get the API key
    const apiKey = await getEvolutionApiKey();
    if (!apiKey) {
      console.error("Failed to retrieve Evolution API key for fetching instances");
      return { error: "API key not available" };
    }

    // Get the base URL
    const baseUrl = evolutionServerUrl;
    if (!baseUrl) {
      console.error("Evolution API base URL is not configured for fetching instances");
      return { error: "API URL not configured" };
    }

    // Construct the instances URL
    const instancesUrl = `${baseUrl}/instance/instances`;
    console.log(`Fetching instances from: ${instancesUrl}`);

    // Send the request
    const response = await fetch(instancesUrl, {
      method: 'GET',
      headers: {
        'apikey': apiKey
      }
    });

    // Handle the response
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Error fetching instances: ${response.status} - ${errorText}`);
      return { error: `Server error: ${response.status}` };
    }

    // Parse the response
    const data = await response.json();
    console.log("Fetched instances response:", data);

    // Check for error in response
    if (data.error) {
      console.error("Error in instances response:", data.error);
      return { error: data.error };
    }

    // Return the instances
    if (Array.isArray(data.instances)) {
      return data.instances;
    }
    
    // Return an empty array if no instances were found
    return [];
  } catch (error) {
    console.error("Exception fetching instances:", error);
    return { error: error.message };
  }
}
