
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

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
  try {
    console.log(`Attempting to log out WhatsApp instance: ${instanceId}`);
    
    // Call the edge function to log out the instance
    const { data, error } = await supabase.functions.invoke("integrations", {
      body: { 
        action: "logout",
        instanceId 
      }
    });
    
    if (error) {
      console.error('Error logging out WhatsApp instance:', error);
      options?.toast?.toast({
        title: "Logout Error",
        description: error.message || "Failed to log out WhatsApp instance",
        variant: "destructive"
      });
      return false;
    }
    
    console.log('WhatsApp instance logout response:', data);
    
    // Clean up the integrations_config table
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
