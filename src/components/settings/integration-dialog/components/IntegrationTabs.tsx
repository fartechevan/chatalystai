
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useState } from "react";
import type { Integration } from "../../types";
import { WhatsAppCloudApiContent } from "./WhatsAppCloudApiContent";
import { WhatsAppAuthorizationContent } from "./WhatsAppAuthorizationContent";
import { WhatsAppBusinessSettings } from "./WhatsAppBusinessSettings";
import { WhatsAppBusinessAuthorization } from "./WhatsAppBusinessAuthorization";
import { ScrollArea } from "@/components/ui/scroll-area";

interface IntegrationTabsProps {
  selectedIntegration: Integration | null;
  handleConnectWithFacebook: () => void;
  onClose: () => void;
  onConnect?: () => void;
}

export function IntegrationTabs({ 
  selectedIntegration, 
  handleConnectWithFacebook,
  onClose,
  onConnect
}: IntegrationTabsProps) {
  const [activeTab, setActiveTab] = useState<"settings" | "authorization">("settings");

  return (
    <Tabs defaultValue="settings" className="w-full">
      <TabsList className="w-full">
        <TabsTrigger value="settings" className="flex-1">Settings</TabsTrigger>
        <TabsTrigger value="authorization" className="flex-1">Authorization</TabsTrigger>
      </TabsList>
      
      {/* Render the content based on selected integration */}
      {selectedIntegration?.name === "WhatsApp Cloud API" ? (
        <>
          <TabsContent value="settings" className="space-y-6">
            <ScrollArea className="h-96">
              <WhatsAppCloudApiContent handleConnectWithFacebook={handleConnectWithFacebook} />
            </ScrollArea>
          </TabsContent>
          
          <TabsContent value="authorization">
            <ScrollArea className="h-96">
              <WhatsAppAuthorizationContent />
            </ScrollArea>
          </TabsContent>
        </>
      ) : (
        <>
          <TabsContent value="settings" className="space-y-6">
            <ScrollArea className="h-96">
              <WhatsAppBusinessSettings 
                selectedIntegration={selectedIntegration}
                onConnect={onConnect || (() => {})}
              />
            </ScrollArea>
          </TabsContent>
          
          <TabsContent value="authorization" className="space-y-6">
            <ScrollArea className="h-96">
              <WhatsAppBusinessAuthorization selectedIntegration={selectedIntegration} />
            </ScrollArea>
          </TabsContent>
        </>
      )}
      
      <div className="mt-6 flex justify-end">
        <Button variant="outline" onClick={onClose}>
          Close
        </Button>
      </div>
    </Tabs>
  );
}
