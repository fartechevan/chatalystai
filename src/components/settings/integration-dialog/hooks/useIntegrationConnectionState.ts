import { useState, useEffect, useCallback } from "react";
import { Integration } from "../../types";
import { useEvolutionApiConnection } from "@/integrations/evolution-api/hooks/useEvolutionApiConnection"; // Updated import path and hook name
import { supabase } from "@/integrations/supabase/client";
import { ConnectionState, EvolutionInstance } from "@/integrations/evolution-api/types"; // Removed CreateInstancePayload
import { fetchEvolutionInstances } from "@/integrations/evolution-api/services/fetchInstancesService";
import { getEvolutionCredentials } from "@/integrations/evolution-api/utils/credentials"; // Import getEvolutionCredentials
import { useEvolutionApiConfig } from "@/integrations/evolution-api/hooks/useEvolutionApiConfig";
import { connectToInstance as evolutionConnectToInstance } from "@/integrations/evolution-api/services/instanceConnectService";
// Import createEvolutionInstance and the BaseMetadata type
import { createEvolutionInstance, type BaseMetadata } from "@/integrations/evolution-api/services/createInstanceService";
import { toast } from "@/components/ui/use-toast"; // Import toast for error handling

// Removed local InstanceMetadata definition. BaseMetadata is imported.


