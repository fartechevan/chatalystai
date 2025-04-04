
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
// Import the centralized API key and server URL
import { evolutionApiKey, evolutionServerUrl } from "./config";

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
  instanceId: string,
  onSuccess?: () => void,
  options?: LogoutOptions
): Promise<boolean> {
  const serverUrl = evolutionServerUrl; // Use imported server URL
  const url = `${serverUrl}/instance/logout/${instanceId}`;

  try {
    console.log(`Attempting to log out WhatsApp instance: ${instanceId}`);
    
    // Check for API key from the centralized config
    const apiKey = evolutionApiKey;
    
    if (!apiKey) {
      console.error('API key is missing from config.');
      options?.toast?.toast({ title: "Configuration Error", description: "API Key is missing.", variant: "destructive" });
      return false;
    }
    
    if (!instanceId) {
      console.error('Instance name/ID is missing.');
      options?.toast?.toast({ title: "Error", description: "Instance name is required.", variant: "destructive" });
      return false;
    }

    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        'apikey': apiKey,
      },
    });

    if (!response.ok) {
      // Attempt to parse error response from API
      let errorMsg = `Failed to log out: ${response.status} ${response.statusText}`;
      try {
        const errorBody = await response.json();
        errorMsg = errorBody?.message || errorBody?.error || errorMsg;
      } catch (e) { /* Ignore parsing error */ }

      console.error('Error logging out WhatsApp instance:', errorMsg);
      options?.toast?.toast({
        title: "Logout Error",
        description: errorMsg,
        variant: "destructive"
      });
      return false;
    }

    // Assuming successful logout returns 200 OK with potentially minimal body
    console.log(`WhatsApp instance ${instanceId} logout successful.`);

    // Clean up the integrations_config table (optional, depends on desired behavior)
    // If logging out means the config is invalid, maybe remove or nullify instance_id
    const { error: dbError } = await supabase
      .from('integrations_config')
      .update({ instance_id: null })
      .eq('instance_id', instanceId);
    
    if (dbError) {
      console.error('Error updating integrations_config:', dbError);
      options?.toast?.toast({
        title: "Warning",
        description: "Instance logged out but database not updated",
        variant: "destructive"
      });
      // Still consider this a success since the instance was logged out
    }
    
    // Call the success callback if provided
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
