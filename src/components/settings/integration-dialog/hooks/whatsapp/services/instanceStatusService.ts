
import type { ConnectionState } from "../types";

/**
 * Check the status of a WhatsApp instance
 */
export const checkInstanceStatus = async (
  config: { instance_id?: string; api_key?: string; base_url?: string; } | null,
  setConnectionState: (state: ConnectionState) => void,
  setQrCodeBase64: (qrCode: string | null) => void
) => {
  if (!config) return false;

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
      throw new Error('Failed to check WhatsApp connection status');
    }

    // Verify we have JSON before parsing
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      const textResponse = await response.text();
      console.error('Invalid content type received:', contentType, 'Response:', textResponse);
      throw new Error('Invalid response format from API');
    }

    const data = await response.json();
    console.log('Instance status response:', data);

    // Per Evolution API docs, check if the instance exists and check its connection state
    // Look for the instance with the matching instanceId
    if (Array.isArray(data)) {
      const instance = data.find(item => item.id === config.instance_id);
      
      if (instance) {
        console.log('Found instance with state:', instance.connectionStatus);
        
        if (instance.connectionStatus === 'open') {
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
