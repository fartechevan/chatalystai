import { supabase } from "@/integrations/supabase/client";
import type { ConnectionState } from "../types";

/**
 * Check the status of a WhatsApp instance via the Supabase proxy function.
 * @param instanceId The ID of the instance to check.
 * @returns Promise<ConnectionState> The connection state ('open', 'close', 'connecting', 'unknown').
 */
export const checkInstanceStatus = async (
  instanceId: string | null
): Promise<ConnectionState> => {

  if (!instanceId) {
    console.log('No valid instance ID provided for status check.');
    return 'unknown';
  }

  console.log(`Checking instance status for ${instanceId} via Supabase function 'check-whatsapp-status'...`);

  try {
    // 1. Invoke the Supabase function, passing instanceId in the body
    const { data, error } = await supabase.functions.invoke('check-whatsapp-status', {
      body: { instanceId }, // Pass instanceId in the body
    });

    // 2. Handle errors from the function invocation itself
    if (error) {
      console.error('Error invoking check-whatsapp-status function:', error);
      return 'unknown'; // Return 'unknown' on invocation error
    }

    // 3. Check for errors returned *within* the function's response data
    //    (e.g., if the function couldn't reach Evolution API or had config issues)
    if (data && data.error) {
        console.error('Error returned from check-whatsapp-status function:', data.error, data.details);
        // Consider returning 'close' if the error indicates a connection issue,
        // otherwise 'unknown' might be safer. Let's stick with 'unknown' for now.
        return 'unknown';
    }

    // 4. Determine connection state from the successful response data
    const connectionStatus = data?.state; // Assuming response has a 'state' field
    console.log(`Status check response via Supabase for ${instanceId}:`, data);
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
    // Catch unexpected errors during the invocation process
    console.error('Error during checkInstanceStatus service call (invoking Supabase function):', error);
    return 'unknown'; // Return 'unknown' on any exception
  }
};
