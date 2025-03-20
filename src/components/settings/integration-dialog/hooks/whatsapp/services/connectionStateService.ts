
import { useToast } from "@/hooks/use-toast";
import type { ConnectionState } from "../types";

/**
 * Check and update the connection state of a WhatsApp instance
 */
export const checkConnectionState = async (
  config: { instance_id?: string; api_key?: string; base_url?: string; } | null,
  setConnectionState: (state: ConnectionState) => void,
  toast: ReturnType<typeof useToast>['toast']
) => {
  if (!config?.instance_id) return 'unknown';

  try {
    // Hardcoded API key and base URL for reliability
    const apiKey = config.api_key || 'd20770d7-312f-499a-b841-4b64a243f24c';
    const baseUrl = config.base_url || 'https://api.evoapicloud.com';

    // Direct API call using the Evolution API format
    const response = await fetch(`${baseUrl}/instance/connectionState/${config.instance_id}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'apikey': apiKey,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to check WhatsApp connection state');
    }

    // Verify we have JSON before parsing
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      console.error('Invalid content type received:', contentType);
      throw new Error('Invalid response format from API');
    }

    const data = await response.json();
    console.log('Connection state response:', data);

    // Set connection state based on API response
    if (data.state) {
      setConnectionState(data.state as ConnectionState);
      
      // If connected, show toast
      if (data.state === 'open') {
        toast({
          title: "WhatsApp Connected",
          description: "Successfully connected to WhatsApp",
        });
      }
    } else {
      setConnectionState('unknown');
    }

    return data.state || 'unknown';
  } catch (error) {
    console.error('Error checking connection state:', error);
    setConnectionState('unknown');
    return 'unknown';
  }
};
