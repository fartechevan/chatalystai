import { apiServiceInstance } from "@/services/api/apiService";
import type { ConnectionState } from "../types";

// Interface for the expected response structure from the status endpoint
interface InstanceStatusResponse {
  instance?: {
    state?: string; // The connection state string (e.g., 'open', 'close', 'connecting')
    // other potential fields...
  };
  // other potential top-level fields...
}


/**
 * Check the status of a WhatsApp instance using ApiService.
 * @param instanceId The ID of the instance to check.
 * @param instanceToken The specific token for this instance.
 * @param baseUrl The base URL for the Evolution API.
 * @returns Promise<ConnectionState> The connection state ('open', 'close', 'connecting', 'unknown').
 */
export const checkInstanceStatus = async (
  instanceId: string | null,
  instanceToken: string | null, // Token to use
  baseUrl: string | null,
): Promise<ConnectionState> => {
  if (!instanceId || !instanceToken || !baseUrl) {
    // console.error("checkInstanceStatus: Instance ID, Instance Token, and Base URL are required."); // Removed log
    return 'unknown'; // Return 'unknown' as per original logic
  }

  try {
    // 1. Construct the Evolution API URL
    const apiUrl = `${baseUrl}/instance/connectionState/${instanceId}`;

    // 2. Make the request using ApiService
    const result = await apiServiceInstance.request<InstanceStatusResponse>(apiUrl, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "apikey": instanceToken, // Use the provided instance token
      },
    });

    // 3. Determine connection state from the successful response data
    const connectionStatus = result?.instance?.state;
    // console.log(`checkInstanceStatus: Connection status detected for ${instanceId}:`, connectionStatus); // Removed log

    if (connectionStatus === 'open') {
      return 'open';
    } else if (['connecting', 'qrcode', 'syncing'].includes(connectionStatus ?? '')) { // Handle potential null/undefined
      return 'connecting';
    } else if (connectionStatus === 'close') {
      return 'close';
    } else {
      // console.warn(`checkInstanceStatus: Unexpected connection status '${connectionStatus}' for instance ${instanceId}. Returning 'unknown'.`); // Removed log
      return 'unknown';
    }

  } catch (error) {
     // Check if the error is a 404 from the ApiService
     if (error instanceof Error && error.message.includes('Status: 404')) {
       // console.warn(`checkInstanceStatus: Instance ID ${instanceId} not found (Status: 404). Returning 'close'.`); // Removed log
       return 'close'; // Treat 404 as 'close' as per original logic
     }

    // Log the specific service error context before returning 'unknown'
    // console.error(`checkInstanceStatus: Error checking status for instance ${instanceId}:`, error); // Removed log
    return 'unknown'; // Return 'unknown' on any other exception
  }
};
