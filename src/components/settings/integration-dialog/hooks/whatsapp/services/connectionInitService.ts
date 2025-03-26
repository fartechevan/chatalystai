
import { supabase } from "@/integrations/supabase/client";
import type { WhatsAppConfig } from "../types";
import { callEvolutionApiViaEdgeFunction, callEvolutionApiDirectly } from "./api/evolutionApi";
import { processConnectionData } from "./qrHandlers";
import { getSavedInstanceData } from "./instanceStorage";

interface ToastProps {
  title?: string;
  description?: string;
  variant?: "default" | "destructive";
}

interface ConnectionResult {
  success: boolean;
  qrCodeDataUrl?: string;
  pairingCode?: string;
  error?: string;
}

export async function initializeConnection(
  config: WhatsAppConfig,
  toast: (props: ToastProps) => void
): Promise<ConnectionResult> {
  try {
    console.log('initializeConnection called with config:', JSON.stringify(config, null, 2));
    
    // Try to get saved instance info from localStorage
    const savedInstance = getSavedInstanceData();
    
    let instanceId = config.instance_id;
    let apiKey = '';
    
    if (savedInstance) {
      instanceId = savedInstance.id;
      apiKey = savedInstance.token;
      console.log('Using saved instance ID:', instanceId);
      console.log('API Key retrieved from localStorage (first 5 chars):', apiKey ? apiKey.substring(0, 5) + '...' : 'none');
    }
    
    if (!instanceId) {
      console.error('No WhatsApp instance ID found');
      throw new Error('No WhatsApp instance ID found. Please try connecting again.');
    }
    
    console.log(`Initializing WhatsApp connection for instance: ${instanceId}`);
    console.log(`API Key available: ${apiKey ? 'Yes (' + apiKey.substring(0, 5) + '...)' : 'No'}`);
    
    // Try to connect using the edge function
    try {
      // Call the instance/connect endpoint via edge function
      const data = await callEvolutionApiViaEdgeFunction('instance/connect', instanceId, apiKey);
      
      // Process the response data for QR code or pairing code
      const result = processConnectionData(data, toast);
      if (result.success) {
        return result;
      }
      
      // If we get here, we couldn't process the response from the edge function
      // Try direct API call as fallback
      console.log('Edge function response did not contain expected QR code format, trying direct API call');
      
    } catch (edgeFunctionError) {
      console.error('Error with edge function call:', edgeFunctionError);
      toast({
        title: "Connection Error",
        description: "Edge function error, trying direct API call",
        variant: "destructive",
      });
      // Continue to direct API call as fallback
    }
    
    // Direct Evolution API call as fallback
    try {
      // Create base URL for direct Evolution API call
      const baseUrl = config.base_url || 'https://api.evoapicloud.com';
      
      // Make the direct API call
      const directData = await callEvolutionApiDirectly(
        baseUrl, 
        'instance/connect', 
        instanceId, 
        apiKey, 
        {}
      );
      
      console.log('Direct API response:', directData);
      
      // Process the direct API response
      const result = processConnectionData(directData, toast);
      if (result.success) {
        return result;
      }
      
      // If we reached here, neither method provided usable data
      console.error('No QR code or pairing code data returned from API');
      toast({
        title: "Connection Error",
        description: "Could not generate QR code or pairing code",
        variant: "destructive",
      });
      
      return { success: false, error: "No QR code or pairing code data returned" };
    } catch (directApiError) {
      console.error('Error calling direct API:', directApiError);
      toast({
        title: "Connection Error",
        description: directApiError.message || "Failed to connect to WhatsApp server",
        variant: "destructive",
      });
      return { success: false, error: directApiError.message || "Failed to connect" };
    }
  } catch (error) {
    console.error('Uncaught error in initializeConnection:', error);
    toast({
      title: "Connection Error",
      description: error.message || "Failed to initialize WhatsApp connection",
      variant: "destructive",
    });
    return { success: false, error: error.message };
  }
}
