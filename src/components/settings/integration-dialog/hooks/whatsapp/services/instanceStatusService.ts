
import type { ConnectionState } from "../types";
import { connectToInstance } from "./instanceConnectService";

/**
 * Check the status of a WhatsApp instance
 */
export const checkInstanceStatus = async (
  setConnectionState: (state: ConnectionState) => void,
  setQrCodeBase64: (qrCode: string | null) => void
) => {

  try {
    // First, try to get saved instance info from localStorage which includes the token
    const savedInstanceStr = localStorage.getItem('whatsapp_instance');
    let apiKey = '';
    let instance_id = '';
    if (savedInstanceStr) {
      try {
        const savedInstance = JSON.parse(savedInstanceStr);
        apiKey = savedInstance.token;
        instance_id = savedInstance.id;

        console.log('Using saved API key from localStorage');
      } catch (e) {
        console.error('Error parsing saved instance:', e);
      }
    }
    
    // Create base URL for direct Evolution API call
    
    // Make the direct API call
    console.log('Calling direct API for connection state check with instance ID:', instance_id);
    const apiUrl = `https://api.evoapicloud.com/instance/connectionState/${instance_id}`;
    console.log('Calling direct API for connection state check with instance ID:', instance_id);
    
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'apikey': '018D33AE2E9F-4C1B-A516-ACACFB07B29A'
      }
    });

    if (!response.ok) {
      console.error('Failed to check connection state:', response.status);
      setConnectionState('idle');
      return false;
    }

    const data = await response.json();

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
