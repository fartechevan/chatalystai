import { supabase } from "@/integrations/supabase/client"; // Import supabase client

async function fetchInstances() {
  console.log("Fetching instances via Supabase function...");

  try {
    // Call the Supabase function 'fetch-whatsapp-instances'
    const { data, error } = await supabase.functions.invoke('fetch-whatsapp-instances');

    if (error) {
      console.error('Error invoking Supabase function fetch-whatsapp-instances:', error);
      // Type guard for Supabase Function error structure
      let errorDetails = error.message;
      if (typeof error === 'object' && error !== null && 'context' in error && typeof (error as { context: unknown }).context === 'object' && (error as { context: unknown }).context !== null && 'details' in (error as { context: { details: unknown } }).context) {
          errorDetails = (error as { context: { details: string } }).context.details || error.message;
      }
      console.error("Function invocation error details:", errorDetails);
      // Return an error object compatible with how the original function handled errors
      return { error: `Failed to fetch instances via Supabase function: ${errorDetails}` };
    }

    console.log('Instances response from Supabase function:', data);

    // Check if the function returned an error structure from the Evolution API call
    if (data && data.error) {
        console.error(`Evolution API returned an error via Supabase function: ${data.error}`, data);
        return { error: `Evolution API error: ${data.error}`, details: data.details };
    }

    // Validate the structure - it should be an array based on original logic
    if (Array.isArray(data)) {
      return data; // Return the array of instances
    } else {
      console.error('Unexpected response format from Supabase function. Expected an array:', data);
      return { error: 'Unexpected response format from server (expected array).' };
    }

  } catch (err) {
    console.error('Error during fetchInstances service call:', err);
    return { error: `Internal server error during fetch operation: ${(err as Error).message}` };
  }

  /* --- Original direct fetch logic (to be removed/refactored) --- */
  /*
  const apiKey = evolutionApiKey;
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
  */
}

// Ensure the function is exported as default
export default fetchInstances;
