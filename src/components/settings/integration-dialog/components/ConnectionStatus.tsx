
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import type { ConnectionState } from "../hooks/whatsapp/types";
import type { Integration } from "../../types";

interface ConnectionStatusProps {
  connectionState: ConnectionState;
  selectedIntegration: Integration | null;
  onConnect: () => void;
  onOpenChange: (open: boolean) => void;
}

export function ConnectionStatus({
  connectionState,
  selectedIntegration,
  onConnect,
  onOpenChange,
}: ConnectionStatusProps) {
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
              <Button className="w-full" size="lg" onClick={onConnect}>
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
}
