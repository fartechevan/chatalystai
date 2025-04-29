import { useState, useEffect, useCallback } from "react";
import { Integration } from "../../types";
// Remove useEvolutionApiConnection import as its state logic is merged here
// import { useEvolutionApiConnection } from "@/integrations/evolution-api/hooks/useEvolutionApiConnection";
import { supabase } from "@/integrations/supabase/client";
import { ConnectionState, EvolutionInstance, ConnectInstanceResponse } from "@/integrations/evolution-api/types"; // Standardize import path
import { fetchEvolutionInstances } from "@/integrations/evolution-api/services/fetchInstancesService";
import { createEvolutionInstance } from "@/integrations/evolution-api/services/createInstanceService";
import { getEvolutionCredentials } from "@/integrations/evolution-api/utils/credentials"; // Import getEvolutionCredentials
import { useEvolutionApiConfig } from "@/integrations/evolution-api/hooks/useEvolutionApiConfig";
import { connectToInstance as evolutionConnectToInstance } from "@/integrations/evolution-api/services/instanceConnectService";
import { setEvolutionWebhook } from "@/integrations/evolution-api/services/setWebhookService"; // Import the new service
import { checkInstanceStatus } from "@/integrations/evolution-api/services/instanceStatusService"; // Import checkInstanceStatus
import { toast } from "@/components/ui/use-toast"; // Import toast for error handling


import { WebhookSetupForm } from "../components/WebhookSetupForm";

// Helper type guard to check for error structure
interface ApiErrorWithMessage {
    message: string | string[];
}
function hasMessage(obj: unknown): obj is ApiErrorWithMessage {
    // Check if obj is an object and has a 'message' property that's string or string[]
    return typeof obj === 'object' &&
           obj !== null &&
           'message' in obj &&
           (typeof (obj as ApiErrorWithMessage).message === 'string' || Array.isArray((obj as ApiErrorWithMessage).message));
}

interface ApiErrorWithError {
    error: string;
}
function hasError(obj: unknown): obj is ApiErrorWithError {
     // Check if obj is an object and has an 'error' property that's a string
     return typeof obj === 'object' &&
            obj !== null &&
            'error' in obj &&
            typeof (obj as ApiErrorWithError).error === 'string';
}

interface ApiErrorWithResponse {
    response: { message?: string; error?: string };
}
function hasResponseError(obj: unknown): obj is ApiErrorWithResponse {
     // Check if obj is an object, has 'response' property which is also an object, and that object has message or error
     return typeof obj === 'object' &&
            obj !== null &&
            'response' in obj &&
            typeof (obj as { response: unknown }).response === 'object' && // Check if response exists and is object
            (obj as { response: unknown }).response !== null &&
            ('message' in ((obj as { response: unknown }).response as object) || // Check for message in response object
             'error' in ((obj as { response: unknown }).response as object));   // Check for error in response object
}


