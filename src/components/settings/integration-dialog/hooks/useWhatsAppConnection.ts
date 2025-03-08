
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import type { Integration } from "../../types";
import { useState, useEffect } from "react";

export type ConnectionState = 'open' | 'connecting' | 'close' | 'unknown';

export function useWhatsAppConnection(selectedIntegration: Integration | null) {
  const { toast } = useToast();
  const [qrCodeBase64, setQrCodeBase64] = useState<string | null>(null);
  const [connectionState, setConnectionState] = useState<ConnectionState>('unknown');
  const [pollingInterval, setPollingInterval] = useState<number | null>(null);

  const { data: config, isLoading: configLoading } = useQuery({
    queryKey: ['integration-config', selectedIntegration?.id],
    queryFn: async () => {
      if (!selectedIntegration?.id) return null;
      const { data, error } = await supabase
        .from('integrations_config')
        .select('*')
        .eq('integration_id', selectedIntegration.id)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: !!selectedIntegration?.id,
  });

  const checkConnectionState = async () => {
    if (!config?.instance_id) return;

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
        
        // If connected, clear QR code
        if (data.state === 'open') {
          setQrCodeBase64(null);
          toast({
            title: "WhatsApp Connected",
            description: "Successfully connected to WhatsApp",
          });
          
          // If we have an active polling interval and the state is 'open', clear it
          if (pollingInterval) {
            clearInterval(pollingInterval);
            setPollingInterval(null);
          }
        }
      } else {
        setConnectionState('unknown');
      }

      return data.state;
    } catch (error) {
      console.error('Error checking connection state:', error);
      setConnectionState('unknown');
      return 'unknown';
    }
  };

  const checkInstanceStatus = async () => {
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

  const initializeConnection = async () => {
    if (!config) {
      toast({
        title: "Configuration Error",
        description: "Integration configuration not found",
        variant: "destructive",
      });
      return false;
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
      setConnectionState('connecting');

      // Extract QR code from the response and ensure proper formatting
      if (data.qrcode?.base64) {
        const base64Value = data.qrcode.base64;
        const qrCodeDataUrl = base64Value.startsWith('data:image/')
          ? base64Value
          : `data:image/png;base64,${base64Value}`;
        
        console.log('Formatted QR code URL:', qrCodeDataUrl);
        setQrCodeBase64(qrCodeDataUrl);
        
        // Start polling for connection status
        startPolling();
        return true;
      }
      else if (data.base64) {
        const base64Value = data.base64;
        const qrCodeDataUrl = base64Value.startsWith('data:image/')
          ? base64Value
          : `data:image/png;base64,${base64Value}`;
        
        console.log('Formatted QR code URL:', qrCodeDataUrl);
        setQrCodeBase64(qrCodeDataUrl);
        
        // Start polling for connection status
        startPolling();
        return true;
      }
      else {
        console.error('QR code data not found in response:', data);
        toast({
          title: "QR Code Error",
          description: "Failed to get QR code from WhatsApp",
          variant: "destructive",
        });
        return false;
      }
    } catch (error) {
      toast({
        title: "Connection Error",
        description: "Failed to initialize WhatsApp connection",
        variant: "destructive",
      });
      console.error('WhatsApp connection error:', error);
      return false;
    }
  };

  const startPolling = () => {
    // Clear any existing polling
    if (pollingInterval) {
      clearInterval(pollingInterval);
    }

    // Start a new polling interval
    const intervalId = setInterval(async () => {
      const state = await checkConnectionState();
      if (state === 'open') {
        clearInterval(intervalId);
        setPollingInterval(null);
      }
    }, 5000); // Check every 5 seconds

    setPollingInterval(intervalId);

    // Cleanup interval after 2 minutes if not connected
    setTimeout(() => {
      if (pollingInterval === intervalId) {
        clearInterval(intervalId);
        setPollingInterval(null);
      }
    }, 120000);
  };

  useEffect(() => {
    // Check initial connection state when the component mounts or config changes
    if (config) {
      checkInstanceStatus();
    }

    return () => {
      // Cleanup polling on unmount
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
      setQrCodeBase64(null);
      setConnectionState('unknown');
    };
  }, [config]);

  return { 
    initializeConnection, 
    qrCodeBase64, 
    connectionState,
    isLoading: configLoading
  };
}
