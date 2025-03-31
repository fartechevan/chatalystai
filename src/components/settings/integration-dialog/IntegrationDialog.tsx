declare global {
  interface Window {
    fbAsyncInit: () => void;
  }
  const FB: {
    init: (options: { appId: string; cookie: boolean; xfbml: boolean; version: string }) => void;
    login: (callback: (response: { authResponse?: { accessToken: string } }) => void) => void;
    api: (path: string, callback: (response: { name: string }) => void) => void;
    getAuthResponse: () => { accessToken: string };
  };
}

import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { useState } from "react";
import type { Integration } from "../types";
import { useFacebookSDK } from "./hooks/useFacebookSDK";
import { QRCodeScreen } from "./components/QRCodeScreen";
import { DeviceSelect } from "./components/DeviceSelect";
import { IntegrationTabs } from "./components/IntegrationTabs";
import { DialogMain } from "./components/DialogMain";
import { useIntegrationConnectionState } from "./hooks/useIntegrationConnectionState";
import { AlertCircle, Button } from "@/components/ui";
import { supabase } from "@/lib/supabase";

interface IntegrationDialogProps {
  open: boolean;
  onOpenChange: (connected: boolean) => void;
  selectedIntegration: Integration | null;
}

export function IntegrationDialog({
  open,
  onOpenChange,
  selectedIntegration,
}: IntegrationDialogProps) {
  const { handleConnectWithFacebook } = useFacebookSDK();
  const [vaultError, setVaultError] = useState<string | null>(null);

  useEffect(() => {
    if (open && selectedIntegration?.name === "WhatsApp Cloud API") {
      const checkVaultAccess = async () => {
        try {
          const { data, error } = await supabase.vault.list();
          if (error) {
            console.error("Vault access error:", error);
            setVaultError("Could not access Supabase Vault. Please ensure you have proper permissions.");
          } else {
            setVaultError(null);
          }
        } catch (e) {
          console.error("Vault connection error:", e);
          setVaultError("Error connecting to Supabase Vault");
        }
      };
      
      checkVaultAccess();
    }
  }, [open, selectedIntegration]);

  const {
    showDeviceSelect,
    setShowDeviceSelect,
    integrationMainPopup,
    setIntegrationMainPopup,
    integrationQRPopup,
    setIntegrationQRPopup,
    isConnected,
    qrCodeBase64,
    pairingCode,
    connectionState,
    isLoading,
    handleConnect,
    handleIPhoneSelect
  } = useIntegrationConnectionState(selectedIntegration, open);

  const handleDialogChange = (open: boolean) => {
    if (!open) {
      if (integrationQRPopup) {
        setIntegrationQRPopup(false);
        setIntegrationMainPopup(true);
        return;
      }
      if (showDeviceSelect) {
        setShowDeviceSelect(false);
        setIntegrationMainPopup(true);
        return;
      }
    }
    onOpenChange(isConnected || connectionState === 'open');
  };

  if (vaultError) {
    return (
      <Dialog open={open} onOpenChange={handleDialogChange}>
        <DialogContent className="max-w-md">
          <div className="p-6 text-center">
            <AlertCircle className="mx-auto h-12 w-12 text-red-500 mb-4" />
            <h3 className="text-lg font-semibold mb-2">Vault Access Error</h3>
            <p className="text-sm text-gray-600 mb-4">{vaultError}</p>
            <p className="text-sm text-gray-600 mb-4">
              Please ensure the EVOLUTION_API_KEY secret is properly set in your Supabase Vault.
            </p>
            <Button 
              variant="outline" 
              onClick={() => onOpenChange(false)}
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (integrationQRPopup) {
    return (
      <QRCodeScreen 
        open={open} 
        onOpenChange={handleDialogChange}
        onClose={() => {
          setIntegrationQRPopup(false);
          setIntegrationMainPopup(true);
        }}
        qrCodeBase64={qrCodeBase64}
        pairingCode={pairingCode}
      />
    );
  }

  if (showDeviceSelect) {
    return (
      <DeviceSelect 
        open={open}
        onOpenChange={handleDialogChange}
        onClose={() => {
          setShowDeviceSelect(false);
          setIntegrationMainPopup(true);
        }}
        onIPhoneSelect={handleIPhoneSelect}
      />
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleDialogChange}>
      <DialogContent className="max-w-5xl w-4/5 flex space-x-4">
        <DialogMain 
          selectedIntegration={selectedIntegration}
          connectionState={connectionState}
          isLoading={isLoading}
          onConnect={handleConnect}
          onOpenChange={handleDialogChange}
        />

        <div className="w-1/2">
          <IntegrationTabs
            selectedIntegration={selectedIntegration}
            handleConnectWithFacebook={handleConnectWithFacebook}
            onClose={() => handleDialogChange(false)}
            onConnect={handleConnect}
          />
        </div>
        
        <button
          onClick={() => handleDialogChange(false)}
          className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground"
        >
          <span className="sr-only">Close</span>
        </button>
      </DialogContent>
    </Dialog>
  );
}
