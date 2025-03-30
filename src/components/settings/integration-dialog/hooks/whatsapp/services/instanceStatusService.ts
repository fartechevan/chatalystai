
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
    
    // First check with direct API call as specified in the curl command
    try {
      console.log('Directly checking connection state with Evolution API');
      const baseUrl = config.base_url || 'https://api.evoapicloud.com';
      const directUrl = `${baseUrl}/instance/connectionState/${instanceId}`;
      
      console.log(`Making direct API call to: ${directUrl}`);
      const response = await fetch(directUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'apikey': apiKey || '64D1C2D8D89F-4916-A1DD-B1F666B79341', // Use the provided API key as fallback
        },
      });
      
      console.log(`Direct API call status: ${response.status}`);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Direct connection check response:', data);
        
        if (data && data.state) {
          // Convert 'close' to 'idle' since that's in our ConnectionState type
          const convertedState = data.state === 'close' ? 'idle' : data.state as ConnectionState;
          setConnectionState(convertedState);
          
          if (data.state === 'open') {
            setQrCodeBase64(null);
          }
          
          return data.state === 'open';
        }
      } else {
        console.error('Direct API call failed:', await response.text());
      }
    } catch (directError) {
      console.error('Error making direct API call:', directError);
    }
    
    // As a fallback, try using the edge function
    console.log('Falling back to edge function for connection state check');
    const { data, error } = await supabase.functions.invoke('integrations/instance/connectionState', {
      body: { 
        instanceId,
        apiKey // Pass the API key from localStorage
      }
    });

    if (error) {
      console.error('Failed to check WhatsApp connection status via edge function:', error);
      setConnectionState('idle');
      return false;
    }

    console.log('Edge function connection status response:', data);

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
