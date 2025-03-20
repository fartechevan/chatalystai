
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useState } from "react";
import type { Integration } from "../../types";
import { WhatsAppCloudApiContent } from "./WhatsAppCloudApiContent";
import { WhatsAppAuthorizationContent } from "./WhatsAppAuthorizationContent";
import { WhatsAppBusinessSettings } from "./WhatsAppBusinessSettings";
import { WhatsAppBusinessAuthorization } from "./WhatsAppBusinessAuthorization";

interface IntegrationTabsProps {
  selectedIntegration: Integration | null;
  handleConnectWithFacebook: () => void;
  onClose: () => void;
}

export function IntegrationTabs({ 
  selectedIntegration, 
  handleConnectWithFacebook,
  onClose
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
          <TabsContent value="settings" className="space-y-6 h-96">
            <WhatsAppCloudApiContent handleConnectWithFacebook={handleConnectWithFacebook} />
          </TabsContent>
          
          <TabsContent value="authorization">
            <WhatsAppAuthorizationContent />
          </TabsContent>
        </>
      ) : (
        <>
          <TabsContent value="settings" className="space-y-6 h-96">
            <WhatsAppBusinessSettings />
          </TabsContent>
          
          <TabsContent value="authorization" className="space-y-6 h-96">
            <WhatsAppBusinessAuthorization />
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
