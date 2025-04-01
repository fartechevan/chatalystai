
// Import the centralized API key and server URL
import { evolutionApiKey, evolutionServerUrl, getEvolutionApiKey } from "./config";

async function fetchInstances() {
  // Try to use the imported key first
  let apiKey = evolutionApiKey;
  
  // If the key is empty, try to fetch it again directly
  if (!apiKey) {
    console.log('API key not loaded yet, fetching directly...');
    apiKey = await getEvolutionApiKey();
  }
  
  const serverUrl = evolutionServerUrl; // Use the URL from config
  const url = `${serverUrl}/instance/fetchInstances`;

  if (!apiKey) {
    console.error('API key is missing from config.');
    return { error: 'API key is required' };
  }
  if (!serverUrl) {
    console.error('Server URL is missing from config.');
    return { error: 'Server URL is required' };
  }

  let response: Response; // Declare response variable here
  try {
    console.log('Fetching instances with API key:', apiKey.substring(0, 5) + '...');
    response = await fetch(url, {
      method: 'GET',
      headers: {
        'apikey': apiKey, // Use the key from config
      },
    });

    if (!response.ok) {
      // Log the response text even if response.ok is false
      const responseText = await response.text();
      console.error('Error fetching instances:', response.status, response.statusText, responseText);
      // Return a more specific error message
      return { error: `Failed to fetch instances: ${response.status} ${response.statusText}. Server response: ${responseText.substring(0, 100)}...` }; // Include part of the response
    }

    // Try parsing JSON, catch the specific error
    try {
      const result = await response.json();

      // Validate the structure - it should be an array
      if (Array.isArray(result)) {
        // Return the entire array as expected by the calling component
        return result; 
      } else {
        console.error('Unexpected response format. Expected an array of instances:', result);
        return { error: 'Unexpected response format from server (expected array).' };
      }
    } catch (jsonError) {
      // Clone the response to read the text body without consuming the original stream
      const responseClone = response.clone();
      const responseText = await responseClone.text();
      console.error('Error parsing JSON response. Raw response:', responseText);
      // Log the specific JSON parsing error as well
      if (jsonError instanceof Error) {
        console.error('JSON Parsing Error:', jsonError.message);
      }
      // Return a clear error indicating a non-JSON response was received
      return { error: `Received non-JSON response from server. Content starts with: ${responseText.substring(0, 100)}...` };
    }
  } catch (error) {
    // Catch network errors or other issues with the fetch call itself
    console.error('Network or fetch error:', error);
    // It's helpful to know the URL that failed
    console.error(`Failed URL: ${url}`);
    // Check if the error object has more details
    if (error instanceof Error) {
        return { error: `Network error: ${error.message}` };
    }
    // Generic fallback error
    return { error: 'Internal server error during fetch operation.' };
  }
}

// Ensure the function is exported as default
export default fetchInstances;
