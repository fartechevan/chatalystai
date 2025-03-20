
import { useToast } from "@/hooks/use-toast";
import type { ConnectionState } from "../types";

/**
 * Check and update the connection state of a WhatsApp instance
 */
export const checkConnectionState = async (
  config: { instance_id?: string } | null,
  setConnectionState: (state: ConnectionState) => void,
  toast: ReturnType<typeof useToast>['toast']
) => {
  if (!config?.instance_id) return 'unknown';

  try {
    // Use edge function instead of direct API call
    const response = await fetch(`/api/functions/v1/integrations/instance/connectionState/${config.instance_id}`, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
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
    console.log('Connection state:', data);

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