export function useIntegrationConnectionState(
  selectedIntegration: Integration | null,
  open: boolean,
  // Add the new callback parameter
  onConnectionEstablished?: () => void // Make it optional for safety
) {
  // Removed showDeviceSelect state and its setter
  const [integrationMainPopup, setIntegrationMainPopup] = useState(true);
  const [integrationQRPopup, setIntegrationQRPopup] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [qrCodeBase64, setQrCodeBase64] = useState<string | null>(null);
  const [pairingCode, setPairingCode] = useState<string | null>(null);

  const { config, isLoading: configLoading } = useEvolutionApiConfig(selectedIntegration);

  const {
    connectionState,
    isLoading,
    checkCurrentConnectionState
  } = useEvolutionApiConnection(selectedIntegration); // Use updated hook name

  // Check connection status when the dialog is opened
  useEffect(() => {
    if (open && selectedIntegration && selectedIntegration.name === "WhatsApp" && config) {
      checkCurrentConnectionState();
    }
  }, [open, selectedIntegration, checkCurrentConnectionState, config]);

  useEffect(() => {
    // Log whenever this effect runs due to dependency changes
    console.log(`[useIntegrationConnectionState Effect] connectionState: ${connectionState}, integrationQRPopup: ${integrationQRPopup}`);

    if (connectionState === 'open' && integrationQRPopup) {
      // Close QR popup when connection is established
      console.log("--> Condition met: Closing QR popup and setting main popup."); // Add specific log
      setIntegrationQRPopup(false);
      setIntegrationMainPopup(true);
      setIsConnected(true);

      // Call the callback function passed from IntegrationDialog
      if (onConnectionEstablished) {
        console.log("--> Calling onConnectionEstablished callback.");
        onConnectionEstablished(); // This should trigger handleDialogChange(false) indirectly
      }

      // Fetch latest instance details and update DB
      if (selectedIntegration) {
        // Call the function to fetch and update details
        fetchAndUpdateDetails(selectedIntegration.id);
      }
    }
  }, [connectionState, integrationQRPopup, selectedIntegration, onConnectionEstablished]);

  const fetchAndUpdateDetails = async (integrationId: string) => {
    console.log(`[fetchAndUpdateDetails] Starting for integration ${integrationId}`);
    try {
      // Log the integration ID
      console.log(`[fetchAndUpdateDetails] Integration ID: ${integrationId}`);

      // 1. Get Evolution API credentials from the database (via Supabase client)
      const { apiKey, baseUrl } = await getEvolutionCredentials(integrationId);
      console.log(`[fetchAndUpdateDetails] apiKey: ${apiKey}, baseUrl: ${baseUrl}`);

      // 2. Get the stored instance_id for this integration
      const { data: configData, error: configError } = await supabase
        .from('integrations_config')
        .select('instance_id')
        .eq('integration_id', integrationId)
        .single();

      if (configError || !configData?.instance_id) {
        console.error(`[fetchAndUpdateDetails] Error fetching config or instance_id missing for ${integrationId}:`, configError);
        // Optionally call updateIntegrationStatus here to ensure a record exists?
        await updateIntegrationStatus(integrationId); // Ensure record exists before trying update again maybe?
        return; // Exit if we can't get the instance_id
      }
      const storedInstanceId = configData.instance_id;
      console.log(`[fetchAndUpdateDetails] Found stored instance_id: ${storedInstanceId}`);

      // 2. Fetch all instances from Evolution API
      const fetchedInstances = await fetchEvolutionInstances(integrationId);
      console.log(`[fetchAndUpdateDetails] Fetched ${fetchedInstances.length} instances from API.`);

      // 3. Find the matching instance in the response
      // Assuming the response structure matches EvolutionInstance[]
      const matchingInstance = fetchedInstances.find(
        (inst: EvolutionInstance) => inst.instance?.instanceId === storedInstanceId
      );

      if (matchingInstance?.instance) {
        const { instanceName, ownerJid } = matchingInstance.instance;
        console.log(`[fetchAndUpdateDetails] Found matching instance: Name=${instanceName}, OwnerJid=${ownerJid}`);

        // 4. Update the database record
        const { error: updateError } = await supabase
          .from('integrations_config')
          .update({
            instance_display_name: instanceName, // Map API's instanceName to DB's instance_display_name
            owner_id: ownerJid // Map API's ownerJid to DB's owner_id
          })
          .eq('integration_id', integrationId);

        if (updateError) {
          console.error(`[fetchAndUpdateDetails] Error updating integrations_config for ${integrationId}:`, updateError);
        } else {
          console.log(`[fetchAndUpdateDetails] Successfully updated integrations_config for ${integrationId} with display name and owner_id.`);
        }
      } else {
        console.warn(`[fetchAndUpdateDetails] Could not find matching instance with ID ${storedInstanceId} in fetched data for integration ${integrationId}.`);
      }
    } catch (error) {
      console.error(`[fetchAndUpdateDetails] Error during fetch/update process for ${integrationId}:`, error);
    }
  };

  // This function ensures a basic config record exists, might be redundant now?
  // Or keep it as a fallback called from fetchAndUpdateDetails if config is missing.
  const updateIntegrationStatus = async (integrationId: string) => {
    try {
      // We don't have an is_connected field, so let's just ensure there's a record
      const { data: existingConfig, error: checkError } = await supabase
        .from('integrations_config')
        .select('id')
        .eq('integration_id', integrationId)
        .maybeSingle();

      if (checkError) {
        console.error('Error checking integration config:', checkError);
        return;
      }

      if (!existingConfig) {
        // Create a new config if one doesn't exist
        const { error: insertError } = await supabase
          .from('integrations_config')
          .insert({
            integration_id: integrationId,
            // Add default values for required fields
            base_url: 'https://api.evoapicloud.com'
          });

        if (insertError) {
          console.error('Error inserting integration config:', insertError);
        }
      }
    } catch (error) {
      console.error('Error updating integration status:', error);
    }
  };

  // --- Internal function to handle NEW instance creation and connection ---
  const _createNewInstanceAndConnect = async () => {
    if (!selectedIntegration?.id) {
      console.error("Integration ID is missing for create flow."); // Simplified error message
      toast({ variant: "destructive", title: "Error", description: "Integration ID is missing." });
      return;
    }

    // --- 1. Fetch metadata from the 'integrations' table ---
    console.log(`[_createNewInstanceAndConnect] Fetching metadata for integration ID: ${selectedIntegration.id}`); // Changed log prefix
    const { data: integrationData, error: integrationError } = await supabase
      .from('integrations') // Query the 'integrations' table
      .select('metadata') // Select the metadata JSON field
      .eq('id', selectedIntegration.id) // Use the selected integration's ID
      .single();

    if (integrationError) {
      console.error("Failed to fetch integration metadata:", integrationError);
      toast({ variant: "destructive", title: "Error", description: "Could not retrieve integration metadata. Please try again." });
      return;
    }

    if (!integrationData || !integrationData.metadata) {
      console.error("Integration metadata is missing or empty.");
      toast({ variant: "destructive", title: "Error", description: "Integration metadata is missing. Please check integration settings." });
      return;
    }

    // --- 2. Validate and Use Fetched Metadata Directly ---
    // Ensure metadata is a valid object before proceeding
    if (typeof integrationData.metadata !== 'object' || integrationData.metadata === null) {
      console.error("Fetched metadata is not a valid object:", integrationData.metadata);
      toast({ variant: "destructive", title: "Error", description: "Invalid metadata format received. Please check integration settings." });
      return;
    }

    // The fetched metadata object will be passed directly.
    // The createEvolutionInstance service expects BaseMetadata, which allows extra properties.
    const metadataFromDb = integrationData.metadata as BaseMetadata;

    // Basic check for essential fields expected by the API (based on user example)
    if (!metadataFromDb.instanceName || !metadataFromDb.integration) {
       console.error("Fetched metadata is missing required fields (instanceName or integration):", metadataFromDb);
       toast({ variant: "destructive", title: "Error", description: "Metadata from database is missing required fields (instanceName or integration)." });
       return;
    }

    console.log(`[_createNewInstanceAndConnect] Attempting to create instance using metadata from DB:`, metadataFromDb);
    // Pass integrationId and the *directly fetched* metadata object
    const createResponse = await createEvolutionInstance(selectedIntegration.id, metadataFromDb);

    // Use the instanceName from the *original* metadata for logging consistency if creation fails early
    const instanceNameForLogs = metadataFromDb.instanceName || 'Unknown Instance';

    if (!createResponse || !createResponse.instance?.instanceName) {
      console.error(`Failed to create Evolution instance (${instanceNameForLogs}):`, createResponse);
      toast({ variant: "destructive", title: "Error", description: "Failed to create WhatsApp instance. Please try again." });
      // Optionally navigate back or reset state
      setIntegrationMainPopup(true); // Show main popup again on error
      return;
    }

    const newInstanceName = createResponse.instance.instanceName; // Use the name returned by API
    console.log(`[_createNewInstanceAndConnect] Instance created successfully: ${newInstanceName}`); // Changed log prefix

    // --- 3. Create new instance ---
    console.log(`[_createNewInstanceAndConnect] Attempting to connect to new instance: ${newInstanceName}`); // Changed log prefix
    // Pass the instance name returned by the create API and the integration ID
    const connectResponse = await evolutionConnectToInstance(newInstanceName, selectedIntegration.id);

    // Use direct properties based on last fix for connectResponse structure
    if (connectResponse && (connectResponse.base64 || connectResponse.pairingCode)) {
      console.log("[_createNewInstanceAndConnect] Connection successful, showing QR screen."); // Changed log prefix
      setIntegrationMainPopup(false); // Hide main popup
      setIntegrationQRPopup(true);    // Show QR screen

      if (connectResponse.base64) {
        const qrCodeDataUrl = connectResponse.base64.startsWith('data:image/png;base64,') ? connectResponse.base64 : `data:image/png;base64,${connectResponse.base64}`;
        setQrCodeBase64(qrCodeDataUrl);
      }
      if (connectResponse.pairingCode) {
        setPairingCode(connectResponse.pairingCode);
      }
    } else {
      console.error("Failed to connect to instance.");
      // Handle error appropriately, e.g., show a toast
      setIntegrationMainPopup(true); // Show main popup again on error
    }
  };

  // Modified handleConnect: Check for existing instance first
  const handleConnect = async () => {
    if (!selectedIntegration?.id) {
      console.error("Integration ID is missing for handleConnect.");
      toast({ variant: "destructive", title: "Error", description: "Integration ID is missing." });
      return;
    }

    // Check if config is loaded and has an instance name
    if (config?.instance_display_name) {
      // --- Connect to EXISTING instance ---
      console.log(`[handleConnect] Existing instance found: ${config.instance_display_name}. Attempting to connect directly.`);
      try {
        const connectResponse = await evolutionConnectToInstance(config.instance_display_name, selectedIntegration.id);

        // Revert: Check for QR code data within the nested 'qrcode' object based on logs
        if (connectResponse?.qrcode && (connectResponse.qrcode.base64 || connectResponse.qrcode.pairingCode)) {
          console.log("[handleConnect] Direct connection successful, showing QR screen.");
          // Revert: Use nested properties for state update
          if (connectResponse.qrcode.base64) {
            const qrCodeDataUrl = connectResponse.qrcode.base64.startsWith('data:image/png;base64,') ? connectResponse.qrcode.base64 : `data:image/png;base64,${connectResponse.qrcode.base64}`;
            setQrCodeBase64(qrCodeDataUrl);
          }
          if (connectResponse.qrcode.pairingCode) {
            setPairingCode(connectResponse.qrcode.pairingCode);
          }
          setIntegrationMainPopup(false); // Hide main dialog content
          setIntegrationQRPopup(true);    // Show QR screen
        } else {
          // Log the actual response if the structure is unexpected or lacks QR data
          console.error("[handleConnect] Failed to get QR data from existing instance connection:", connectResponse);
          toast({ variant: "destructive", title: "Connection Error", description: "Failed to retrieve QR code for the existing instance. Please try again or check configuration." });
          // Optionally: Fallback to device select/creation? Or just show error? For now, just error.
        }
      } catch (error) {
        console.error("[handleConnect] Error connecting to existing instance:", error);
        toast({ variant: "destructive", title: "Connection Error", description: "An error occurred while connecting to the existing instance." });
      }
    } else {
      // No existing instance found, proceed to create and connect directly
      console.log("[handleConnect] No existing instance found in config. Proceeding to create and connect.");
      await _createNewInstanceAndConnect(); // Call the creation/connection logic directly
    }
  };

  // Removed handleDeviceSelect function entirely

  return {
    // Removed showDeviceSelect, setShowDeviceSelect, handleDeviceSelect
    integrationMainPopup,
    setIntegrationMainPopup,
    integrationQRPopup,
    setIntegrationQRPopup,
    isConnected,
    setIsConnected,
    connectionState,
    isLoading: configLoading,
    checkCurrentConnectionState,
    qrCodeBase64,
    pairingCode,
    handleConnect, // Keep handleConnect
  };
}
