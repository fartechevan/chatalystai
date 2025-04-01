
import { useState, useEffect } from "react";
import { Integration } from "../../types";
import { useWhatsAppConnection } from "./whatsapp/useWhatsAppConnection";
import { supabase } from "@/integrations/supabase/client";
import { ConnectionState } from "./whatsapp/types";

export function useIntegrationConnectionState(
  selectedIntegration: Integration | null, 
  open: boolean
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
  } = useWhatsAppConnection(selectedIntegration);

  // Check connection status when the dialog is opened
  useEffect(() => {
    if (open && selectedIntegration && selectedIntegration.name === "WhatsApp") {
      checkCurrentConnectionState();
    }
  }, [open, selectedIntegration, checkCurrentConnectionState]);

  useEffect(() => {
    if (connectionState === 'open' && integrationQRPopup) {
      // Close QR popup when connection is established
      setIntegrationQRPopup(false);
      setIntegrationMainPopup(true);
      setIsConnected(true);
      
      // Update the integration connection status in the database
      if (selectedIntegration) {
        updateIntegrationStatus(selectedIntegration.id);
      }
    }
  }, [connectionState, integrationQRPopup, selectedIntegration]);
  
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

  const handleIPhoneSelect = async () => {
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
    handleIPhoneSelect
  };
}
