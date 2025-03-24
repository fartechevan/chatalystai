
import { Integration } from "../../types";
import { DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";
import { ConnectionStatus } from "./ConnectionStatus";

interface DialogMainProps {
  selectedIntegration: Integration | null;
  connectionState: string;
  isLoading: boolean;
  onConnect: () => void;
  onOpenChange: (open: boolean) => void;
}

export function DialogMain({
  selectedIntegration,
  connectionState,
  isLoading,
  onConnect,
  onOpenChange
}: DialogMainProps) {
  return (
    <div className="w-1/2">
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
          onConnect={onConnect}
          onOpenChange={onOpenChange}
        />
      )}
    </div>
  );
}
