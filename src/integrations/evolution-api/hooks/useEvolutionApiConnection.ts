import { useToast } from "@/hooks/use-toast";
import { useState, useEffect, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query"; // Import queryClient
import { supabase } from "@/integrations/supabase/client"; // Import supabase
import { useEvolutionApiConfig } from "./useEvolutionApiConfig"; // Correct path
import { checkInstanceStatus } from "../services/instanceStatusService"; // Correct path
import { getEvolutionCredentials } from "../utils/credentials"; // Import credentials fetcher
// import { connectToInstance } from "../services/instanceConnectService"; // No longer used directly for initial connect
import { deleteEvolutionInstance } from "../services/deleteInstanceService"; // Import delete service
import { createEvolutionInstance } from "../services/createInstanceService"; // Import create service
import type { ConnectionState } from "../types"; // Correct path
import type { Integration } from "@/components/settings/types"; // Correct path


export function useEvolutionApiConnection(selectedIntegration: Integration | null) {
  const { toast } = useToast();
  const queryClient = useQueryClient(); // Get query client instance
  const [qrCodeBase64, setQrCodeBase64] = useState<string | null>(null);
  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const [connectionState, setConnectionState] = useState<ConnectionState>('unknown');
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null);
  // Remove polling-specific state again


  // Still need config for base_url and potentially initial token/instance_id for status checks
  const { config, isLoading: configLoading } = useEvolutionApiConfig(selectedIntegration);

  // Function to check connection state based on the current config (for initial load)
  const checkCurrentConnectionState = useCallback(async () => {
    const instanceIdToCheck = config?.instance_id;
    const baseUrlToCheck = config?.base_url;
    const tokenToUse = config?.token;

    if (instanceIdToCheck && tokenToUse && baseUrlToCheck) {
      console.log(`Checking status for configured instance: ${instanceIdToCheck}`);
      try {
        // Use only 3 arguments now
        const currentState = await checkInstanceStatus(instanceIdToCheck, tokenToUse, baseUrlToCheck);
        setConnectionState(currentState);
        if (currentState === 'open') {
          setQrCodeBase64(null);
          setPairingCode(null);
          return true;
        }
        return false;
      } catch (error) {
         console.error("Polling: Error checking instance status:", error);
         // Decide how to handle polling errors, maybe set to 'close' or 'unknown'
         setConnectionState('close');
         return false;
      }
    } else {
      console.log('Status Check: Necessary details not available (Instance ID, Main API Key, or Base URL missing).');
      // Don't change state if details aren't ready
    }
    return false;
    // Dependencies: Now depends only on the config object
  }, [config]);

  // Modified startPolling to accept new instance details directly
  const startPolling = useCallback((newInstanceId: string, newToken: string) => {
    // Clear any existing polling
    if (pollingInterval) {
      clearInterval(pollingInterval);
      setPollingInterval(null); // Clear state immediately
    }

    console.log(`Starting connection status polling for NEW instance: ${newInstanceId}`);
    // Start a new polling interval using the passed details
    const intervalId = setInterval(async () => {
      console.log(`Polling for NEW instance status: ${newInstanceId}`);
      const baseUrlToCheck = config?.base_url; // Get base URL from config

      if (!baseUrlToCheck) {
        console.error("Polling Error: Base URL not available from config.");
        clearInterval(intervalId); // Stop polling if base URL is missing
        setPollingInterval(null);
        setConnectionState('close');
        return;
      }

      try {
        const currentState = await checkInstanceStatus(newInstanceId, newToken, baseUrlToCheck);
        setConnectionState(currentState); // Update global connection state

        if (currentState === 'open') {
          console.log(`Polling successful: Instance ${newInstanceId} is open. Stopping polling.`);
          clearInterval(intervalId); // Stop this specific interval
          setPollingInterval(null); // Clear interval state
          setQrCodeBase64(null);
          setPairingCode(null);
          // No need to clear pollingInstanceId/Token as they are not used anymore
        }
      } catch (error) {
        console.error(`Polling Error for instance ${newInstanceId}:`, error);
        // Optionally stop polling on error or let it continue? Stop for now.
        clearInterval(intervalId);
        setPollingInterval(null);
        setConnectionState('close');
      }
    }, 3000); // Check every 3 seconds

    setPollingInterval(intervalId); // Store the interval ID

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

    // Return a cleanup function for the effect? Maybe not needed if cleared internally
    // return () => { ... };
    // Dependencies: interval state, config for base URL, connectionState for timeout logic
    // Removed checkCurrentConnectionState from dependencies as it's not called inside interval
  }, [pollingInterval, config?.base_url, connectionState]);

  // Main function to handle the delete -> create -> connect flow
  const connectToWhatsApp = async () => {
    setQrCodeBase64(null); // Clear previous QR/Pairing codes
    setPairingCode(null);
    setConnectionState('connecting'); // Initial state

    if (!selectedIntegration?.id) {
       toast({ title: "Error", description: "No integration selected.", variant: "destructive" });
       setConnectionState('close');
       return false;
    }
    // Need base_url from config for API calls
    if (!config?.base_url) {
        toast({ title: "Error", description: "Integration Base URL not found.", variant: "destructive" });
        setConnectionState('close');
        return false;
    } // <-- This was the missing brace location

    const integrationId = selectedIntegration.id;
    const instanceNameToUse = "DEFAULT"; // Use "DEFAULT" as per user feedback

    try {
      // --- Fetch Credentials including Metadata AND Main API Key ---
      console.log(`Connect Flow: Fetching credentials for integration ${integrationId}`);
      // Fetch main apiKey here as it's needed for polling
      const { metadata, apiKey: mainApiKey } = await getEvolutionCredentials(integrationId);
      console.log("--- Connect Flow: Raw metadata fetched from DB:", JSON.stringify(metadata, null, 2)); // Log raw metadata

      if (!mainApiKey) {
        throw new Error("Main API Key not found in credentials.");
      }

      // Define the specific expected structure of the metadata object from the database
      // Avoid using 'Record<string, any>' to resolve ESLint warning and improve type safety
      type FetchedMetadata = {
          instanceName?: string | null;
          integration?: string | null;
          customerId?: string | null;
          projectId?: string | null;
          qrcode?: boolean | null;
          webhook?: { // Expect nested object
              url?: string | null;
              events?: string[] | null;
              ByEvents?: boolean | null;
          } | null; // Allow the whole webhook object to be null
      };

      // Perform a safer type assertion/check. Assume 'metadata' is 'unknown' initially.
      const fetchedMeta = (typeof metadata === 'object' && metadata !== null)
        ? metadata as FetchedMetadata
        : null; // Treat as null if not a valid object

      // Create the validatedMeta object conforming to InstanceMetadata interface
      // used by createEvolutionInstance, preserving the nested structure for clarity
      // Ensure all required fields for InstanceMetadata are present
      const validatedMeta = {
          instanceName: fetchedMeta?.instanceName ?? "DEFAULT",
          integration: fetchedMeta?.integration ?? "WHATSAPP-EVOLUTION",
          customerId: fetchedMeta?.customerId ?? undefined, // Pass undefined if null/missing
          projectId: fetchedMeta?.projectId ?? undefined, // Pass undefined if null/missing
          qrcode: fetchedMeta?.qrcode ?? undefined, // Pass qrcode through or undefined
          // Pass the nested webhook object directly if it exists and is an object
          webhook: (typeof fetchedMeta?.webhook === 'object' && fetchedMeta.webhook !== null)
            ? fetchedMeta.webhook
            : undefined
      };

      // Now validate the required top-level fields AFTER potential fallbacks/assignments
      if (!validatedMeta.customerId) {
         throw new Error("customerId not found in integration metadata.");
      }
       if (!validatedMeta.projectId) {
         throw new Error("projectId not found in integration metadata.");
      }
      // instanceName and integration have fallbacks.

      // Extract top-level values for logging
      const {
          instanceName: instanceNameFromMeta,
          integration: integrationTypeFromMeta,
          customerId, // Already validated
          projectId // Already validated
      } = validatedMeta;


      console.log(`Connect Flow: Using instanceName: ${instanceNameFromMeta}, integrationType: ${integrationTypeFromMeta}, customerId: ${customerId}, projectId: ${projectId}`);
      // Log the webhook part separately for debugging
      console.log(`Connect Flow: Validated webhook object being passed:`, validatedMeta.webhook);

      /* --- Skip Deletion Step (as requested) ---
      // console.log(`Connect Flow: Attempting to delete instance: ${instanceNameFromMeta}`);
      // const deleteSuccess = await deleteEvolutionInstance(instanceNameFromMeta, integrationId);
      // if (!deleteSuccess) {
      //   // Log warning but proceed, maybe it didn't exist or deletion failed non-critically
      //   console.warn(`Connect Flow: Failed to delete instance ${instanceNameFromMeta} or it didn't exist. Proceeding with creation...`);
      // } else {
      //    console.log(`Connect Flow: Successfully deleted or confirmed non-existence of instance ${instanceNameFromMeta}.`);
      // }
      */

      // --- Create New Instance (passing required IDs and details from metadata) ---
      console.log(`Connect Flow: Attempting to create instance: ${instanceNameFromMeta}`);
      // Pass integrationId and the validated metadata object which now conforms to InstanceMetadata
      const createResponse = await createEvolutionInstance(
          integrationId,
          validatedMeta // Pass the validated object
      );

      // --- 3. Process Creation Response ---
      // Get the actual instanceId returned by the API
      const actualInstanceId = createResponse?.instance?.instanceId; // API returns the real ID
      const newInstanceToken = createResponse?.hash?.apikey; // API returns the token (should match generated one)
      const qrCodeBase64Raw = createResponse?.base64 || createResponse?.qrcode?.base64;
      const newPairingCode = createResponse?.pairingCode || createResponse?.qrcode?.pairingCode;

      // Validate essential response parts
      if (!actualInstanceId) {
          throw new Error("Instance created, but no instanceId received from Evolution API response.");
      }
      if (!newInstanceToken) {
         throw new Error("Instance created, but no API token (hash.apikey) received from Evolution API.");
      }
      if (!qrCodeBase64Raw && !newPairingCode) {
         throw new Error("Instance created, but no QR code or Pairing code received from Evolution API.");
      }

      console.log(`Connect Flow: Instance ${instanceNameToUse} created successfully. Actual ID: ${actualInstanceId}. Token received. QR/Pairing code found.`);

      // --- 4. Upsert Config to Supabase (using actualInstanceId) ---
      console.log(`Connect Flow: Upserting new config for integration ${integrationId} with actual instance ID ${actualInstanceId} and new token.`);
      const { error: upsertError } = await supabase
        .from('integrations_config')
        .upsert(
          {
            integration_id: integrationId,
            instance_id: actualInstanceId, // Use the actual ID returned by the API
            token: newInstanceToken,
            // Use profile name from response, fallback to name from metadata
            instance_display_name: createResponse?.instance?.profileName || instanceNameFromMeta
          },
          { onConflict: 'integration_id' }
        );

      if (upsertError) {
        console.error("Connect Flow: Error upserting new config:", upsertError);
        throw new Error(`Failed to save new instance configuration: ${upsertError.message}`);
      }
      console.log(`Connect Flow: Successfully upserted new config for integration ${integrationId} with instance ID ${actualInstanceId}.`);

      // --- 5. Update UI State ---
      if (qrCodeBase64Raw) {
        const qrCodeDataUrl = qrCodeBase64Raw.startsWith('data:image/png;base64,') ? qrCodeBase64Raw : `data:image/png;base64,${qrCodeBase64Raw}`;
        setQrCodeBase64(qrCodeDataUrl);
        console.log("Connect Flow: QR Code state updated.");
      }
      if (newPairingCode) {
        setPairingCode(newPairingCode);
         console.log("Connect Flow: Pairing Code state updated.");
      }
      setConnectionState('connecting'); // Already set, but confirm

      // --- 6. Invalidate Old Config, Delay, & Start Polling ---
      // No need to set polling details state anymore
      console.log("Connect Flow: Invalidating config query.");
      await queryClient.invalidateQueries({ queryKey: ['integration-config', integrationId] });

      // Add a short delay before starting polling
      console.log("Connect Flow: Waiting 2 seconds before starting polling...");
      await new Promise(resolve => setTimeout(resolve, 2000)); // 2-second delay

      console.log("Connect Flow: Starting polling with new instance details.");
      startPolling(actualInstanceId, newInstanceToken); // Pass new details directly

      return true; // Indicate success

    } catch (error) {
      console.error('Connect Flow: Error during delete/create/connect process:', error);
      toast({
        title: "Connection Error",
        description: `Failed to set up WhatsApp connection: ${error instanceof Error ? error.message : String(error)}`,
        variant: "destructive",
      });
        setConnectionState('close'); // Set state to close on error
      return false;
    }
  }; // <-- Corrected closing brace for connectToWhatsApp

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
