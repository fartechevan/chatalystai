
import type { ConnectionState } from "../types";

/**
 * Check the status of a WhatsApp instance
 */
export const checkInstanceStatus = async (
  config: { instance_id?: string } | null,
  setConnectionState: (state: ConnectionState) => void,
  setQrCodeBase64: (qrCode: string | null) => void
) => {
  if (!config) return false;

  try {
    // Use edge function instead of direct API call
    const response = await fetch(`/api/functions/v1/integrations/instance/fetchInstances`, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to check WhatsApp connection status');
    }

    // Verify we have JSON before parsing
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      console.error('Invalid content type received:', contentType);
      throw new Error('Invalid response format from API');
    }

    const data = await response.json();
    console.log('Instance status:', data);
    console.log('Response from fetchInstances:', data);

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
