import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
// Config import is no longer needed here as this will use a Supabase function

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
  // TODO: Refactor this service to call a Supabase function
  // The Supabase function will handle fetching the API key and calling the Evolution API.
  console.warn("logoutWhatsAppInstance needs refactoring to use a Supabase function.");

  if (!instanceId) {
      console.error('Instance name/ID is missing.');
      options?.toast?.toast({ title: "Error", description: "Instance name is required.", variant: "destructive" });
      return false;
  }

  // Placeholder implementation removed, now calling the actual function
  try {
    // Call the Supabase function 'logout-whatsapp'
    const { data, error: funcError } = await supabase.functions.invoke('logout-whatsapp', {
      body: { instanceId }
    });

    if (funcError) {
        console.error('Error invoking Supabase function logout-whatsapp:', funcError);
        // Type guard for Supabase Function error structure
        let errorDetails = funcError.message;
        if (typeof funcError === 'object' && funcError !== null && 'context' in funcError && typeof (funcError as { context: unknown }).context === 'object' && (funcError as { context: unknown }).context !== null && 'details' in (funcError as { context: { details: unknown } }).context) {
            errorDetails = (funcError as { context: { details: string } }).context.details || funcError.message;
        }
        throw new Error(`Failed to invoke logout function: ${errorDetails}`);
    }
    
    // Check if the function itself indicated an issue (e.g., Evolution API error)
    if (data && data.error) {
        console.error(`Logout function reported an error: ${data.error}`, data);
        throw new Error(data.error);
    }

    console.log(`Logout successful for WhatsApp instance ${instanceId}.`);

    // Clean up the integrations_config table
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
