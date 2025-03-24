
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect, useCallback } from "react";
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

  // Function to check the current connection state explicitly
  const checkCurrentConnectionState = useCallback(async () => {
    if (config) {
      console.log('Checking current connection state with config:', config);
      return await checkInstanceStatus(
        config, 
        (state: ConnectionState) => setConnectionState(state), 
        setQrCodeBase64
      );
    }
    return false;
  }, [config]);

  const startPolling = () => {
    // Clear any existing polling
    if (pollingInterval) {
      clearInterval(pollingInterval);
    }

    // Start a new polling interval
    const intervalId = setInterval(async () => {
      await checkConnectionState(
        config, 
        (state: ConnectionState) => setConnectionState(state), 
        toast
      );
      // Re-check instance status to get the accurate state
      await checkCurrentConnectionState();
    }, 5000); // Check every 5 seconds

    setPollingInterval(intervalId);

    // Cleanup interval after 2 minutes if not connected
    setTimeout(() => {
      if (intervalId && pollingInterval === intervalId) {
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
        console.log('QR code generated successfully:', result.qrCodeDataUrl);
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
      console.log('Initial connection state check with config:', config);
      checkInstanceStatus(
        config, 
        (state: ConnectionState) => setConnectionState(state), 
        setQrCodeBase64
      );
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
    isLoading: configLoading,
    checkCurrentConnectionState
  };
}
