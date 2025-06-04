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
    const integrationId = selectedIntegration?.id; // Get integration ID

    // Check if we have the necessary config values
    if (instanceNameToCheck && integrationId) { // Check for integrationId instead of token/baseUrl
      try {
        // Call checkInstanceStatus with instanceName and integrationId
        const currentState = await checkInstanceStatus(instanceNameToCheck, integrationId);
        // Ensure the state is valid before setting (and assert type for setConnectionState)
        if (['open', 'connecting', 'close', 'qrcode', 'pairingCode', 'idle', 'unknown'].includes(currentState)) {
             setConnectionState(currentState as ConnectionState); // Assert type here
        } else {
             console.warn(`[LOG] checkCurrentConnectionState: Received invalid state '${currentState}' from checkInstanceStatus. Setting to 'unknown'.`);
             setConnectionState('unknown');
        }
        return true; // Indicate check was performed
      } catch (error) {
        console.error("Polling: Error calling checkInstanceStatus:", error);
        setConnectionState('unknown'); // Set to unknown on error
        return false; // Indicate check failed
      }
    } else {
      // Update log message
      setConnectionState('unknown'); // Set to unknown if details missing
      return false; // Indicate check couldn't be performed
    }
  }, [config, selectedIntegration?.id]); // Add selectedIntegration?.id dependency
  // Remove startPolling as it's likely redundant now that checkCurrentConnectionState handles polling logic implicitly via useIntegrationConnectionState
  /*
  const startPolling = useCallback((instanceNameToPoll: string) => { // Changed param name
    if (pollingInterval) {
      clearInterval(pollingInterval);
      setPollingInterval(null);
    }
    const integrationId = selectedIntegration?.id;
    if (!integrationId) {
        console.error("Start Polling Error: Integration ID missing.");
        return;
    }

     const intervalId = setInterval(async () => {

      try {
        const currentState = await checkInstanceStatus(instanceNameToPoll, integrationId);
         if (['open', 'connecting', 'close', 'qrcode', 'pairingCode', 'idle', 'unknown'].includes(currentState)) {
             setConnectionState(currentState);
         } else {
             console.warn(`[Polling] Received invalid state '${currentState}' from checkInstanceStatus. Setting to 'unknown'.`);
             setConnectionState('unknown');
         }


        if (currentState === 'open' || currentState === 'close') { // Stop polling if definitively open or closed
          clearInterval(intervalId);
          setPollingInterval(null);
        }
      } catch (error) {
        console.error(`Polling Error for instance ${instanceNameToPoll}:`, error);
        clearInterval(intervalId);
        setPollingInterval(null);
        setConnectionState('unknown'); // Set to unknown on error
      }
    }, 5000); // Poll every 5 seconds

    setPollingInterval(intervalId);
  }, [pollingInterval, selectedIntegration?.id]); // Depend on integrationId
  */

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
       checkCurrentConnectionState();
     }
 
    return () => {
      if (pollingInterval) {
        clearInterval(pollingInterval);
        setPollingInterval(null);
      }
    };
  }, [config, checkCurrentConnectionState]);

  useEffect(() => {
    if ((connectionState === 'open' || connectionState === 'close') && pollingInterval) {
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
