import type { ConnectionState } from "../types";

/**
 * Check the status of a WhatsApp instance directly using its token.
 * @param instanceId The ID of the instance to check.
 * @param instanceToken The specific token for this instance.
 * @param baseUrl The base URL for the Evolution API.
 * @returns Promise<ConnectionState> The connection state ('open', 'close', 'connecting', 'unknown').
 */
export const checkInstanceStatus = async (
  instanceId: string | null,
  instanceToken: string | null, // Token to use
  baseUrl: string | null
): Promise<ConnectionState> => {

  // Token is now always required
  if (!instanceId || !instanceToken || !baseUrl) {
    console.log('Instance ID, Instance Token, and Base URL are required for status check.');
    return 'unknown';
  }

  console.log(`Checking instance status for ${instanceId}...`); // Removed integrationId log

  try {
    // 1. Construct the Evolution API URL
    const apiUrl = `${baseUrl}/instance/connectionState/${instanceId}`;
    console.log(`Frontend: Checking status directly via Evolution API: ${apiUrl}`);

    // 2. Build headers using the provided token
    const headers: HeadersInit = {
      "Content-Type": "application/json",
      "apikey": instanceToken, // Always use the provided token
    };
    console.log(`Frontend: Using provided token for status check.`);


    // 3. Make the direct request to the Evolution API
    const evoResponse = await fetch(apiUrl, {
      method: "GET",
      headers: headers,
    });

    // 4. Check if the Evolution API request was successful
    if (!evoResponse.ok) {
      // Log specific errors but return 'unknown' or 'close' based on status
      const errorText = await evoResponse.text();
      console.error(`Frontend: Evolution API status check failed (${evoResponse.status}): ${errorText}`);
      // If 404 maybe instance deleted? Treat as 'close'. Otherwise 'unknown'.
      return evoResponse.status === 404 ? 'close' : 'unknown';
    }

    // 5. Parse the JSON response from Evolution API
    const result = await evoResponse.json();
    console.log(`Status check response for ${instanceId}:`, result);

    // 6. Determine connection state from the successful response data (nested under 'instance')
    const connectionStatus = result?.instance?.state; // Access nested state
    console.log('Connection status detected:', connectionStatus);

    if (connectionStatus === 'open') {
      return 'open';
    } else if (connectionStatus === 'connecting') {
      return 'connecting';
    } else {
      // Includes 'close' and any other unexpected states
      return 'close';
    }

  } catch (error) {
    // Catch errors from credential fetching or fetch itself
    console.error(`Error during checkInstanceStatus service call for instance ${instanceId}:`, error);
    return 'unknown'; // Return 'unknown' on any exception
  }
};
