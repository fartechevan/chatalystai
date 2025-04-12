import { useState, useEffect, useCallback } from "react";
import { Integration } from "../../types";
import { useEvolutionApiConnection } from "@/integrations/evolution-api/hooks/useEvolutionApiConnection"; // Updated import path and hook name
import { supabase } from "@/integrations/supabase/client";
import { ConnectionState, EvolutionInstance, ConnectInstanceResponse } from "@/integrations/evolution-api/types"; // Added ConnectInstanceResponse import
import { fetchEvolutionInstances } from "@/integrations/evolution-api/services/fetchInstancesService";
import { getEvolutionCredentials } from "@/integrations/evolution-api/utils/credentials"; // Import getEvolutionCredentials
import { useEvolutionApiConfig } from "@/integrations/evolution-api/hooks/useEvolutionApiConfig";
import { connectToInstance as evolutionConnectToInstance } from "@/integrations/evolution-api/services/instanceConnectService";
// createEvolutionInstance removed
import { toast } from "@/components/ui/use-toast"; // Import toast for error handling


export function useIntegrationConnectionState(
  selectedIntegration: Integration | null,
  open: boolean,
  // Add the new callback parameter
  onConnectionEstablished?: () => void // Make it optional for safety
) {
  // Removed showDeviceSelect state and its setter
  const [integrationMainPopup, setIntegrationMainPopup] = useState(true);
  const [integrationQRPopup, setIntegrationQRPopup] = useState(false);
  const [showDeviceSelect, setShowDeviceSelect] = useState(false); // Re-add state for device select
  const [isConnected, setIsConnected] = useState(false);
  const [qrCodeBase64, setQrCodeBase64] = useState<string | null>(null);
  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const [qrPollingInterval, setQrPollingInterval] = useState<NodeJS.Timeout | null>(null); // State for polling interval

  const { config, isLoading: configLoading } = useEvolutionApiConfig(selectedIntegration);

  // Note: The useEvolutionApiConnection hook seems to be primarily for status checking now,
  // the actual connection initiation happens in handleConnect below.
  const {
    connectionState: evolutionHookConnectionState, // Rename to avoid conflict
    isLoading: evolutionHookIsLoading, // Rename to avoid conflict
    checkCurrentConnectionState
  } = useEvolutionApiConnection(selectedIntegration);

  // Local connection state, potentially updated by both hooks/actions
  const [localConnectionState, setLocalConnectionState] = useState<ConnectionState>('unknown');

  // Update local state based on the evolution hook's state
  useEffect(() => {
    setLocalConnectionState(evolutionHookConnectionState);
  }, [evolutionHookConnectionState]);


  // Check connection status when the dialog is opened
  useEffect(() => {
    if (open && selectedIntegration && selectedIntegration.name === "WhatsApp" && config) {
      checkCurrentConnectionState().then(success => {
        if (success) {
          // Update local state after check completes if needed, though useEvolutionApiConnection should handle it
        } else {
          setLocalConnectionState('close'); // Assume closed if check fails initially
        }
      });
    } else if (!open) {
       setLocalConnectionState('unknown'); // Reset state when dialog closes
       setQrCodeBase64(null);
       setPairingCode(null);
       setIntegrationQRPopup(false);
       setIntegrationMainPopup(true);
    }
  }, [open, selectedIntegration, checkCurrentConnectionState, config]);

  // Effect to handle state changes when connection becomes 'open' while QR popup is active
   useEffect(() => {
    // Only proceed if the state is 'open' and the QR popup is currently shown
    if (localConnectionState === 'open' && integrationQRPopup) {
      console.log("[Connection Open Effect] State is 'open' and QR popup is active. Updating state...");

      // Update internal states first to switch the view
      setIntegrationQRPopup(false);
      setIntegrationMainPopup(true);
      setIsConnected(true); // Mark as connected

      // Call the callback *after* setting state. This callback should handle
      // notifying the parent component (e.g., closing the dialog).
      if (onConnectionEstablished) {
        console.log("[Connection Open Effect] Calling onConnectionEstablished callback.");
        onConnectionEstablished();
      }

      // Fetch details in the background after triggering the UI change
      if (selectedIntegration) {
        // Intentionally not awaiting this, let it run in background
        fetchAndUpdateDetails(selectedIntegration.id);
      }
    }
    // No else needed, this effect only acts when the specific condition is met
   }, [localConnectionState, integrationQRPopup, selectedIntegration, onConnectionEstablished]); // Dependencies seem correct

  // Effect for polling during QR code/pairing code phase
  useEffect(() => {
    // Clear any existing interval first
    if (qrPollingInterval) {
      clearInterval(qrPollingInterval);
      setQrPollingInterval(null);
    }

    // Start polling only if in qrcode or pairingCode state
     if (localConnectionState === 'qrcode' || localConnectionState === 'pairingCode') {
       console.log(`[Polling Effect] Starting polling for state: ${localConnectionState}`);
       const intervalId = setInterval(async () => {
         // console.log(`[Polling Interval] Checking connection state (current: ${localConnectionState})...`); // Removed log
         // Call the check function. The state update will be handled by useEvolutionApiConnection's effect
         // which updates localConnectionState, triggering the outer effect's cleanup/check.
         await checkCurrentConnectionState();
      }, 3000); // Poll every 3 seconds
      setQrPollingInterval(intervalId);
    } else {
       console.log(`[Polling Effect] State is ${localConnectionState}, not starting/clearing polling.`);
    }

    // Cleanup function to clear interval on unmount or state change
    return () => {
      if (qrPollingInterval) {
        console.log("[Polling Cleanup] Clearing interval.");
        clearInterval(qrPollingInterval);
        setQrPollingInterval(null);
      }
    };
  // Depend only on the state that triggers polling and the check function itself
  }, [localConnectionState, checkCurrentConnectionState]);


  const fetchAndUpdateDetails = async (integrationId: string) => {
    console.log(`[fetchAndUpdateDetails] Starting for integration ${integrationId}`);
    try {
      console.log(`[fetchAndUpdateDetails] Integration ID: ${integrationId}`);
      const { apiKey, baseUrl } = await getEvolutionCredentials(integrationId);
      console.log(`[fetchAndUpdateDetails] apiKey: ${apiKey ? 'Exists' : 'Missing'}, baseUrl: ${baseUrl}`); // Avoid logging key

      const { data: configData, error: configError } = await supabase
        .from('integrations_config')
        .select('instance_id')
        .eq('integration_id', integrationId)
        .single();

      if (configError || !configData?.instance_id) {
        console.error(`[fetchAndUpdateDetails] Error fetching config or instance_id missing for ${integrationId}:`, configError);
        await updateIntegrationStatus(integrationId);
        return;
      }
      const storedInstanceId = configData.instance_id;
      console.log(`[fetchAndUpdateDetails] Found stored instance_id: ${storedInstanceId}`);

      const fetchedInstances = await fetchEvolutionInstances(integrationId);
      console.log(`[fetchAndUpdateDetails] Fetched ${fetchedInstances.length} instances from API.`);

      const matchingInstance = fetchedInstances.find(
        (inst: EvolutionInstance) => inst.instance?.instanceId === storedInstanceId
      );

      if (matchingInstance?.instance) {
        const { instanceName, ownerJid } = matchingInstance.instance;
        console.log(`[fetchAndUpdateDetails] Found matching instance: Name=${instanceName}, OwnerJid=${ownerJid}`);

        const { error: updateError } = await supabase
          .from('integrations_config')
          .update({
            instance_display_name: instanceName,
            owner_id: ownerJid
          })
          .eq('integration_id', integrationId);

        if (updateError) {
          console.error(`[fetchAndUpdateDetails] Error updating integrations_config for ${integrationId}:`, updateError);
        } else {
          console.log(`[fetchAndUpdateDetails] Successfully updated integrations_config for ${integrationId}.`);
        }
      } else {
        console.warn(`[fetchAndUpdateDetails] Could not find matching instance with ID ${storedInstanceId}.`);
      }
    } catch (error) {
      console.error(`[fetchAndUpdateDetails] Error during fetch/update process for ${integrationId}:`, error);
    }
  };

  const updateIntegrationStatus = async (integrationId: string) => {
     // Simplified: just ensures record exists, might need more logic
    try {
      const { data: existingConfig, error: checkError } = await supabase
        .from('integrations_config')
        .select('id')
        .eq('integration_id', integrationId)
        .maybeSingle();

      if (checkError) throw checkError;

      if (!existingConfig) {
        console.log(`[updateIntegrationStatus] No config found for ${integrationId}, inserting default.`);
        const { error: insertError } = await supabase
          .from('integrations_config')
          .insert({ integration_id: integrationId, base_url: 'https://api.evoapicloud.com' }); // Example default
        if (insertError) throw insertError;
      }
    } catch (error) {
      console.error('Error ensuring integration status record:', error);
    }
  };

  // Modify handleConnect to accept the instance display name
  const handleConnect = async (instanceDisplayName: string | null | undefined = null) => {
    console.log("[handleConnect] Function called with instanceDisplayName:", instanceDisplayName);
    setLocalConnectionState('connecting'); // Set state immediately
    setQrCodeBase64(null); // Clear previous QR/pairing codes
    setPairingCode(null);

    // Check if necessary info is provided
    if (!selectedIntegration?.id) {
      console.error("[handleConnect] Exiting: Integration ID is missing.");
      toast({ variant: "destructive", title: "Error", description: "Integration ID is missing." });
      setLocalConnectionState('close');
      return;
    }

    // If no instanceDisplayName provided, try to get it from the config
    if (!instanceDisplayName && config?.instance_display_name) {
      instanceDisplayName = config.instance_display_name;
    }

    // Use the config's instance_id as a fallback if no display name is provided
    if (!instanceDisplayName && config?.instance_id) {
      instanceDisplayName = config.instance_id;
    }

    if (!instanceDisplayName) {
      console.error("[handleConnect] Exiting: Instance display name not provided and not found in config.");
      toast({ variant: "destructive", title: "Configuration Error", description: "Instance name is missing. Cannot connect." });
      setLocalConnectionState('close');
      return;
    }

    // --- Connect to EXISTING instance using the PROVIDED name ---
    console.log(`[handleConnect] Path taken: Connect to EXISTING instance (${instanceDisplayName}).`);
    try {
      // Cast the response type to allow checking for flat properties potentially
      const connectResponse = await evolutionConnectToInstance(instanceDisplayName, selectedIntegration.id) as ConnectInstanceResponse | (ConnectInstanceResponse & { base64?: string, pairingCode?: string | null });

      let useBase64: string | null = null;
      let usePairingCode: string | null = null;

      // --- Start Refined Check ---
      if (connectResponse) {
        // Check for base64 first (nested or flat)
        const nestedBase64 = connectResponse.qrcode?.base64;
        // Check if 'base64' exists directly and is a string
        const flatBase64 = ('base64' in connectResponse && typeof connectResponse.base64 === 'string') ? connectResponse.base64 : undefined;

        if (nestedBase64 && typeof nestedBase64 === 'string' && nestedBase64.startsWith('data:image')) {
          useBase64 = nestedBase64;
        } else if (flatBase64 && flatBase64.startsWith('data:image')) { // Already checked it's a string
          useBase64 = flatBase64;
        }

        // If no valid base64 found, check for pairing code (nested or flat)
        if (!useBase64) {
          const nestedPairing = connectResponse.qrcode?.pairingCode;
           // Check if 'pairingCode' exists directly and is a string or null
          const flatPairing = ('pairingCode' in connectResponse && (typeof connectResponse.pairingCode === 'string' || connectResponse.pairingCode === null)) ? connectResponse.pairingCode : undefined;

          if (nestedPairing && typeof nestedPairing === 'string' && nestedPairing.length > 0) {
            usePairingCode = nestedPairing;
          } else if (flatPairing && typeof flatPairing === 'string' && flatPairing.length > 0) { // Check specifically for non-empty string here
            usePairingCode = flatPairing;
          }
        }
      }
      // --- End Refined Check ---

      // Now act based on what valid data was found
      if (useBase64) {
        console.log("[handleConnect] Using valid base64 QR code.");
        const qrCodeDataUrl = useBase64.startsWith('data:image/png;base64,') ? useBase64 : `data:image/png;base64,${useBase64}`;
        setQrCodeBase64(qrCodeDataUrl);
        setPairingCode(null);
        setLocalConnectionState('qrcode');
        setIntegrationMainPopup(false);
        setIntegrationQRPopup(true);
        toast({ title: "Scan QR Code", description: "Scan the QR code with your WhatsApp." });
      } else if (usePairingCode) {
         console.log("[handleConnect] Using valid pairing code.");
         setPairingCode(usePairingCode);
         setQrCodeBase64(null);
         setLocalConnectionState('pairingCode');
         setIntegrationMainPopup(false);
         setIntegrationQRPopup(true);
         toast({ title: "Enter Pairing Code", description: "Enter the code shown on your WhatsApp." });
      } else {
        // Neither valid base64 nor valid pairing code found
        const instanceStatus = connectResponse?.instance?.status;
        console.error(`[handleConnect] Failed to get valid QR/Pairing data. Status: ${instanceStatus}. Response:`, connectResponse);
        toast({ variant: "destructive", title: "Connection Error", description: `Failed to retrieve QR code or pairing code. Status: ${instanceStatus || 'No Status'}. Please try again.` });
        setLocalConnectionState('close');
      }
    } catch (error) {
      console.error("[handleConnect] Error connecting to existing instance:", error);
      toast({ variant: "destructive", title: "Connection Error", description: `An error occurred while connecting: ${(error as Error).message}` });
      setLocalConnectionState('close');
    }
  };


  return {
    integrationMainPopup,
    setIntegrationMainPopup,
    integrationQRPopup,
    setIntegrationQRPopup,
    showDeviceSelect,
    setShowDeviceSelect,
    isConnected,
    setIsConnected,
    connectionState: localConnectionState, // Return the local state
    isLoading: configLoading || evolutionHookIsLoading, // Combine loading states if needed
    checkCurrentConnectionState,
    qrCodeBase64,
    pairingCode,
    handleConnect,
  };
}
