
import { useState, useEffect } from "react";
import { Integration } from "../../types";
import { useEvolutionApiConnection } from "@/integrations/evolution-api/hooks/useEvolutionApiConnection"; // Updated import path and hook name
import { supabase } from "@/integrations/supabase/client";
import { ConnectionState } from "@/integrations/evolution-api/types"; // Updated import path

export function useIntegrationConnectionState(
  selectedIntegration: Integration | null,
  open: boolean,
  // Add the new callback parameter
  onConnectionEstablished?: () => void // Make it optional for safety
) {
  const [showDeviceSelect, setShowDeviceSelect] = useState(false);
  const [integrationMainPopup, setIntegrationMainPopup] = useState(true);
  const [integrationQRPopup, setIntegrationQRPopup] = useState(false);
  const [isConnected, setIsConnected] = useState(false);

  const { 
    connectToInstance,
    qrCodeBase64,
    pairingCode,
    connectionState, 
    isLoading,
    checkCurrentConnectionState 
  } = useEvolutionApiConnection(selectedIntegration); // Use updated hook name

  // Check connection status when the dialog is opened
  useEffect(() => {
    if (open && selectedIntegration && selectedIntegration.name === "WhatsApp") {
      checkCurrentConnectionState();
    }
  }, [open, selectedIntegration, checkCurrentConnectionState]);

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
      
      // Update the integration connection status in the database
      if (selectedIntegration) {
        updateIntegrationStatus(selectedIntegration.id);
      }
    }
    // Add onConnectionEstablished to dependency array if it's expected to change,
    // but handleDialogChange is likely stable. Let's omit it for now.
  }, [connectionState, integrationQRPopup, selectedIntegration, onConnectionEstablished]);
  
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

  const handleConnect = () => {
    setShowDeviceSelect(true);
    setIntegrationMainPopup(false);
  };

  const handleDeviceSelect = async () => { // Renamed function
    const success = await connectToInstance();
    if (success) {
      setShowDeviceSelect(false);
      setIntegrationQRPopup(true);
    }
  };

  return {
    showDeviceSelect,
    setShowDeviceSelect,
    integrationMainPopup,
    setIntegrationMainPopup,
    integrationQRPopup,
    setIntegrationQRPopup,
    isConnected,
    setIsConnected,
    qrCodeBase64,
    pairingCode,
    connectionState,
    isLoading,
    handleConnect,
    handleDeviceSelect // Renamed in return object
  };
}
