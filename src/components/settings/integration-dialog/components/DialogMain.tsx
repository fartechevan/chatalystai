import { Integration } from "../../types";
import { DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";
// Remove unused imports if ConnectionStatus is no longer rendered here
// import { ConnectionStatus } from "./ConnectionStatus";
// import { ConnectionState, EvolutionInstance } from "@/integrations/evolution-api/types";

interface DialogMainProps {
  selectedIntegration: Integration | null;
  // Remove all other props
}

export function DialogMain({
  selectedIntegration,
}: DialogMainProps) {
  // Keep only the static rendering logic for the left column
  return (
    <div className="w-1/2">
      <DialogHeader>
        {/* Dynamically set title based on integration? */}
        <DialogTitle>Connect {selectedIntegration?.name || 'Integration'}</DialogTitle>
        <DialogDescription>
          {/* Static description or potentially dynamic based on integration */}
          Connect multiple WhatsApp numbers to send important conversations straight to your inbox. Then nurture them with tools like templates and Salesbot!
        </DialogDescription>
      </DialogHeader>

      {/* Remove conditional rendering based on connectionState/isLoading */}
      {/* Display static content or integration icon */}
      {selectedIntegration && (
         <div className="aspect-video rounded-md bg-gradient-to-br from-green-50 to-green-100 mt-4 flex items-center justify-center p-8">
           <img
             src={selectedIntegration.icon_url || selectedIntegration.icon}
             alt={selectedIntegration.name}
             className="object-contain max-h-32"
           />
         </div>
       )}
       {/* Add any other static content for the left column here */}
    </div>
  );
}
