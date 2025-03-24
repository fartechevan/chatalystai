
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { WhatsAppConfig } from "../types";

/**
 * Logs out a WhatsApp instance
 */
export async function logoutWhatsAppInstance(
  instanceId: string,
  onSuccess?: () => void,
  toast?: ReturnType<typeof useToast>
): Promise<boolean> {
  try {
    console.log(`Logging out WhatsApp instance: ${instanceId}`);
    
    // Call the Edge Function to logout the WhatsApp instance
    const { data, error } = await supabase.functions.invoke('integrations/instance/logout/' + instanceId);
    
    if (error) {
      console.error('Error logging out WhatsApp instance:', error);
      toast?.toast({
        title: 'Error',
        description: `Failed to logout WhatsApp instance: ${error.message}`,
        variant: 'destructive'
      });
      return false;
    }
    
    console.log('WhatsApp instance logout response:', data);
    
    // If onSuccess callback is provided, call it
    if (onSuccess) {
      onSuccess();
    }
    
    // Show success toast if toast is provided
    toast?.toast({
      title: 'Success',
      description: 'WhatsApp instance logged out successfully'
    });
    
    return true;
  } catch (error: any) {
    console.error('Error in logoutWhatsAppInstance:', error);
    toast?.toast({
      title: 'Error',
      description: `An unexpected error occurred: ${error.message}`,
      variant: 'destructive'
    });
    return false;
  }
}

/**
 * Logs out a WhatsApp instance and removes it from the database
 */
export async function removeWhatsAppInstance(
  config: WhatsAppConfig,
  instanceId: string,
  onSuccess?: () => void,
  toast?: ReturnType<typeof useToast>
): Promise<boolean> {
  try {
    // First logout the instance
    const logoutSuccess = await logoutWhatsAppInstance(instanceId, undefined, toast);
    
    if (!logoutSuccess) {
      console.error('Failed to logout WhatsApp instance, aborting removal');
      return false;
    }
    
    // Then remove the config from the database
    if (config.id) {
      const { error } = await supabase
        .from('integrations_config')
        .delete()
        .eq('instance_id', instanceId)
        .eq('integration_id', config.integration_id);
      
      if (error) {
        console.error('Error removing WhatsApp integration config:', error);
        toast?.toast({
          title: 'Error',
          description: `Failed to remove WhatsApp integration config: ${error.message}`,
          variant: 'destructive'
        });
        return false;
      }
    }
    
    // If onSuccess callback is provided, call it
    if (onSuccess) {
      onSuccess();
    }
    
    return true;
  } catch (error: any) {
    console.error('Error in removeWhatsAppInstance:', error);
    toast?.toast({
      title: 'Error',
      description: `An unexpected error occurred: ${error.message}`,
      variant: 'destructive'
    });
    return false;
  }
}
