
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import type { Integration } from "../types";
import { useWhatsAppConnection } from "./hooks/whatsapp/useWhatsAppConnection";
import { QRCodeScreen } from "./components/QRCodeScreen";
import { DeviceSelect } from "./components/DeviceSelect";
import { ConnectionStatus } from "./components/ConnectionStatus";
import { WhatsAppCloudApiDialog } from "./components/WhatsAppCloudApiDialog";

interface IntegrationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedIntegration: Integration | null;
}

export function IntegrationDialog({
  open,
  onOpenChange,
  selectedIntegration,
}: IntegrationDialogProps) {
  const [showDeviceSelect, setShowDeviceSelect] = useState(false);
  const [integrationMainPopup, setIntegrationMainPopup] = useState(true);
  const [integrationQRPopup, setIntegrationQRPopup] = useState(false);

  const { 
    initializeConnection, 
    qrCodeBase64, 
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
    }
  }, [connectionState, integrationQRPopup]);

  const handleConnect = () => {
    setShowDeviceSelect(true);
    setIntegrationMainPopup(false);
  };

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
    // Otherwise, close the dialog completely
    onOpenChange(open);
  };

  const handleIPhoneSelect = async () => {
    const success = await initializeConnection();
    if (success) {
      setShowDeviceSelect(false);
      setIntegrationQRPopup(true);
    }
  };

  // Check if the selected integration is WhatsApp Cloud API
  if (selectedIntegration?.name === "WhatsApp Cloud API") {
    return (
      <WhatsAppCloudApiDialog
        open={open}
        onOpenChange={onOpenChange}
        selectedIntegration={selectedIntegration}
      />
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
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Connect WhatsApp</DialogTitle>
          <DialogDescription>
            Connect multiple WhatsApp numbers to send important conversations straight to your inbox.
            Then nurture them with tools like templates and Salesbot!
          </DialogDescription>
        </DialogHeader>
        
        {isLoading ? (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <ConnectionStatus 
            connectionState={connectionState}
            selectedIntegration={selectedIntegration}
            onConnect={handleConnect}
            onOpenChange={onOpenChange}
          />
        )}
        
        <button
          onClick={() => onOpenChange(false)}
          className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground"
        >
          <span className="sr-only">Close</span>
        </button>
      </DialogContent>
    </Dialog>
  );
}
