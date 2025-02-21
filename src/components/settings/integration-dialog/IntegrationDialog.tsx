import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState } from "react";
import type { Integration } from "../types";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

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
  const { toast } = useToast();

  const { data: config } = useQuery({
    queryKey: ['integration-config', selectedIntegration?.id],
    queryFn: async () => {
      if (!selectedIntegration?.id) return null;
      const { data, error } = await supabase
        .from('integrations_config')
        .select('*')
        .eq('integration_id', selectedIntegration.id)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!selectedIntegration?.id,
  });

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
    if (!config) {
      toast({
        title: "Configuration Error",
        description: "Integration configuration not found",
        variant: "destructive",
      });
      return;
    }

    try {
      const response = await fetch(`${config.base_url}/instance/connect/${config.instance_id}`, {
        headers: {
          'apikey': config.api_key,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to connect to WhatsApp');
      }

      const data = await response.json();
      console.log('WhatsApp connection response:', data);
      
      setShowDeviceSelect(false);
      setIntegrationQRPopup(true);
    } catch (error) {
      toast({
        title: "Connection Error",
        description: "Failed to initialize WhatsApp connection",
        variant: "destructive",
      });
      console.error('WhatsApp connection error:', error);
    }
  };

  if (integrationQRPopup) {
    return (
      <Dialog open={open} onOpenChange={handleDialogChange}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Scan QR Code</DialogTitle>
            <DialogDescription>
              Open WhatsApp on your iPhone and scan the QR code to connect
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-8">
              <div className="flex items-center justify-center">
                <video 
                  src="https://global-core-public-static-files.s3.amazonaws.com/onboarding-com/en/ios-scan-en.mp4"
                  autoPlay 
                  loop 
                  muted 
                  playsInline
                  className="w-full h-auto rounded-lg"
                />
              </div>
              <div className="flex items-center justify-center">
                <div className="aspect-square w-full max-w-[240px] bg-white p-4 rounded-xl">
                  <img
                    src="https://vezdxxqzzcjkunoaxcxc.supabase.co/storage/v1/object/sign/fartech/wa-qr-code.png?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1cmwiOiJmYXJ0ZWNoL3dhLXFyLWNvZGUucG5nIiwiaWF0IjoxNzQwMTQyMjUzLCJleHAiOjIwNTU1MDIyNTN9.IzZbXVzJpb9WnwMjCr5VkI4KfG-r_4PpNEBMyOKr3t4"
                    alt="WhatsApp QR Code"
                    className="w-full h-full"
                  />
                </div>
              </div>
            </div>
            <div className="text-center space-y-2">
              <p className="text-sm font-medium">✋ Read before scanning</p>
              <p className="text-sm text-muted-foreground">
                To find WhatsApp's QR scanner, tap Settings ⚙️ {'>'}
                <br />
                Linked Devices {'>'} Link a Device.
              </p>
              <p className="text-sm text-muted-foreground">
                <a href="#" className="text-blue-600 hover:underline">Trouble connecting?</a>
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              setIntegrationQRPopup(false);
              setIntegrationMainPopup(true);
            }}
            className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground"
          >
            <span className="sr-only">Close</span>
            ✕
          </button>
        </DialogContent>
      </Dialog>
    );
  }

  if (showDeviceSelect) {
    return (
      <Dialog open={open} onOpenChange={handleDialogChange}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>All conversations. One inbox.</DialogTitle>
            <DialogDescription>
              Ready to get all your sales tools in a single inbox?
              Let's start by connecting WhatsApp.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6">
            <div className="flex justify-center">
              <img
                src="https://vezdxxqzzcjkunoaxcxc.supabase.co/storage/v1/object/sign/fartech/wa-lite-select-device@x2.png?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1cmwiOiJmYXJ0ZWNoL3dhLWxpdGUtc2VsZWN0LWRldmljZUB4Mi5wbmciLCJpYXQiOjE3NDAxNDIyNTMsImV4cCI6MjA1NTUwMjI1M30.IzZbXVzJpb9WnwMjCr5VkI4KfG-r_4PpNEBMyOKr3t4"
                alt="WhatsApp Connection"
                className="max-w-full h-auto mb-8"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Button 
                variant="outline" 
                size="lg"
                className="w-full py-8 text-lg"
              >
                Android
              </Button>
              <Button 
                variant="outline" 
                size="lg"
                className="w-full py-8 text-lg"
                onClick={handleIPhoneSelect}
              >
                iPhone
              </Button>
            </div>
          </div>
          <button
            onClick={() => {
              setShowDeviceSelect(false);
              setIntegrationMainPopup(true);
            }}
            className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground"
          >
            <span className="sr-only">Close</span>
            
          </button>
        </DialogContent>
      </Dialog>
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
