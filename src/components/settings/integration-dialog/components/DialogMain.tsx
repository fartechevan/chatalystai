import { Integration } from "../../types";
import { DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";
import { ConnectionStatus } from "./ConnectionStatus";
import { ConnectionState } from "@/integrations/evolution-api/types"; // Corrected import path

interface DialogMainProps {
  selectedIntegration: Integration | null;
  connectionState: ConnectionState;
  isLoading: boolean;
  // onConnect: () => void; // Removed prop
  onOpenChange: (open: boolean) => void;
}

export function DialogMain({
  selectedIntegration,
  connectionState,
  isLoading,
  // onConnect, // Removed prop
   onOpenChange
 }: DialogMainProps) {
   // Log the connectionState being received by DialogMain
   // console.log(`[DialogMain] Rendering with connectionState: ${connectionState}, isLoading: ${isLoading}`); // Removed log
 
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
          // onConnect={onConnect} // Prop removed, ConnectionStatus doesn't need it if button is moved
          onOpenChange={onOpenChange}
        />
      )}
    </div>
  );
}
