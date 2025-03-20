
import { ScrollArea } from "@/components/ui/scroll-area";

export function WhatsAppAuthorizationContent() {
  return (
    <ScrollArea className="h-full">
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Authorization settings will be available after connecting your WhatsApp account.
        </p>
      </div>
    </ScrollArea>
  );
}
