
import { Info } from "lucide-react";
import { Button } from "@/components/ui/button";

export function EmptyLeadState() {
  return (
    <div className="flex flex-col items-center justify-center p-8 h-full space-y-4 text-center">
      <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
        <Info className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="font-medium text-lg">No lead details</h3>
      <p className="text-muted-foreground text-sm max-w-[220px]">
        This conversation is not connected to any lead yet.
      </p>
      <Button variant="default" size="sm">
        Create new lead
      </Button>
    </div>
  );
}
