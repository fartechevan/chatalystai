import { useToast } from "@/hooks/use-toast";
import { useState, useEffect, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEvolutionApiConfig } from "./useEvolutionApiConfig";
import { checkInstanceStatus } from "../services/instanceStatusService";
import { connectToInstance } from "../services/instanceConnectService"; // Import the service
import { getEvolutionCredentials } from "../utils/credentials";
import { deleteEvolutionInstance } from "../services/deleteInstanceService";
import type { ConnectionState, ConnectInstanceResponse } from "../types"; // Import ConnectInstanceResponse if not already
import type { Integration } from "@/components/settings/types";

export function useEvolutionApiConnection(selectedIntegration: Integration | null) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [connectionState, setConnectionState] = useState<ConnectionState>('unknown');
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null);
  const [qrCodeBase64, setQrCodeBase64] = useState<string | null>(null);
  const [pairingCode, setPairingCode] = useState<string | null>(null);

  const { config, isLoading: configLoading } = useEvolutionApiConfig(selectedIntegration);

  const checkCurrentConnectionState = useCallback(async () => {
    // Use instance_display_name instead of instance_id
    const instanceNameToCheck = config?.instance_display_name;
    const baseUrlToCheck = config?.base_url;
    const tokenToUse = config?.token;

    // Check if we have the necessary config values
    if (instanceNameToCheck && tokenToUse && baseUrlToCheck) {
      console.log(`Checking status for configured instance: ${instanceNameToCheck}`); // Log display name
      try {
        // Call checkInstanceStatus with instanceName (display name)
        const currentState = await checkInstanceStatus(instanceNameToCheck, tokenToUse, baseUrlToCheck);
        setConnectionState(currentState);
        return true;
      } catch (error) {
        console.error("Polling: Error checking instance status:", error);
        setConnectionState('close');
        return false;
      }
    } else {
      // Update log message to reflect required fields
      console.log('Status Check: Necessary details not available (Instance Display Name, Token, or Base URL missing).');
    }
    return false;
  }, [config]); // Keep config dependency

  // Note: startPolling still uses newInstanceId. This might need adjustment later
  // if instance creation/identification relies solely on display name going forward.
  const startPolling = useCallback((newInstanceId: string, newToken: string) => {
    if (pollingInterval) {
      clearInterval(pollingInterval);
      setPollingInterval(null);
    }
 
     console.log(`Starting connection status polling for NEW instance: ${newInstanceId}`);
     const intervalId = setInterval(async () => {
       // console.log(`Polling for NEW instance status: ${newInstanceId}`); // Removed log
       const baseUrlToCheck = config?.base_url;
 
       if (!baseUrlToCheck) {
        console.error("Polling Error: Base URL not available from config.");
        clearInterval(intervalId);
        setPollingInterval(null);
        setConnectionState('close');
        return;
      }

      try {
        const currentState = await checkInstanceStatus(newInstanceId, newToken, baseUrlToCheck);
        setConnectionState(currentState);

        if (currentState === 'open') {
          console.log(`Polling successful: Instance ${newInstanceId} is open. Stopping polling.`);
          clearInterval(intervalId);
          setPollingInterval(null);
        }
      } catch (error) {
        console.error(`Polling Error for instance ${newInstanceId}:`, error);
        clearInterval(intervalId);
        setPollingInterval(null);
        setConnectionState('close');
      }
    }, 3000);

    setPollingInterval(intervalId);
  }, [pollingInterval, config?.base_url, connectionState]);

  const connectToWhatsApp = async () => {
    setConnectionState('connecting');

    if (!selectedIntegration?.id) {
      toast({ title: "Error", description: "No integration selected.", variant: "destructive" });
      setConnectionState('close');
      return false;
    }
    if (!config?.base_url) {
      toast({ title: "Error", description: "Integration Base URL not found.", variant: "destructive" });
      setConnectionState('close');
      setConnectionState('close');
      return false;
    }

    const instanceName = config?.instance_display_name; // Corrected property name
    if (!instanceName) {
        toast({ title: "Error", description: "Instance Display Name not found in configuration.", variant: "destructive" });
        setConnectionState('close');
        return false;
    }

    try {
      // Call the actual service function
      const response = await connectToInstance(instanceName, selectedIntegration.id);

      if (response) {
        // Extract QR code or pairing code
        const qrData = response.qrcode;
        const pairing = qrData?.pairingCode;
         const base64 = qrData?.base64; // Base64 is usually preferred for display
 
         // console.log("Connection attempt response:", response); // Removed log
 
         if (base64) {
           setQrCodeBase64(base64);
           setPairingCode(null); // Clear pairing code if we have QR image
          setConnectionState('qrcode'); // State indicates QR needs scanning
          toast({ title: "Scan QR Code", description: "Scan the QR code with your WhatsApp." });
          // Polling might not be needed here if status check happens elsewhere or QR display implies connecting
        } else if (pairing) {
          setPairingCode(pairing);
          setQrCodeBase64(null); // Clear QR image if we have pairing code
          setConnectionState('pairingCode'); // State indicates pairing code needs entry
          toast({ title: "Enter Pairing Code", description: "Enter the code shown on your WhatsApp." });
        } else {
           // Handle cases like 'refused' or unexpected response without QR/pairing data
           const instanceStatus = response.instance?.status;
           console.warn(`connectToWhatsApp: Received response without QR/Pairing code. Status: ${instanceStatus}`);
           toast({ title: "Connection Issue", description: `Failed to retrieve QR code or pairing code. Status: ${instanceStatus || 'Unknown'}`, variant: "destructive" }); // Changed variant to destructive
           setConnectionState('close'); // Or another appropriate error state
           return false;
        }
        return true; // Indicate connection attempt was made and data processed
      } else {
        // Handle null response from service (API call failed)
        toast({ title: "Error", description: "Failed to initiate connection with the API.", variant: "destructive" });
        setConnectionState('close');
        return false;
      }
    } catch (error) {
      console.error("Error calling connectToInstance service:", error);
      toast({ title: "Error", description: `Connection failed: ${(error as Error).message}`, variant: "destructive" });
      setConnectionState('close');
      return false;
    }
  };
 
   useEffect(() => {
     if (config) {
       // console.log('Initial connection state check with config:', config); // Removed log
       checkCurrentConnectionState();
     }
 
    return () => {
      if (pollingInterval) {
        console.log('Cleaning up polling interval on unmount/config change.');
        clearInterval(pollingInterval);
        setPollingInterval(null);
      }
    };
  }, [config, checkCurrentConnectionState]);

  useEffect(() => {
    if ((connectionState === 'open' || connectionState === 'close') && pollingInterval) {
      console.log(`Connection state is ${connectionState}, stopping polling.`);
      clearInterval(pollingInterval);
      setPollingInterval(null);
    }
  }, [connectionState, pollingInterval]);

  return {
    connectToInstance: connectToWhatsApp,
    connectionState,
    isLoading: configLoading,
    checkCurrentConnectionState,
    qrCodeBase64,
    pairingCode
  };
}
