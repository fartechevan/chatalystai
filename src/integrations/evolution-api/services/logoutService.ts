import { supabase } from "@/integrations/supabase/client"; // Keep for DB update
import { useToast } from "@/hooks/use-toast";
import { getEvolutionCredentials } from "../utils/credentials"; // Import credential utility

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
      console.error('Instance ID and Integration ID are required for logout.');
      options?.toast?.toast({ title: "Error", description: "Instance and Integration ID are required.", variant: "destructive" });
      return false;
  }

  console.log(`Attempting to log out instance ${instanceId} (Integration: ${integrationId})...`);

  try {
    // 1. Fetch credentials
    const { apiKey, baseUrl } = await getEvolutionCredentials(integrationId);

    // 2. Construct the Evolution API URL
    const apiUrl = `${baseUrl}/instance/logout/${instanceId}`;
    console.log(`Frontend: Logging out directly via Evolution API: ${apiUrl}`);

    // 3. Make the direct request to the Evolution API
    const evoResponse = await fetch(apiUrl, {
      method: "DELETE", // Use DELETE method for logout
      headers: {
        "apikey": apiKey,
      },
    });

    // 4. Check if the Evolution API request was successful
    if (!evoResponse.ok) {
      const errorText = await evoResponse.text();
      console.error(`Frontend: Evolution API logout failed (${evoResponse.status}): ${errorText}`);
      throw new Error(`Evolution API Logout Error (${evoResponse.status}): ${errorText}`);
    }

    // 5. Logout successful - API call succeeded
    console.log(`Logout API call successful for WhatsApp instance ${instanceId}.`);

    // 6. Clean up the integrations_config table (Keep this logic)
    const { error: dbError } = await supabase
      .from('integrations_config')
      .update({ instance_id: null }) // Assuming nullifying is the desired action
      .eq('instance_id', instanceId);
    
    if (dbError) {
      console.error('Error updating integrations_config during logout:', dbError);
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
     console.error('Exception in logoutWhatsAppInstance:', error);
     options?.toast?.toast({
       title: "Error",
       description: `Failed to disconnect WhatsApp instance: ${(error as Error).message}`,
       variant: "destructive"
     });
      return false;
    }
}
