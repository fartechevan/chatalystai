
import { useToast } from "@/hooks/use-toast";
import type { ConnectionState } from "../types";

/**
 * Check and update the connection state of a WhatsApp instance
 */
export const checkConnectionState = async (
  config: { instance_id?: string; base_url?: string; } | null,
  setConnectionState: (state: ConnectionState) => void,
  toast: ReturnType<typeof useToast>['toast']
) => {
  if (!config?.instance_id) return 'unknown';

  try {
    // Use base URL from config
    const baseUrl = config.base_url || 'https://api.evoapicloud.com';

    console.log('Checking connection state for instance:', config.instance_id);

    // First check if the instance exists
    const instanceResponse = await fetch(`${baseUrl}/instance/fetchInstances`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'apikey': process.env.EVOLUTION_API_KEY || '',
      },
    });

    if (!instanceResponse.ok) {
      console.error('Failed to fetch instances:', instanceResponse.status);
      setConnectionState('unknown');
      return 'unknown';
    }

    const instances = await instanceResponse.json();
    console.log('Available instances:', instances);

    // Find this instance in the list
    const instance = Array.isArray(instances) ? 
      instances.find(inst => inst.id === config.instance_id) : null;

    if (!instance) {
      console.log('Instance not found in the list');
      setConnectionState('closed');
      return 'closed';
    }

    console.log('Found instance with status:', instance.connectionStatus || instance.status);
    
    // Check status directly from the instance data
    if (instance.connectionStatus === 'open' || instance.status === 'open') {
      setConnectionState('open');
      
      // If connected, show toast
      toast({
        title: "WhatsApp Connected",
        description: "Successfully connected to WhatsApp",
      });
      
      return 'open';
    } else {
      // If not connected, try the specific connectionState endpoint
      const response = await fetch(`${baseUrl}/instance/connectionState/${config.instance_id}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'apikey': process.env.EVOLUTION_API_KEY || '',
        },
      });

      if (!response.ok) {
        console.error('Failed to check connection state:', response.status);
        setConnectionState('closed');
        return 'closed';
      }

      // Verify we have JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        console.error('Invalid content type received:', contentType);
        setConnectionState('unknown');
        return 'unknown';
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
        
        return data.state;
      } else {
        setConnectionState('closed');
        return 'closed';
      }
    }
  } catch (error) {
    console.error('Error checking connection state:', error);
    setConnectionState('unknown');
    return 'unknown';
  }
};
