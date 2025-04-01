
import type { ConnectionState } from "../types";
// Import the server URL and the correct localStorage key
// API key will come from the stored instance data
import { evolutionServerUrl, WHATSAPP_INSTANCE, getEvolutionApiKey } from "./config"; 

/**
 * Check the status of a WhatsApp instance using stored instance ID and configured API Key.
 */
export const checkInstanceStatus = async (
  setConnectionState: (state: ConnectionState) => void,
  setQrCodeBase64: (qrCode: string | null) => void // Keep this param even if not used directly, as the hook expects it
) => {
  console.log('Starting instanceStatusService...');

  let instanceId: string | null = null; // Use 'id' from the stored object
  let apiKey: string | null = null; // Use 'token' from the stored object

  try {
    const savedInstanceStr = localStorage.getItem(WHATSAPP_INSTANCE); // Use correct constant
    console.log("Stored WhatsApp instance data:", savedInstanceStr);
    
    if (savedInstanceStr) {
      const savedInstance = JSON.parse(savedInstanceStr);
      // Extract id (identifier) and token (API key) from the stored object
      instanceId = savedInstance?.id || null; 
      apiKey = savedInstance?.token || null;
      
      if (!instanceId) {
        console.error('Parsed instance data from localStorage is missing id.');
      }
      if (!apiKey) {
        console.error('Parsed instance data from localStorage is missing token (API key).');
        // If token is missing in localStorage, try to get it from config
        try {
          apiKey = await getEvolutionApiKey();
          console.log('Using API key from vault as fallback');
        } catch (error) {
          console.error('Failed to get API key from vault as fallback:', error);
        }
      }
    }
  } catch (error) {
    console.error('Error retrieving or parsing WhatsApp instance from localStorage:', error);
    // Keep instanceId and apiKey as null
  }

  if (!instanceId) {
    console.log('No valid instance ID found in localStorage for status check.');
    setConnectionState('unknown'); // Or 'idle' if preferred when no instance is configured/stored
    return false;
  }

  if (!apiKey) {
    console.error('API key (token) is missing for status check. Trying to get from vault as last resort.');
    try {
      apiKey = await getEvolutionApiKey();
      console.log('Retrieved API key from vault as last resort');
    } catch (error) {
      console.error('Final attempt to get API key failed:', error);
      setConnectionState('unknown'); // Cannot check status without key
      return false;
    }
  }

  const baseUrl = evolutionServerUrl; // Use imported server URL
  if (!baseUrl) {
     console.error("Evolution API base URL is not configured for status check.");
     setConnectionState('unknown');
     return false;
  }

  // Use instanceId in the URL
  const apiUrl = `${baseUrl}/instance/connectionState/${instanceId}`; 
  console.log(`Checking instance status via API: ${apiUrl}`);

  try {
    console.log(`Making request with API key: ${apiKey.substring(0, 5)}...`);
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'apikey': apiKey, // Use the key from the stored instance data or vault
        'Content-Type': 'application/json'
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
