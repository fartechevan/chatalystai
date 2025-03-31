
import { useState, useCallback, useEffect } from "react";
import { connectToInstance } from "./services/instanceConnectService";
import { WHATSAPP_INSTANCE } from "./services/config";
import { checkInstanceStatus } from "./services/instanceStatusService";
import type { ConnectionState } from "./types";
import type { Integration } from "../../../types";

export function useWhatsAppConnection(selectedIntegration: Integration | null) {
  const [qrCodeBase64, setQrCodeBase64] = useState<string | null>(null);
  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const [connectionState, setConnectionState] = useState<ConnectionState>('idle');
  const [isLoading, setIsLoading] = useState(false);

  // Function to clear stored WhatsApp instance data
  const clearWhatsAppInstance = useCallback(() => {
    localStorage.removeItem(WHATSAPP_INSTANCE);
    console.log('WhatsApp instance data cleared from localStorage.');
  }, []);

  // Function to start polling for connection status
  const startPolling = useCallback(() => {
    const intervalId = setInterval(() => {
      checkCurrentConnectionState();
    }, 5000); // Check every 5 seconds

    return () => clearInterval(intervalId); // Cleanup on unmount
  }, []);

  // Check current connection state
  const checkCurrentConnectionState = useCallback(async () => {
    if (!selectedIntegration?.id) {
      console.log('No selected integration to check connection state.');
      setConnectionState('idle');
      return;
    }

    setIsLoading(true);
    setConnectionState('connecting'); // Assume connecting while checking

    const isConnected = await checkInstanceStatus(setConnectionState, setQrCodeBase64);
    setIsLoading(false);

    if (!isConnected) {
      setConnectionState('idle');
    }
  }, [selectedIntegration, setConnectionState, setIsLoading, setQrCodeBase64]);

  // Connect to WhatsApp instance
  const connectToWhatsApp = useCallback(async () => {
    if (!selectedIntegration) {
      console.error("No integration selected.");
      return false;
    }

    setIsLoading(true);
    setConnectionState('connecting');
    setQrCodeBase64(null);
    setPairingCode(null);

    // Retrieve instanceId from localStorage
    let instanceId: string | null = null;
    try {
      const savedInstanceStr = localStorage.getItem(WHATSAPP_INSTANCE);
      if (savedInstanceStr) {
        const savedInstance = JSON.parse(savedInstanceStr);
        instanceId = savedInstance?.id || null;
      }
    } catch (error) {
      console.error('Error retrieving WhatsApp instance from localStorage:', error);
    }

    if (!instanceId) {
      console.log('No instance ID found in localStorage, generating a new one.');
      instanceId = `instance-${Date.now()}`; // Generate a unique instance ID
    }

    const connectResult = await connectToInstance(
      setQrCodeBase64,
      setPairingCode,
      setConnectionState,
      startPolling,
      instanceId
    );

    setIsLoading(false);

    if (connectResult.success) {
      // Store the instance ID in localStorage for persistence
      localStorage.setItem(WHATSAPP_INSTANCE, JSON.stringify({ id: instanceId, token: localStorage.getItem('apiKey') }));
      console.log(`WhatsApp instance ${instanceId} stored in localStorage.`);
      return true;
    } else {
      console.error("Failed to connect to WhatsApp instance:", connectResult.error);
      return false;
    }
  }, [selectedIntegration, setIsLoading, setConnectionState, setQrCodeBase64, startPolling, setPairingCode]);

  useEffect(() => {
    // Initial check when the component mounts
    if (selectedIntegration?.id) {
      checkCurrentConnectionState();
    }

    // Clear WhatsApp instance data when the component unmounts
    return () => {
      clearWhatsAppInstance();
    };
  }, [selectedIntegration, checkCurrentConnectionState, clearWhatsAppInstance]);

  return {
    connectToInstance: connectToWhatsApp,
    qrCodeBase64,
    pairingCode,
    connectionState,
    isLoading,
    checkCurrentConnectionState
  };
};
