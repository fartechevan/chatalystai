
import { useToast } from "@/hooks/use-toast";
import type { ConnectionState } from "./types";

export const checkConnectionState = async (
  config: any,
  setConnectionState: (state: ConnectionState) => void,
  toast: ReturnType<typeof useToast>['toast']
) => {
  if (!config?.instance_id) return 'unknown';

  try {
    const response = await fetch(`${config.base_url}/instance/connectionState/${config.instance_id}`, {
      headers: {
        'apikey': config.api_key,
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
  config: any,
  setConnectionState: (state: ConnectionState) => void,
  setQrCodeBase64: (qrCode: string | null) => void
) => {
  if (!config) return false;

  try {
    const response = await fetch(`${config.base_url}/instance/fetchInstances`, {
      headers: {
        'apikey': config.api_key,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to check WhatsApp connection status');
    }

    const data = await response.json();
    console.log('Instance status:', data);

    // Check if instance exists and is connected
    const instance = Array.isArray(data) && data.find(inst => inst.instance?.instanceId === config.instance_id);
    const isConnected = instance?.instance?.state === 'open';
    
    if (isConnected) {
      setConnectionState('open');
      setQrCodeBase64(null);
    } else if (instance?.instance?.state === 'connecting') {
      setConnectionState('connecting');
    } else {
      setConnectionState('close');
    }

    return isConnected;
  } catch (error) {
    console.error('Error checking connection status:', error);
    return false;
  }
};

export const initializeConnection = async (
  config: any,
  toast: ReturnType<typeof useToast>['toast']
) => {
  if (!config) {
    return { success: false };
  }

  try {
    const response = await fetch(`${config.base_url}/instance/connect/${config.instance_id}`, {
      headers: {
        'apikey': config.api_key,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to connect to WhatsApp');
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
        description: "Failed to get QR code from WhatsApp",
        variant: "destructive",
      });
      return { success: false };
    }
  } catch (error) {
    console.error('WhatsApp connection error:', error);
    return { success: false };
  }
};

const formatQrCodeUrl = (base64Value: string): string => {
  return base64Value.startsWith('data:image/')
    ? base64Value
    : `data:image/png;base64,${base64Value}`;
};
