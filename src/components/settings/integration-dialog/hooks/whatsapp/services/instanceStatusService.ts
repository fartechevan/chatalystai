
import type { ConnectionState } from "../types";

/**
 * Check the status of a WhatsApp instance
 */
export const checkInstanceStatus = async (
  config: { instance_id?: string; api_key?: string; base_url?: string; } | null,
  setConnectionState: (state: ConnectionState) => void,
  setQrCodeBase64: (qrCode: string | null) => void
) => {
  if (!config || !config.instance_id) return false;

  try {
    // Hardcoded API key and base URL for reliability
    const apiKey = config.api_key || 'd20770d7-312f-499a-b841-4b64a243f24c';
    const baseUrl = config.base_url || 'https://api.evoapicloud.com';
    
    console.log('Checking instance status with:', { instanceId: config.instance_id, apiKey, baseUrl });

    // Direct API call using the Evolution API format
    const response = await fetch(`${baseUrl}/instance/fetchInstances`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'apikey': apiKey,
      },
    });

    console.log('Status check response status:', response.status);

    if (!response.ok) {
      console.error('Failed to check WhatsApp connection status:', response.status, response.statusText);
      setConnectionState('close');
      return false;
    }

    // Verify we have JSON before parsing
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      const textResponse = await response.text();
      console.error('Invalid content type received:', contentType, 'Response:', textResponse);
      setConnectionState('unknown');
      return false;
    }

    const data = await response.json();
    console.log('Instance status response:', data);

    // Per Evolution API docs, check if the instance exists and its connection state
    if (Array.isArray(data)) {
      // Try to find the instance by id
      const instance = data.find(item => item.id === config.instance_id);
      
      if (instance) {
        console.log('Found instance with state:', instance.connectionStatus || instance.status);
        
        // Check various status fields that might indicate connection state
        const isConnected = 
          instance.connectionStatus === 'open' || 
          instance.status === 'open' || 
          instance.state === 'open';
          
        if (isConnected) {
          setConnectionState('open');
          setQrCodeBase64(null);
          return true;
        } else {
          setConnectionState('close');
          return false;
        }
      } else {
        console.log('Instance not found in response');
        setConnectionState('close');
        return false;
      }
    } else {
      console.log('Unexpected response format:', data);
      setConnectionState('unknown');
      return false;
    }
  } catch (error) {
    console.error('Error checking connection status:', error);
    setConnectionState('unknown');
    return false;
  }
};
