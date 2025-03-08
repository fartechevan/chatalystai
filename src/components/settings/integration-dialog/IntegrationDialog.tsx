
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useEffect, useState } from "react";
import type { Integration } from "../types";
import { useWhatsAppConnection, ConnectionState } from "./hooks/useWhatsAppConnection";
import { QRCodeScreen } from "./components/QRCodeScreen";
import { DeviceSelect } from "./components/DeviceSelect";
import { Loader2, CheckCircle, AlertTriangle } from "lucide-react";

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
    isLoading 
  } = useWhatsAppConnection(selectedIntegration);

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

  const renderConnectionStatus = () => {
    switch (connectionState) {
      case 'open':
        return (
          <div className="flex flex-col items-center justify-center p-8 space-y-4">
            <CheckCircle className="h-16 w-16 text-green-500" />
            <h3 className="text-lg font-semibold">Connected to WhatsApp</h3>
            <p className="text-sm text-muted-foreground text-center">
              Your WhatsApp number is successfully connected and ready to use.
            </p>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </div>
        );
      
      case 'connecting':
        return (
          <div className="flex flex-col items-center justify-center p-8 space-y-4">
            <Loader2 className="h-16 w-16 text-blue-500 animate-spin" />
            <h3 className="text-lg font-semibold">Connecting to WhatsApp</h3>
            <p className="text-sm text-muted-foreground text-center">
              We're currently establishing the connection to your WhatsApp account. 
              This process may take a moment.
            </p>
          </div>
        );
      
      default:
        return (
          <Tabs defaultValue="settings" className="w-full">
            <TabsList className="w-full">
              <TabsTrigger value="settings" className="flex-1">Settings</TabsTrigger>
              <TabsTrigger value="authorization" className="flex-1">Authorization</TabsTrigger>
            </TabsList>
            <TabsContent value="settings" className="space-y-4">
              <div className="space-y-4">
                {selectedIntegration && (
                  <div className="aspect-video rounded-md bg-gradient-to-br from-green-50 to-green-100 mb-4 flex items-center justify-center p-8">
                    <img
                      src={selectedIntegration.icon_url}
                      alt={selectedIntegration.name}
                      className="object-contain max-h-32"
                    />
                  </div>
                )}
                <h3 className="text-lg font-semibold">Connect WhatsApp</h3>
                <p className="text-sm text-muted-foreground">
                  Connect multiple WhatsApp numbers to send important conversations straight to your inbox.
                </p>
                <Button className="w-full" size="lg" onClick={handleConnect}>
                  Connect
                </Button>
              </div>
            </TabsContent>
            <TabsContent value="authorization">
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Authorization settings will be available after connecting your WhatsApp account.
                </p>
              </div>
            </TabsContent>
          </Tabs>
        );
    }
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
          renderConnectionStatus()
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
