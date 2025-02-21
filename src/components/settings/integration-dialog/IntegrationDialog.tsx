
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Integration } from "../types";

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
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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
              <Button className="w-full" size="lg">
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
        <DialogClose />
      </DialogContent>
    </Dialog>
  );
}
