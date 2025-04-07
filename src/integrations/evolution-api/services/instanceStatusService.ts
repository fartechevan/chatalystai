import { supabase } from "@/integrations/supabase/client"; // Added supabase import
import type { ConnectionState } from "../types"; // Correct path now
// Import the correct localStorage key constant
import { WHATSAPP_INSTANCE } from "./config"; // Correct path now
// Removed getEvolutionURL import from supabase/client
// connectToInstance is not used here, can be removed if not needed elsewhere in this file
// import { connectToInstance } from "./instanceConnectService";

/**
 * Check the status of a WhatsApp instance via Supabase function.
 * @param instanceId The ID of the instance to check.
 * @returns Promise<ConnectionState> The connection state ('open', 'close', 'connecting', 'unknown').
 */
export const checkInstanceStatus = async (
  instanceId: string | null 
): Promise<ConnectionState> => {

  if (!instanceId) {
    console.log('No valid instance ID provided for status check.');
    return 'unknown'; // Return 'unknown' state if no instance ID
  }

  // API call handled by Supabase function
  console.log(`Checking instance status for ${instanceId} via Supabase function...`);

  try {
    // Call the Supabase function 'check-whatsapp-status'
    const { data, error } = await supabase.functions.invoke('check-whatsapp-status', {
      body: { instanceId } // Pass the instanceId obtained from localStorage
    });

    if (error) {
      console.error('Error invoking Supabase function check-whatsapp-status:', error);
      // Check if the error indicates the function itself failed or if the Evolution API returned an error
      let errorDetails = error.message;
      if (typeof error === 'object' && error !== null && 'context' in error && typeof (error as { context: unknown }).context === 'object' && (error as { context: unknown }).context !== null && 'details' in (error as { context: { details: unknown } }).context) {
          errorDetails = (error as { context: { details: string } }).context.details || error.message;
      }
      console.error("Function invocation error details:", errorDetails);
      return 'unknown'; // Return 'unknown' state on function invocation error
    }

    console.log('Instance status response from Supabase function:', data);

    // Check the status from the response returned by the Supabase function
    if (data) {
       // Check if the function returned an error structure from the Evolution API call
       if (data.error) {
           console.error(`Evolution API returned an error via Supabase function: ${data.error}`, data);
           // Decide state based on error type, e.g., 401 might mean bad API key, 404 instance not found
           return 'close'; // Return 'close' on API errors for now
       }

      // Parse the connection state - should be in 'state' field
      const connectionStatus = data.state; 
        
      console.log('Connection status detected:', connectionStatus);
        
      // Check if connected and return the state string
      if (connectionStatus === 'open') {
        return 'open';
      } else if (connectionStatus === 'connecting') {
        return 'connecting';
      } else {
        return 'close'; // Default to 'close' for other states like 'close', etc.
      }
    } else {
      console.log('No data in response from Supabase function');
      return 'unknown'; // Return 'unknown' if no data
    }
  } catch (error) {
    console.error('Error checking connection status via Supabase function:', error);
    return 'unknown'; // Return 'unknown' on catch
  }
};
