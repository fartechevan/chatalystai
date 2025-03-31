
import type { ConnectionState } from "../types";
import { evolutionServerUrl, WHATSAPP_INSTANCE, getEvolutionApiKey } from "./config"; 

/**
 * Check the status of a WhatsApp instance using stored instance ID and configured API Key.
 */
export const checkInstanceStatus = async (
  setConnectionState: (state: ConnectionState) => void,
  setQrCodeBase64: (qrCode: string | null) => void
) => {
  let instanceId: string | null = null;
  let cachedApiKey: string | null = null;

  try {
    const savedInstanceStr = localStorage.getItem(WHATSAPP_INSTANCE);
    console.log("Stored instance data:", savedInstanceStr);
    
    if (savedInstanceStr) {
      const savedInstance = JSON.parse(savedInstanceStr);
      instanceId = savedInstance?.id || null; 
      cachedApiKey = savedInstance?.token || null;
      
      if (!instanceId) {
        console.error('Parsed instance data from localStorage is missing id.');
      }
    }
  } catch (error) {
    console.error('Error retrieving or parsing WhatsApp instance from localStorage:', error);
  }

  if (!instanceId) {
    console.log('No valid instance ID found in localStorage for status check.');
    setConnectionState('unknown');
    return false;
  }

  // Get API key from server or use cached value
  const apiKey = cachedApiKey || await getEvolutionApiKey();
  if (!apiKey) {
    console.error('API key not available for status check.');
    setConnectionState('unknown');
    return false;
  }

  const baseUrl = evolutionServerUrl;
  if (!baseUrl) {
     console.error("Evolution API base URL is not configured for status check.");
     setConnectionState('unknown');
     return false;
  }

  // Use instanceId in the URL
  const apiUrl = `${baseUrl}/instance/connectionState/${instanceId}`; 
  console.log(`Checking instance status via API: ${apiUrl}`);

  try {
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'apikey': apiKey
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
