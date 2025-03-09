
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { useWhatsAppConfig } from "./useWhatsAppConfig";
import { checkConnectionState, checkInstanceStatus, initializeConnection } from "./whatsAppConnectionService";
import type { ConnectionState } from "./types";
import type { Integration } from "../../../types";

export function useWhatsAppConnection(selectedIntegration: Integration | null) {
  const { toast } = useToast();
  const [qrCodeBase64, setQrCodeBase64] = useState<string | null>(null);
  const [connectionState, setConnectionState] = useState<ConnectionState>('unknown');
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null);
  
  const { config, isLoading: configLoading } = useWhatsAppConfig(selectedIntegration);

  const startPolling = () => {
    // Clear any existing polling
    if (pollingInterval) {
      clearInterval(pollingInterval);
    }

    // Start a new polling interval
    const intervalId = setInterval(async () => {
      const state = await checkConnectionState(config, setConnectionState, toast);
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

  const connectToWhatsApp = async () => {
    if (!config) {
      toast({
        title: "Configuration Error",
        description: "Integration configuration not found",
        variant: "destructive",
      });
      return false;
    }

    try {
      const result = await initializeConnection(config, toast);
      
      if (result.success && result.qrCodeDataUrl) {
        console.log('Formatted QR code URL:', result.qrCodeDataUrl);
        setQrCodeBase64(result.qrCodeDataUrl);
        setConnectionState('connecting');
        
        // Start polling for connection status
        startPolling();
        return true;
      } else {
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

  useEffect(() => {
    // Check initial connection state when the component mounts or config changes
    if (config) {
      checkInstanceStatus(config, setConnectionState, setQrCodeBase64);
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
    initializeConnection: connectToWhatsApp, 
    qrCodeBase64, 
    connectionState,
    isLoading: configLoading
  };
}
