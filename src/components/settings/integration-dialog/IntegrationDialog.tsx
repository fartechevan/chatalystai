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
        // If on QR screen, go back to main popup
        setIntegrationQRPopup(false);
        setIntegrationMainPopup(true);
        return;
      }
      if (showDeviceSelect) {
        // If on device select screen, go back to main popup
        setShowDeviceSelect(false);
        setIntegrationMainPopup(true);
        return;
      }
    }
    // Otherwise, close the dialog completely and notify parent about the connection status
    onOpenChange(isConnected || connectionState === 'open');
  };

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
        {/* Left Column */}
        <DialogMain 
          selectedIntegration={selectedIntegration}
          connectionState={connectionState}
          isLoading={isLoading}
          onConnect={handleConnect}
          onOpenChange={handleDialogChange}
        />

        {/* Right Column */}
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
