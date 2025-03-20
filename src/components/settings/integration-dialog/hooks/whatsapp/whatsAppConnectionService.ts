
import { useToast } from "@/hooks/use-toast";
import type { ConnectionState } from "./types";

interface WhatsAppConfig {
  instance_id?: string;
  base_url?: string;
  api_key?: string;
  [key: string]: any;
}

export const checkConnectionState = async (
  config: WhatsAppConfig | null,
  setConnectionState: (state: ConnectionState) => void,
  toast: ReturnType<typeof useToast>['toast']
) => {
  if (!config?.instance_id) return 'unknown';

  try {
    const response = await fetch(`${config.base_url}/instance/connectionState/${config.instance_id}`, {
      headers: {
        'apikey': config.api_key || '',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to check WhatsApp connection state');
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

export const checkInstanceStatus = async (
  config: WhatsAppConfig | null,
  setConnectionState: (state: ConnectionState) => void,
  setQrCodeBase64: (qrCode: string | null) => void
) => {
  if (!config) return false;

  try {
    const response = await fetch(`${config.base_url}/instance/fetchInstances`, {
      headers: {
        'apikey': config.api_key || '',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to check WhatsApp connection status');
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

export const initializeConnection = async (
  config: WhatsAppConfig | null,
  toast: ReturnType<typeof useToast>['toast']
) => {
  if (!config || !config.instance_id) {
    toast({
      title: "Configuration Error",
      description: "Instance ID is missing in the configuration",
      variant: "destructive",
    });
    return { success: false };
  }

  try {
    // Use edge function instead of direct API call
    const response = await fetch(`/api/functions/v1/integrations/instance/connect/${config.instance_id}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('WhatsApp connection error response:', errorData);
      throw new Error(`Failed to connect to WhatsApp: ${errorData}`);
    }

    const data = await response.json();
    console.log('WhatsApp connection response:', data);

    // Extract QR code from the response and ensure proper formatting
    if (data.qrcode?.base64) {
      const base64Value = data.qrcode.base64;
      const qrCodeDataUrl = formatQrCodeUrl(base64Value);
      return { success: true, qrCodeDataUrl };
    }
    else if (data.base64) {
      const base64Value = data.base64;
      const qrCodeDataUrl = formatQrCodeUrl(base64Value);
      return { success: true, qrCodeDataUrl };
    }
    else {
      console.error('QR code data not found in response:', data);
      toast({
        title: "QR Code Error",
        description: "Failed to get QR code from WhatsApp. Check console for details.",
        variant: "destructive",
      });
      return { success: false };
    }
  } catch (error) {
    console.error('WhatsApp connection error:', error);
    toast({
      title: "Connection Error",
      description: error.message || "Failed to connect to WhatsApp",
      variant: "destructive",
    });
    return { success: false };
  }
};

const formatQrCodeUrl = (base64Value: string): string => {
  return base64Value.startsWith('data:image/')
    ? base64Value
    : `data:image/png;base64,${base64Value}`;
};
