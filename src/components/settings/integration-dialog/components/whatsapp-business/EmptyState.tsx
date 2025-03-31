
import { PhoneCall } from "lucide-react";
import { Button } from "@/components/ui/button";

export function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center h-64 space-y-4 p-4 text-center">
      <PhoneCall className="h-10 w-10 text-muted-foreground" />
      <p className="text-lg font-medium">WhatsApp Instance Not Found</p>
      <p className="text-muted-foreground text-center max-w-md">
        The WhatsApp instance details could not be loaded. It might need to be configured first.
      </p>
      <Button onClick={() => window.location.reload()} variant="outline">Refresh</Button>
    </div>
  );
}
