
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle, Plus, AlertCircle, X } from "lucide-react";
import type { ConnectionState } from "../hooks/useWhatsAppConversations/types";
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
  if (connectionState === 'connecting') {
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
  }

  if (connectionState === 'open') {
    return (
      <div className="flex items-start space-x-4">
        <div className="w-32 h-32 bg-green-50 rounded-lg flex items-center justify-center p-4">
          <img
            src={selectedIntegration?.icon_url || selectedIntegration?.icon}
            alt={selectedIntegration?.name}
            className="object-contain max-h-20"
          />
        </div>
        <div className="flex-1">
          <h2 className="text-xl font-bold">WhatsApp Lite version</h2>
          <div className="mt-2 flex items-center space-x-4">
            <span className="inline-flex items-center px-4 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
              Installed
            </span>
            <Button variant="outline" size="sm">
              Uninstall
            </Button>
          </div>
        </div>
      </div>
    );
  }
  
  // Default: Not connected state
  return (
    <div className="space-y-4">
      {selectedIntegration && (
        <div className="aspect-video rounded-md bg-gradient-to-br from-green-50 to-green-100 mb-4 flex items-center justify-center p-8">
          <img
            src={selectedIntegration.icon_url || selectedIntegration.icon}
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
        Create New Instance
      </Button>
    </div>
  );
}
