import { useToast } from "@/hooks/use-toast";
import { useState, useEffect, useCallback } from "react";
import { useWhatsAppConfig } from "./useWhatsAppConfig";
import { checkInstanceStatus } from "./whatsAppConnectionService";
import { connectToInstance } from "./services/instanceConnectService";
import type { ConnectionState } from "./types";
import type { Integration } from "../../../types";
// Import the localStorage key
import { WHATSAPP_INSTANCE } from "./services/config";
// Define the type for the stored instance data (matching WhatsAppBusinessSettings)
interface InstanceData {
  id: string;
  name: string;
  token: string; // API Key/Token for this instance
  connectionStatus: string;
  ownerJid?: string | null;
  profileName?: string | null;
  profilePicUrl?: string | null;
  number?: string;
}

export function useWhatsAppConnection(selectedIntegration: Integration | null) {
  const { toast } = useToast();
  const [qrCodeBase64, setQrCodeBase64] = useState<string | null>(null);
  // const [pairingCode, setPairingCode] = useState<string | null>(null); // Removed pairingCode state
  const [connectionState, setConnectionState] = useState<ConnectionState>('unknown');
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null);

  const { config, isLoading: configLoading } = useWhatsAppConfig(selectedIntegration);

  // Function to check the current connection state explicitly
  const checkCurrentConnectionState = useCallback(async () => {
    if (config) {
      console.log('Checking current connection state with config:', config);
      // Pass setQrCodeBase64 even if not directly used by checkInstanceStatus,
      // as the function signature might expect it (or update checkInstanceStatus signature too if needed)
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
        setQrCodeBase64 // Pass setQrCodeBase64 here too
      );
      // Re-check instance status to get the accurate state
      // await checkCurrentConnectionState(); // Avoid potential infinite loop if status check triggers re-render
    }, 5000); // Check every 5 seconds

    setPollingInterval(intervalId);

    // Cleanup interval after 2 minutes if not connected
    setTimeout(() => {
      if (intervalId && pollingInterval === intervalId) {
        console.log("Polling timeout reached, clearing interval.");
        clearInterval(intervalId);
        setPollingInterval(null);
        // Optionally set state back to idle if still connecting
        // if (connectionState === 'connecting') {
        //   setConnectionState('idle');
        // }
      }
    }, 120000); // 2 minutes
  };

  const connectToWhatsApp = async () => {
    // Reset state before attempting connection
    setQrCodeBase64(null);
    setConnectionState('unknown');
    if (pollingInterval) clearInterval(pollingInterval);
    setPollingInterval(null);


    // Retrieve API key (token) and instance ID from localStorage
    const storedInstanceData = localStorage.getItem(WHATSAPP_INSTANCE);
    if (!storedInstanceData) {
      console.error("No instance data found in localStorage for connection.");
      toast({ title: "Error", description: "Could not find instance data to connect.", variant: "destructive" });
      return false;
    }

    let apiKey: string | null = null;
    let instanceId: string | null = null;
    try {
      const parsedData: InstanceData = JSON.parse(storedInstanceData);
      apiKey = parsedData.token; // Get the token (API key)
      instanceId = parsedData.id; // Get the ID
      if (!apiKey) {
        throw new Error("API key (token) property missing in stored instance data.");
      }
      if (!instanceId) {
        throw new Error("ID property missing in stored instance data.");
      }
    } catch (parseError) {
      console.error("Error parsing instance data from localStorage:", parseError);
      toast({ title: "Error", description: "Could not read instance data for connection.", variant: "destructive" });
      return false;
    }

    try {
       // Call connectToInstance with correct arguments (5 args)
       const result = await connectToInstance(
         setQrCodeBase64,
         (state: ConnectionState) => setConnectionState(state), // 2nd arg
         startPolling, // 3rd arg
         apiKey, // 4th arg (Pass the apiKey retrieved from localStorage)
         instanceId // 5th arg
       );

      console.log('Result of instance connect:', result);
      // The service now returns an object { success: boolean, qrCodeDataUrl: string|null, pairingCode: null }
      if (result && result.success) {
        // QR code and state are set within connectToInstance now
        // startPolling is also called within connectToInstance on success
        return true; // Indicate the initiation was successful
      }
      // If result is false or doesn't have success: true
      toast({
        title: "Connection Failed",
        description: "Could not initiate connection. Check API response in console.",
        variant: "destructive",
      });
      return false;
    } catch (error) {
      toast({
        title: "Connection Error",
        description: `Failed to initialize WhatsApp connection: ${(error as Error).message}`,
        variant: "destructive",
      });
      console.error('WhatsApp connection error:', error);
      return false;
    }
  };

  useEffect(() => {
    // Check initial connection state when the component mounts or config changes
    // if (config) { // config might not be needed if we rely on localStorage
    //   console.log('Initial connection state check');
    //   checkInstanceStatus(
    //     setConnectionState,
    //     setQrCodeBase64
    //   );
    // }

    return () => {
      // Cleanup polling on unmount
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
      setQrCodeBase64(null);
      // setPairingCode(null); // Removed
      setConnectionState('unknown');
    };
  // }, [config]); // Remove config dependency if not used
  }, []); // Run only on mount or adjust dependencies if needed

  return {
    connectToInstance: connectToWhatsApp,
    qrCodeBase64,
    // pairingCode, // Removed from return
    connectionState,
    isLoading: configLoading, // Keep configLoading if useWhatsAppConfig is still needed elsewhere
    checkCurrentConnectionState
  };
}
