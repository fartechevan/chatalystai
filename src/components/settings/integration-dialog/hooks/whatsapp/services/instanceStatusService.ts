
import type { ConnectionState } from "../types";
import { supabase } from "@/integrations/supabase/client";

/**
 * Check the status of a WhatsApp instance
 */
export const checkInstanceStatus = async (
  config: { instance_id?: string; base_url?: string; } | null,
  setConnectionState: (state: ConnectionState) => void,
  setQrCodeBase64: (qrCode: string | null) => void
) => {
  if (!config || !config.instance_id) return false;

  try {
    const instanceId = config.instance_id;
    console.log('Checking instance status for ID:', instanceId);
    
    // First, try to get saved instance info from localStorage which includes the token
    const savedInstanceStr = localStorage.getItem('whatsapp_instance');
    let apiKey = '';
    
    if (savedInstanceStr) {
      try {
        const savedInstance = JSON.parse(savedInstanceStr);
        apiKey = savedInstance.token;
        console.log('Using saved API key from localStorage');
      } catch (e) {
        console.error('Error parsing saved instance:', e);
      }
    }
    
    // Call the edge function to check connection state
    console.log('Calling edge function for connection state check with instance ID:', instanceId);
    const { data, error } = await supabase.functions.invoke('integrations/instance/connectionState', {
      body: { 
        instanceId,
        apiKey // Pass the API key from localStorage
      }
    });

    if (error) {
      console.error('Failed to check WhatsApp connection status:', error);
      setConnectionState('idle');
      return false;
    }

    console.log('Instance status response:', data);

    // Check the status from the response
    if (data) {
      // Parse the connection state - could be multiple formats based on Evolution API
      const connectionStatus = 
        data.state || 
        data.connectionStatus || 
        data.status || 
        (data.instance && data.instance.state);
        
      console.log('Connection status detected:', connectionStatus);
        
      // Check if connected
      if (connectionStatus === 'open') {
        setConnectionState('open');
        setQrCodeBase64(null);
        return true;
      } else {
        setConnectionState('idle');
        return false;
      }
    } else {
      console.log('No data in response');
      setConnectionState('unknown');
      return false;
    }
  } catch (error) {
    console.error('Error checking connection status:', error);
    setConnectionState('unknown');
    return false;
  }
};
