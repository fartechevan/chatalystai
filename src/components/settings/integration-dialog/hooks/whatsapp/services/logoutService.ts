
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface LogoutServiceDeps {
  toast: ReturnType<typeof useToast>['toast'];
}

/**
 * Logs out a WhatsApp instance
 * 
 * @param instanceId The ID of the instance to disconnect
 * @param onSuccess Callback function to execute on successful logout
 * @param deps Service dependencies (toast)
 * @returns Promise<boolean> indicating success or failure
 */
export const logoutWhatsAppInstance = async (
  instanceId: string,
  onSuccess: () => void,
  deps: LogoutServiceDeps
): Promise<boolean> => {
  try {
    console.log(`Logging out WhatsApp instance with ID: ${instanceId}`);
    
    // Get the integration config to see if we need to remove records
    const { data: config, error: configError } = await supabase
      .from('integrations_config')
      .select('id')
      .eq('instance_id', instanceId)
      .maybeSingle();
      
    if (configError) {
      console.error('Error fetching integration config:', configError);
    }
    
    // Call the edge function to logout the instance
    const { data, error } = await supabase.functions.invoke('integrations', {
      method: 'DELETE',
      body: {
        path: ['instance', 'logout', instanceId],
      }
    });
    
    if (error) {
      console.error('Error in logout WhatsApp instance:', error);
      deps.toast({
        title: "Logout Failed",
        description: error.message || "Failed to disconnect WhatsApp instance",
        variant: "destructive"
      });
      return false;
    }
    
    console.log('Logout response:', data);
    
    // If we have an integration_config entry, update it
    if (config?.id) {
      // Update the config to remove the instance_id
      const { error: updateError } = await supabase
        .from('integrations_config')
        .update({ 
          instance_id: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', config.id);
        
      if (updateError) {
        console.error('Error updating integration config after logout:', updateError);
        deps.toast({
          title: "Warning",
          description: "Instance logged out but database wasn't updated",
          variant: "default"
        });
      }
    }
    
    // Call the onSuccess callback
    onSuccess();
    
    return true;
  } catch (error) {
    console.error('Exception in logoutWhatsAppInstance:', error);
    deps.toast({
      title: "Error",
      description: (error as Error).message || "An unexpected error occurred",
      variant: "destructive"
    });
    return false;
  }
};
