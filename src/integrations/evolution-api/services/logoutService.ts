import { apiServiceInstance } from "@/services/api/apiService"; // Import ApiService
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { getEvolutionCredentials } from "../utils/credentials";

type LogoutOptions = {
  toast: ReturnType<typeof useToast>;
};

/**
 * Logs out a WhatsApp instance
 * @param instanceId The ID of the instance to log out
 * @param onSuccess Callback function to execute on successful logout
 * @param options Additional options including toast notifications
 * @returns Promise<boolean> Whether the logout was successful
 */
export async function logoutWhatsAppInstance(
  instanceId: string | null, // Allow null for safety, check below
  integrationId: string | null, // Add integrationId
  onSuccess?: () => void,
  options?: LogoutOptions
): Promise<boolean> {

  if (!instanceId || !integrationId) {
      // console.error('Instance ID and Integration ID are required for logout.'); // Removed log
      options?.toast?.toast({ title: "Error", description: "Instance and Integration ID are required.", variant: "destructive" });
      return false;
  }

  try {
    // 1. Fetch credentials
    const { apiKey, baseUrl } = await getEvolutionCredentials(integrationId);

    // 2. Construct the Evolution API URL
    const apiUrl = `${baseUrl}/instance/logout/${instanceId}`;

    // 3. Make the request using ApiService
    // Logout might return success status with no body or a simple JSON { success: true }
    await apiServiceInstance.request<unknown>(apiUrl, { // Use unknown as response type might vary
      method: "DELETE",
      headers: {
        "apikey": apiKey,
      },
    });

    // 4. Logout successful - API call succeeded (didn't throw)
    // Logging handled by ApiService if enabled.

    // 5. Clean up the integrations_config table (Keep this logic)
    const { error: dbError } = await supabase
      .from('integrations_config') // Ensure this table name is correct
      .update({ instance_id: null }) // Assuming nullifying is the desired action
      .eq('instance_id', instanceId);

    if (dbError) {
      // console.error('Error updating integrations_config during logout:', dbError); // Removed log
      // Decide if this should cause the overall logout to fail
    }
    
    if (onSuccess && typeof onSuccess === 'function') {
      onSuccess();
    }
    
    options?.toast?.toast({
      title: "Success",
      description: "WhatsApp instance disconnected successfully",
    });
    
    return true;

  } catch (error) {
     // console.error('Exception in logoutWhatsAppInstance:', error); // Removed log
     options?.toast?.toast({
       title: "Error",
       description: `Failed to disconnect WhatsApp instance: ${(error as Error).message}`,
       variant: "destructive"
     });
      return false;
    }
}
