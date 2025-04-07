import { useToast } from "@/hooks/use-toast";
import { useState, useEffect, useCallback } from "react";
import { useEvolutionApiConfig } from "./useEvolutionApiConfig"; // Correct path
import { checkInstanceStatus } from "../services/instanceStatusService"; // Correct path
import { connectToInstance } from "../services/instanceConnectService"; // Correct path
import type { ConnectionState } from "../types"; // Correct path
import type { Integration } from "@/components/settings/types"; // Correct path

export function useEvolutionApiConnection(selectedIntegration: Integration | null) {
  const { toast } = useToast();
  const [qrCodeBase64, setQrCodeBase64] = useState<string | null>(null);
  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const [connectionState, setConnectionState] = useState<ConnectionState>('unknown');
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null);
  
  const { config, isLoading: configLoading } = useEvolutionApiConfig(selectedIntegration); // Use renamed hook

  // Function to check the current connection state explicitly
  const checkCurrentConnectionState = useCallback(async () => {
    if (config?.instance_id) { // Check if instance_id exists in config
      console.log('Checking current connection state for instance:', config.instance_id);
      // Call the refactored service, passing only instanceId
      const currentState = await checkInstanceStatus(config.instance_id);
      setConnectionState(currentState); // Update state based on the returned value
      if (currentState === 'open') {
          setQrCodeBase64(null); // Clear QR if connected
          return true; // Indicate connected status if needed by caller
      }
      return false; // Indicate not connected
    } else {
        console.log('No instance ID found in config for status check.');
        setConnectionState('unknown'); // Set to unknown if no instance ID
    }
    return false;
  }, [config]);

  const startPolling = useCallback(() => {
    // Clear any existing polling
    if (pollingInterval) {
      clearInterval(pollingInterval);
      setPollingInterval(null); // Clear state immediately
    }

    console.log('Starting connection status polling...');
    // Start a new polling interval
    const intervalId = setInterval(async () => {
      console.log('Polling for connection status...');
      await checkCurrentConnectionState();
    }, 5000); // Check every 5 seconds

    setPollingInterval(intervalId);

    // Cleanup interval after 2 minutes if not connected
    const timeoutId = setTimeout(() => {
      if (pollingInterval === intervalId) { // Check if this interval is still the active one
        console.log('Stopping polling after timeout.');
        clearInterval(intervalId);
        setPollingInterval(null);
        // Optionally set state back to idle/unknown if still connecting
        if (connectionState === 'connecting') {
            setConnectionState('close'); // Or 'unknown'
        }
      }
    }, 120000); // 2 minutes

    // Return a cleanup function for the effect
    return () => {
        console.log('Cleaning up polling interval and timeout.');
        clearInterval(intervalId);
        clearTimeout(timeoutId);
        setPollingInterval(null);
    };
  }, [pollingInterval, checkCurrentConnectionState, connectionState]); // Added dependencies

  const connectToWhatsApp = async () => {
    if (!config) {
      toast({
        title: "Configuration Error",
        description: "Integration configuration not found",
        variant: "destructive",
      });
      return false;
    }
    if (!config.instance_id) {
        toast({
            title: "Configuration Error",
            description: "Instance ID not found in configuration.",
            variant: "destructive",
        });
        return false;
    }

    try {
      console.log('Attempting to connect with instanceId:', config.instance_id);

      // Call connectToInstance service
       const result = await connectToInstance(
         setQrCodeBase64,
         setPairingCode,
         setConnectionState, // Pass the state setter directly
         startPolling, // Pass the startPolling function
         config.instance_id // Pass instanceId
       );

      console.log('Result of instance connect service call:', result);
      // The service now handles setting the state and starting polling on success
      return result.success; // Return the success status from the service

    } catch (error) {
      toast({
        title: "Connection Error",
        description: `Failed to initialize WhatsApp connection: ${error instanceof Error ? error.message : String(error)}`,
        variant: "destructive",
      });
      console.error('WhatsApp connection error in hook:', error);
      setConnectionState('close'); // Set state to close on error
      return false;
    }
  };

  useEffect(() => {
    // Check initial connection state when the component mounts or config changes
    if (config) {
      console.log('Initial connection state check with config:', config);
      checkCurrentConnectionState();
    }

    // Cleanup polling on unmount or when config changes significantly (e.g., instance_id)
    return () => {
      if (pollingInterval) {
        console.log('Cleaning up polling interval on unmount/config change.');
        clearInterval(pollingInterval);
        setPollingInterval(null);
      }
      // Reset state on unmount? Maybe not, depends on desired UX
      // setQrCodeBase64(null);
      // setPairingCode(null);
      // setConnectionState('unknown');
    };
  }, [config, checkCurrentConnectionState]); // Added checkCurrentConnectionState dependency

  // Effect to stop polling when connection is established ('open') or lost ('close')
  useEffect(() => {
      if ((connectionState === 'open' || connectionState === 'close') && pollingInterval) {
          console.log(`Connection state is ${connectionState}, stopping polling.`);
          clearInterval(pollingInterval);
          setPollingInterval(null);
      }
  }, [connectionState, pollingInterval]);


  return { 
    connectToInstance: connectToWhatsApp,
    qrCodeBase64, 
    pairingCode,
    connectionState,
    isLoading: configLoading,
    checkCurrentConnectionState
  };
}
