
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import type { Integration } from "../../types";
import { useState, useEffect } from "react";

export function useWhatsAppConnection(selectedIntegration: Integration | null) {
  const { toast } = useToast();
  const [qrCodeBase64, setQrCodeBase64] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  const { data: config } = useQuery({
    queryKey: ['integration-config', selectedIntegration?.id],
    queryFn: async () => {
      if (!selectedIntegration?.id) return null;
      const { data, error } = await supabase
        .from('integrations_config')
        .select('*')
        .eq('integration_id', selectedIntegration.id)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!selectedIntegration?.id,
  });

  const checkConnectionStatus = async () => {
    if (!config) return;

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
      console.log('Connection status:', data);

      // Check if instance exists and is connected
      const instance = Array.isArray(data) && data.find(inst => inst.instance?.instanceId === config.instance_id);
      const connected = instance?.instance?.state === 'open';
      
      setIsConnected(connected);
      if (connected) {
        setQrCodeBase64(null);
        toast({
          title: "WhatsApp Connected",
          description: "Successfully connected to WhatsApp",
        });
      }

      return connected;
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
    const pollInterval = setInterval(async () => {
      const connected = await checkConnectionStatus();
      if (connected) {
        clearInterval(pollInterval);
      }
    }, 5000); // Check every 5 seconds

    // Cleanup interval after 2 minutes if not connected
    setTimeout(() => {
      clearInterval(pollInterval);
    }, 120000);

    return () => clearInterval(pollInterval);
  };

  useEffect(() => {
    // Check initial connection status
    if (config) {
      checkConnectionStatus();
    }

    return () => {
      setQrCodeBase64(null);
      setIsConnected(false);
    };
  }, [config]);

  return { initializeConnection, qrCodeBase64, isConnected };
}
