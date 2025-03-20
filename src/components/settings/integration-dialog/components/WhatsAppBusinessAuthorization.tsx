
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

export function WhatsAppBusinessAuthorization() {
  return (
    <ScrollArea className="h-full">
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Authorization settings for your WhatsApp connection.
        </p>
        
        <div className="space-y-4 mt-6">
          <h3 className="text-lg font-semibold">API Credentials</h3>
          <div className="bg-gray-100 p-4 rounded-md">
            <p className="font-mono text-sm break-all">7ed9a88f-92a1-4dbc-9bb0-5cbb48ec3f0a</p>
          </div>
          <Button variant="outline" size="sm">
            Regenerate API Key
          </Button>
        </div>
        
        <div className="space-y-4 mt-8">
          <h3 className="text-lg font-semibold">Webhook Configuration</h3>
          <div className="bg-gray-100 p-4 rounded-md">
            <p className="font-mono text-sm break-all">https://api.example.com/whatsapp/webhook</p>
          </div>
        </div>
      </div>
    </ScrollArea>
  );
}
