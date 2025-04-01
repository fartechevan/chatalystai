
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect, useCallback } from "react";
import { useWhatsAppConfig } from "./useWhatsAppConfig";
import { checkInstanceStatus } from "./whatsAppConnectionService";
import { connectToInstance } from "./services/instanceConnectService";
import type { ConnectionState } from "./types";
import type { Integration } from "../../../types";

export function useWhatsAppConnection(selectedIntegration: Integration | null) {
  const { toast } = useToast();
  const [qrCodeBase64, setQrCodeBase64] = useState<string | null>(null);
  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const [connectionState, setConnectionState] = useState<ConnectionState>('unknown');
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null);
  
  const { config, isLoading: configLoading } = useWhatsAppConfig(selectedIntegration);

  // Function to check the current connection state explicitly
  const checkCurrentConnectionState = useCallback(async () => {
    if (config) {
      console.log('Checking current connection state with config:', config);
      return await checkInstanceStatus(
        setConnectionState,
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
      await checkInstanceStatus(
        setConnectionState,
        setQrCodeBase64
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
    if (!config) {
      console.warn('No WhatsApp config found');
      return false;
    }

      console.log('Attempting to connect with instanceId:', config.instance_id, 'and baseUrl:', config.base_url);

      const apiKey = config.token || '';
      const instanceId = config.instance_id || '';

       // Call connectToInstance without the apiKey argument
       const result = await connectToInstance(
         setQrCodeBase64,
         setPairingCode,
         (state: ConnectionState) => setConnectionState(state),
         startPolling,
         // apiKey, // Removed
         instanceId
       );

      console.log('Result of instance connect:', result);
      if (result && result.success) {
        if (result.qrCodeDataUrl) {
          console.log('QR code generated successfully:', result.qrCodeDataUrl);
          setQrCodeBase64(result.qrCodeDataUrl);
        }

        if (result.pairingCode) {
          console.log('Pairing code generated:', result.pairingCode);
          setPairingCode(result.pairingCode);
        }

        setConnectionState('connecting');

        // Start polling for connection status
        startPolling();
        return true;
      }
      return false;
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
        setConnectionState,
        setQrCodeBase64
      );
    }

    return () => {
      // Cleanup polling on unmount
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
      setQrCodeBase64(null);
      setPairingCode(null);
      setConnectionState('unknown');
    };
  }, [config]);

  return { 
    connectToInstance: connectToWhatsApp,
    qrCodeBase64, 
    pairingCode,
    connectionState,
    isLoading: configLoading,
    checkCurrentConnectionState
  };
}