export function useIntegrationConnectionState(
  selectedIntegration: Integration | null,
  open: boolean,
  onConnectionEstablished?: () => void // Make it optional for safety
) {
  const [integrationMainPopup, setIntegrationMainPopup] = useState(true);
  const [showDeviceSelect, setShowDeviceSelect] = useState(false);
  const [isConnected, setIsConnected] = useState(false); // Represents if connection was ever 'open'
  const [qrCodeBase64, setQrCodeBase64] = useState<string | null>(null);
  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const [qrPollingInterval, setQrPollingInterval] = useState<NodeJS.Timeout | null>(null);
  const [isPollingForConnection, setIsPollingForConnection] = useState(false);

  const [fetchedInstances, setFetchedInstances] = useState<EvolutionInstance[]>([]);
  const [isFetchingInstances, setIsFetchingInstances] = useState(false);
  const [selectedInstanceName, setSelectedInstanceName] = useState<string>(""); // Keep track of the instance being connected/managed
  const [newInstanceName, setNewInstanceName] = useState<string>("");

  const [showWebhookSetup, setShowWebhookSetup] = useState(false);
  const [pendingWebhookIntegrationId, setPendingWebhookIntegrationId] = useState<string | null>(null);

  // Use config hook for base_url, token etc. needed for API calls
  const { config, isLoading: configLoading, refetch: refetchConfig } = useEvolutionApiConfig(selectedIntegration);

  // --- State Management ---
  const [localConnectionState, setLocalConnectionState] = useState<ConnectionState>('unknown');
  const [isLoading, setIsLoading] = useState(false); // Combined loading state

  // Define valid connection states explicitly
  const validConnectionStates: ConnectionState[] = ['open', 'connecting', 'close', 'qrcode', 'pairingCode', 'idle', 'unknown'];

  // Helper to check if a status is a valid ConnectionState
  const isValidConnectionState = (status: string | undefined): status is ConnectionState => {
    return !!status && validConnectionStates.includes(status as ConnectionState);
  };


  // --- Function Definitions (Moved Up) ---

  const updateIntegrationStatus = useCallback(async (integrationId: string) => {
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
 }, []); // No dependencies needed as it uses only integrationId


  const fetchAndUpdateDetails = useCallback(async (integrationId: string) => {
    console.log(`[fetchAndUpdateDetails] Starting for integration ${integrationId}`);
    try {
      console.log(`[fetchAndUpdateDetails] Integration ID: ${integrationId}`);
      const { apiKey, baseUrl } = await getEvolutionCredentials(integrationId);
      console.log(`[fetchAndUpdateDetails] apiKey: ${apiKey ? 'Exists' : 'Missing'}, baseUrl: ${baseUrl}`); // Avoid logging key

      // Use maybeSingle() to handle cases where the config row might not exist yet
      const { data: configData, error: configError } = await supabase
        .from('integrations_config')
        .select('instance_id')
        .eq('integration_id', integrationId)
        .maybeSingle(); // Changed from .single()

      if (configError) {
        console.error(`[fetchAndUpdateDetails] Error checking config for ${integrationId}:`, configError);
      }

      let currentConfigData = configData; // Use a mutable variable

      // If no configData exists initially, attempt to create it and refetch
      if (!currentConfigData) {
        console.warn(`[fetchAndUpdateDetails] No config found for ${integrationId}. Attempting to create default.`);
        await updateIntegrationStatus(integrationId); // Ensure the row exists

        console.log(`[fetchAndUpdateDetails] Re-fetching config after creation attempt...`);
        const { data: refetchedConfigData, error: refetchError } = await supabase
          .from('integrations_config')
          .select('instance_id')
          .eq('integration_id', integrationId)
          .maybeSingle();

        if (refetchError) {
          console.error(`[fetchAndUpdateDetails] Error re-fetching config after creation for ${integrationId}:`, refetchError);
          return;
        }

        if (!refetchedConfigData) {
          console.error(`[fetchAndUpdateDetails] Config still not found after creation attempt for ${integrationId}. Cannot proceed.`);
          return;
        }
        console.log(`[fetchAndUpdateDetails] Successfully refetched config after creation.`);
        currentConfigData = refetchedConfigData;
      }

      if (!currentConfigData || !currentConfigData.instance_id) {
         console.warn(`[fetchAndUpdateDetails] Config exists for ${integrationId}, but instance_id is missing. Cannot match live instance.`);
         return;
      }

      const storedInstanceId = currentConfigData.instance_id;
      console.log(`[fetchAndUpdateDetails] Using stored instance_id: ${storedInstanceId}`);

      const liveInstances = await fetchEvolutionInstances(integrationId);
      console.log(`[fetchAndUpdateDetails] Fetched live instances from API:`, liveInstances);

      const matchedInstance = liveInstances.find(inst => inst.id === storedInstanceId);
      console.log(`[fetchAndUpdateDetails] Matched instance from array:`, matchedInstance);

      if (matchedInstance) {
        const instanceName = matchedInstance.name;
        const ownerJid = matchedInstance.ownerJid;
        console.log(`[fetchAndUpdateDetails] Found matching instance: Name=${instanceName}, OwnerJid=${ownerJid}`);

        const sanitizedUserReferenceId = ownerJid ? ownerJid.replace(/@s\.whatsapp\.net$/, '') : null;
        console.log(`[fetchAndUpdateDetails] Sanitized user_reference_id: ${sanitizedUserReferenceId}`);

        if (instanceName) {
          const { error: updateError } = await supabase
            .from('integrations_config')
            .update({
              instance_display_name: instanceName,
              owner_id: ownerJid,
              user_reference_id: sanitizedUserReferenceId
            })
            .eq('integration_id', integrationId);

          if (updateError) {
            console.error(`[fetchAndUpdateDetails] Error updating integrations_config for ${integrationId}:`, updateError);
          } else {
            console.log(`[fetchAndUpdateDetails] Successfully updated integrations_config for ${integrationId}.`);
          }
        } else {
            console.warn(`[fetchAndUpdateDetails] Matched instance ${matchedInstance.id} is missing a 'name'. Cannot update display name.`);
        }
      } else {
        console.warn(`[fetchAndUpdateDetails] Could not find live instance matching stored ID ${storedInstanceId}.`);
      }
    } catch (error) {
      console.error(`[fetchAndUpdateDetails] Error during fetch/update process for ${integrationId}:`, error);
    }
  }, [updateIntegrationStatus]); // Add updateIntegrationStatus dependency


  const refetchInstances = useCallback(async () => {
    if (!selectedIntegration?.id) {
      console.warn("[refetchInstances] No integration selected.");
      setFetchedInstances([]);
      return;
    }
    const integrationId = selectedIntegration.id; // Store ID for stable dependency
    setIsFetchingInstances(true);
    console.log("[refetchInstances] Manual fetch requested", { integrationId });
    try {
      const rawInstances = await fetchEvolutionInstances(integrationId);
      console.log("[refetchInstances] Manual fetch raw response", rawInstances);
       const validInstances = (rawInstances || []).filter(
         (inst): inst is EvolutionInstance =>
            !!inst &&
            typeof inst.id === 'string' &&
            typeof inst.name === 'string' &&
            typeof inst.connectionStatus === 'string' &&
            typeof inst.token === 'string'
       );
       console.log("[refetchInstances] Manual fetch valid instances after filtering", validInstances);
      setFetchedInstances(validInstances);

      if (validInstances.length > 0 && !validInstances.some(inst => inst.name === selectedInstanceName)) {
         setSelectedInstanceName(validInstances[0].name);
      } else if (validInstances.length === 0) {
         setSelectedInstanceName("");
      }
    } catch (err) {
      console.error("[refetchInstances] Manual fetch error", err);
      setFetchedInstances([]);
      setSelectedInstanceName("");
      toast({ variant: "destructive", title: "Error Fetching Instances", description: (err as Error).message });
    } finally {
      setIsFetchingInstances(false);
    }
  }, [selectedIntegration?.id, selectedInstanceName]);

  // --- Instance Fetching ---
  const fetchInstancesAndSetState = useCallback(async (integrationId: string) => {
    setIsFetchingInstances(true);
    console.log("[fetchInstancesAndSetState] Fetching instances for:", integrationId);
    try {
      const rawInstances = await fetchEvolutionInstances(integrationId);
      const validInstances = (rawInstances || []).filter(
        (inst): inst is EvolutionInstance =>
          !!inst &&
          typeof inst.id === 'string' &&
          typeof inst.name === 'string' &&
          typeof inst.connectionStatus === 'string' &&
          typeof inst.token === 'string'
      );
      setFetchedInstances(validInstances);

      if (validInstances.length > 0) {
        let currentSelectedInstanceName = selectedInstanceName;
        // If no instance is selected OR the selected one disappeared, select the first one
        if (!currentSelectedInstanceName || !validInstances.some(inst => inst.name === currentSelectedInstanceName)) {
           const firstInstanceName = validInstances[0].name;
           setSelectedInstanceName(firstInstanceName);
           currentSelectedInstanceName = firstInstanceName; // Update local variable for status check
           console.log(`[fetchInstancesAndSetState] Auto-selected instance: ${firstInstanceName}`);
        }

        // Find the status of the currently selected instance from the fetched list
        const currentSelectedInstance = validInstances.find(inst => inst.name === currentSelectedInstanceName);
        const fetchedStatus = currentSelectedInstance?.connectionStatus;

        // *** MODIFICATION START ***
        // Only update localConnectionState if the current state is NOT 'qrcode'
        // Let the polling logic handle the transition out of 'qrcode' state
        if (localConnectionState !== 'qrcode') {
            setLocalConnectionState(isValidConnectionState(fetchedStatus) ? fetchedStatus : 'unknown');
            console.log(`[fetchInstancesAndSetState] Updated localConnectionState to: ${fetchedStatus || 'unknown'} (current state was not 'qrcode')`);
        } else {
            console.log(`[fetchInstancesAndSetState] Current state is 'qrcode'. Skipping state update from fetchInstancesAndSetState.`);
        }
        // *** MODIFICATION END ***


        // Update user_reference_id for the first instance (consider if this should be for the selected one)
        let ownerJid = validInstances[0].ownerJid; // Or should this be for the selected instance?
        if (ownerJid) {
          ownerJid = ownerJid.replace(/@s\.whatsapp\.net$/, '');
          // Update DB (consider moving this logic or making it more robust)
          supabase.from('integrations_config').update({ user_reference_id: ownerJid }).eq('integration_id', integrationId)
            .then(({ error }) => {
              if (error) console.error("[fetchInstancesAndSetState] Error updating user_reference_id:", error);
            });
        }

      } else {
        setSelectedInstanceName("");
        // Also ensure state is not 'qrcode' if no instances exist
        if (localConnectionState === 'qrcode') {
            setLocalConnectionState('unknown');
        } else {
           setLocalConnectionState('unknown'); // No instances, state is unknown
        }
      }
    } catch (err) {
      console.error("[fetchInstancesAndSetState] Error:", err);
      toast({ variant: "destructive", title: "Error Fetching Instances", description: (err as Error).message });
      setFetchedInstances([]);
      setSelectedInstanceName("");
      // Reset state on error, ensuring not stuck in qrcode
      setLocalConnectionState('unknown');
    } finally {
      setIsFetchingInstances(false);
    }
    // Update dependencies if needed, add localConnectionState
  }, [selectedInstanceName, localConnectionState]); // Added localConnectionState dependency


  // --- Effects ---

  // Initial fetch on dialog open
  useEffect(() => {
    if (open && selectedIntegration?.id) {
      fetchInstancesAndSetState(selectedIntegration.id);
    } else if (!open) {
      // Reset state when dialog closes
      setFetchedInstances([]);
      setSelectedInstanceName("");
      setNewInstanceName("");
      setLocalConnectionState('unknown');
      setQrCodeBase64(null);
      setPairingCode(null);
      setIsPollingForConnection(false);
      if (qrPollingInterval) clearInterval(qrPollingInterval);
      setQrPollingInterval(null);
    }
  }, [open, selectedIntegration?.id, fetchInstancesAndSetState, qrPollingInterval]);


  // Update local state derived from fetched instances
  // This effect might be redundant now due to the logic inside fetchInstancesAndSetState
  // Consider removing or refining it if fetchInstancesAndSetState handles all necessary state updates.
  // For now, keep it but be aware it might conflict if not careful.
  useEffect(() => {
    const instance = fetchedInstances.find(inst => inst.name === selectedInstanceName);
    const status = instance?.connectionStatus;
    // Prevent this effect from overwriting 'qrcode' state as well
    if (localConnectionState !== 'qrcode') {
        setLocalConnectionState(isValidConnectionState(status) ? status : 'unknown');
    }
  }, [fetchedInstances, selectedInstanceName, localConnectionState]); // Added localConnectionState


  // --- Polling Logic ---
  const pollConnectionStatus = useCallback(async () => {
    const instanceName = selectedInstanceName; // Use state variable
    const integrationId = selectedIntegration?.id;

    if (!instanceName || !integrationId) {
      console.warn("[pollConnectionStatus] Cannot poll without selected instance name or integration ID.");
      setIsPollingForConnection(false);
      return;
    }

    console.log(`[pollConnectionStatus] Polling status for: ${instanceName}`);
     try {
       const newStatus = await checkInstanceStatus(instanceName, integrationId);
       console.log("[pollConnectionStatus] Poll result:", newStatus);

       // Only update state if the new status is valid AND
       // (current state is NOT qrcode OR the new status IS open)
       if (isValidConnectionState(newStatus)) {
         if (localConnectionState !== 'qrcode' || newStatus === 'open') {
           console.log(`[pollConnectionStatus] Updating state from ${localConnectionState} to ${newStatus}`);
           setLocalConnectionState(newStatus);
         } else {
           console.log(`[pollConnectionStatus] Current state is 'qrcode', new status is '${newStatus}'. Keeping 'qrcode' state.`);
         }
       } else {
         console.warn(`[pollConnectionStatus] Received invalid state '${newStatus}'. Setting to 'unknown'.`);
        setLocalConnectionState('unknown');
      }
    } catch (error) {
      console.error(`[pollConnectionStatus] Error polling instance ${instanceName}:`, error);
      setLocalConnectionState('unknown');
      setIsPollingForConnection(false);
    }
    // Pass localConnectionState as dependency because the logic inside depends on its current value
  }, [selectedInstanceName, selectedIntegration?.id, localConnectionState]); // Added localConnectionState

  // Effect to START polling only when QR code is shown
  useEffect(() => {
    if (localConnectionState === 'qrcode') {
      console.log("[Polling Control Effect] State is qrcode, enabling polling.");
      setIsPollingForConnection(true);
    } else {
      if (isPollingForConnection) {
         console.log(`[Polling Control Effect] State changed from qrcode to ${localConnectionState}, disabling polling.`);
         setIsPollingForConnection(false);
      }
    }
  }, [localConnectionState, isPollingForConnection]); // Added isPollingForConnection dependency

  // Effect to run the polling interval
  useEffect(() => {
    if (qrPollingInterval) {
      clearInterval(qrPollingInterval);
     setQrPollingInterval(null);
   }

   let startTimeoutId: NodeJS.Timeout | null = null; // Timeout ID for delaying the start

   if (isPollingForConnection && open) {
     console.log(`[Polling Interval Effect] Scheduling interval start after 5s delay.`);
     startTimeoutId = setTimeout(() => {
       console.log(`[Polling Interval Effect] Delay complete. Starting interval.`);
       // Start the interval *after* the delay
       const intervalId = setInterval(pollConnectionStatus, 5000);
       setQrPollingInterval(intervalId);
       // Optionally, run the first poll immediately after delay if needed
       // pollConnectionStatus();
     }, 5000); // 5-second delay before starting the interval

   } else {
      console.log(`[Polling Interval Effect] Not starting or stopping interval (isPolling: ${isPollingForConnection}, open: ${open}).`);
   }

   return () => {
     // Clear both timeout and interval on cleanup
     if (startTimeoutId) {
       console.log("[Polling Interval Cleanup] Clearing start timeout.");
       clearTimeout(startTimeoutId);
     }
     if (qrPollingInterval) {
       console.log("[Polling Interval Cleanup] Clearing interval.");
       clearInterval(qrPollingInterval);
       setQrPollingInterval(null);
     }
   };
 }, [open, isPollingForConnection, pollConnectionStatus]); // Keep dependencies


  // --- Effect for 'open' state ---
  useEffect(() => {
    if (localConnectionState === 'open') {
      console.log("[Open State Effect] State is 'open'.");
      setIsConnected(true);
      setIsPollingForConnection(false); // Ensure polling stops
      setQrCodeBase64(null);
      setPairingCode(null);
      if (onConnectionEstablished) {
        onConnectionEstablished();
      }
      if (selectedIntegration?.id) {
        // Setup webhook and update details
         const setupWebhook = async () => {
           try {
             const { data: integrationData, error: integrationError } = await supabase.from('integrations').select('webhook_url, webhook_events').eq('id', selectedIntegration.id).single();
             if (integrationError || !integrationData) throw new Error(`Failed to fetch integration details: ${integrationError?.message || 'No data'}`);
             const { data: configData, error: configError } = await supabase.from('integrations_config').select('instance_display_name').eq('integration_id', selectedIntegration.id).maybeSingle();
             if (configError) console.error(`Error fetching config for webhook: ${configError.message}`);
             const instanceDisplayName = configData?.instance_display_name || selectedInstanceName; // Use selected name as fallback
             const webhookEventsValid = Array.isArray(integrationData.webhook_events) && integrationData.webhook_events.length > 0;
             if (!integrationData.webhook_url || !webhookEventsValid || !instanceDisplayName) {
               console.warn(`[Webhook Setup] Skipping: Missing URL, Events, or Display Name.`); return;
             }
             await setEvolutionWebhook(selectedIntegration.id, instanceDisplayName, integrationData.webhook_url, integrationData.webhook_events as string[]);
             toast({ title: "Webhook Configured", description: "Webhook settings applied." });
           } catch (error) { console.error("[Webhook Setup] Error:", error); toast({ title: "Webhook Setup Error", description: (error as Error).message, variant: "destructive" }); }
         };
         setupWebhook();
         fetchAndUpdateDetails(selectedIntegration.id); // Call function defined above
      }
    }
  }, [localConnectionState, selectedIntegration, onConnectionEstablished, selectedInstanceName, fetchAndUpdateDetails]); // Added fetchAndUpdateDetails


  // --- Connection/Creation Handlers ---
  const handleConnect = useCallback(async (instanceNameToConnect: string | null | undefined = null) => {
    const targetInstanceName = instanceNameToConnect || selectedInstanceName;
    console.log("[handleConnect] Function called for instance:", targetInstanceName);

    if (!targetInstanceName) {
      toast({ title: "Error", description: "No instance name provided or selected.", variant: "destructive" });
      return;
    }
    if (!selectedIntegration?.id) {
      toast({ title: "Error", description: "Integration ID missing.", variant: "destructive" });
      return;
    }

    setSelectedInstanceName(targetInstanceName);
    setIsLoading(true);
    setLocalConnectionState('connecting');
    setQrCodeBase64(null);
    setPairingCode(null);

    try {
      const connectResponse = await evolutionConnectToInstance(targetInstanceName, selectedIntegration.id);
      console.log("[handleConnect] Raw connectResponse:", JSON.stringify(connectResponse, null, 2)); // Log the raw response

       if (!connectResponse.instance) {
         console.log("[handleConnect] connectResponse.instance is missing. Checking top-level base64/pairingCode.");
         let useBase64: string | null = null;
         let usePairingCode: string | null = null;
         const flatBase64 = connectResponse.base64;
         const flatPairing = connectResponse.pairingCode;
         if (flatBase64 && typeof flatBase64 === 'string' && flatBase64.startsWith('data:image')) useBase64 = flatBase64;
         if (!useBase64 && flatPairing && typeof flatPairing === 'string' && flatPairing.length > 0) usePairingCode = flatPairing;

         if (useBase64) {
           setQrCodeBase64(useBase64.startsWith('data:image/png;base64,') ? useBase64 : `data:image/png;base64,${useBase64}`);
           setPairingCode(null);
           setLocalConnectionState('qrcode');
           toast({ title: "Scan QR Code", description: "Scan the QR code with your WhatsApp." });
         } else if (usePairingCode) {
           setPairingCode(usePairingCode);
           setQrCodeBase64(null);
           setLocalConnectionState('qrcode');
           toast({ title: "Enter Pairing Code", description: "Enter the code shown on your WhatsApp." });
         } else {
           console.error("[handleConnect] No instance/QR/Pairing data in response.", connectResponse);
           toast({ variant: "destructive", title: "Connection Error", description: "Failed to retrieve connection details." });
           setLocalConnectionState('close');
         }
       } else {
         const instanceStatus = connectResponse.instance?.status as ConnectionState | undefined;
         if (instanceStatus === 'open') {
           setLocalConnectionState('open');
           toast({ title: "Already Connected", description: "The WhatsApp instance is already connected." });
         } else {
           let useBase64: string | null = null;
           let usePairingCode: string | null = null;
           const nestedBase64 = connectResponse.qrcode?.base64;
           const flatBase64 = connectResponse.base64;
           if (nestedBase64 && typeof nestedBase64 === 'string' && nestedBase64.startsWith('data:image')) useBase64 = nestedBase64;
           else if (flatBase64 && typeof flatBase64 === 'string' && flatBase64.startsWith('data:image')) useBase64 = flatBase64;
           if (!useBase64) {
             const nestedPairing = connectResponse.qrcode?.pairingCode;
             const flatPairing = connectResponse.pairingCode;
             if (nestedPairing && typeof nestedPairing === 'string' && nestedPairing.length > 0) usePairingCode = nestedPairing;
             else if (flatPairing && typeof flatPairing === 'string' && flatPairing.length > 0) usePairingCode = flatPairing;
           }

           if (useBase64) {
             setQrCodeBase64(useBase64.startsWith('data:image/png;base64,') ? useBase64 : `data:image/png;base64,${useBase64}`);
             setPairingCode(null);
             setLocalConnectionState('qrcode');
             toast({ title: "Scan QR Code", description: "Scan the QR code with your WhatsApp." });
           } else if (usePairingCode) {
             setPairingCode(usePairingCode);
             setQrCodeBase64(null);
             setLocalConnectionState('qrcode');
             toast({ title: "Enter Pairing Code", description: "Enter the code shown on your WhatsApp." });
           } else {
             console.error(`[handleConnect] Failed to get QR/Pairing data. Status: ${instanceStatus}. Response:`, connectResponse);
             toast({ variant: "destructive", title: "Connection Error", description: `Failed to retrieve QR/Pairing code. Status: ${instanceStatus || 'Unknown'}.` });
             setLocalConnectionState('close');
           }
         }
       }
    } catch (error) {
      console.error("[handleConnect] Error during connection process:", error);
      toast({ variant: "destructive", title: "Connection Error", description: `An error occurred: ${(error as Error).message}` });
      setLocalConnectionState('close');
    } finally {
        setIsLoading(false);
    }
    // Add localConnectionState dependency? No, handleConnect should trigger state changes, not react to them.
  }, [selectedIntegration?.id, selectedInstanceName]);


  const handleCreateAndConnect = useCallback(async () => {
    if (!newInstanceName || !selectedIntegration?.id) return;
    setIsLoading(true);
    const { success, error, instanceData } = await createEvolutionInstance(newInstanceName, selectedIntegration.id);
    if (success && instanceData) {
      await refetchInstances(); // Use the refetch function defined above
      setSelectedInstanceName(newInstanceName);
      await handleConnect(newInstanceName);
    } else {
      toast({ variant: "destructive", title: "Instance Creation Failed", description: error || "Failed to create instance." });
      setIsLoading(false);
    }
  }, [newInstanceName, selectedIntegration?.id, refetchInstances, handleConnect]); // Added refetchInstances


  // --- Other Handlers ---
  const handleSelectedInstanceNameChange = useCallback((name: string) => {
    setSelectedInstanceName(name);
    const instance = fetchedInstances.find(inst => inst.name === name);
    const status = instance?.connectionStatus;
    // Prevent overwriting qrcode state when simply changing selection
    if (localConnectionState !== 'qrcode') {
        setLocalConnectionState(isValidConnectionState(status) ? status : 'unknown');
    }
    setQrCodeBase64(null); // Clear QR when selection changes
    setPairingCode(null); // Clear pairing code
    setIsPollingForConnection(false); // Stop polling
  }, [fetchedInstances, localConnectionState]); // Added localConnectionState

  const handleNewInstanceNameChange = useCallback((name: string) => {
    setNewInstanceName(name);
  }, []);

  const handleWebhookSetupComplete = useCallback(async () => {
    setShowWebhookSetup(false);
    setPendingWebhookIntegrationId(null);
    await handleConnect(newInstanceName);
  }, [handleConnect, newInstanceName]);


  // --- Return Values ---
  return {
    integrationMainPopup,
    setIntegrationMainPopup,
    showDeviceSelect,
    setShowDeviceSelect,
    isConnected,
    connectionState: localConnectionState,
    isLoading: isLoading || configLoading || isFetchingInstances,
    qrCodeBase64,
    pairingCode,
    handleConnect,
    fetchedInstances,
    isFetchingInstances,
    selectedInstanceName, // Expose selectedInstanceName
    handleSelectedInstanceNameChange,
    newInstanceName,
    handleNewInstanceNameChange,
    handleCreateAndConnect,
    showWebhookSetup,
    pendingWebhookIntegrationId,
    handleWebhookSetupComplete,
    refetch: refetchInstances,
  };
}
