
declare global {
  interface Window {
    fbAsyncInit: () => void;
  }
  const FB: {
    init: (options: { appId: string; cookie: boolean; xfbml: boolean; version: string }) => void;
    login: (callback: (response: { authResponse?: { accessToken: string } }) => void) => void;
    api: (path: string, callback: (response: { name: string }) => void) => void;
    getAuthResponse: () => { accessToken: string };
  };
}

import { Dialog, DialogContent } from "@/components/ui/dialog";
import React, { useState } from "react";
import type { Integration, PlanDetails } from "../types"; // Import PlanDetails
import { useFacebookSDK } from "./hooks/useFacebookSDK";
// import { QRCodeScreen } from "./components/QRCodeScreen"; // File does not exist
import { DeviceSelect } from "./components/DeviceSelect";
import { IntegrationTabs } from "./components/IntegrationTabs";
import { DialogMain } from "./components/DialogMain";
// import { useIntegrationConnectionState } from "./hooks/useIntegrationConnectionState"; // Remove hook import
import { Button } from "@/components/ui/button";
import { WebhookSetupForm } from "./components/WebhookSetupForm";
// import { EvolutionInstance, ConnectionState } from "@/integrations/evolution-api/types"; // Remove type imports if not needed here

// Assuming PlanDetails might be needed by the dialog or its children for validation/display
interface IntegrationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedIntegration: Integration | null;
  currentPlan?: PlanDetails | null;
  profileId?: string | null; // Changed tenantId to profileId
}

export function IntegrationDialog({
  open,
  onOpenChange,
  selectedIntegration,
  currentPlan,
  profileId, // Changed tenantId to profileId
}: IntegrationDialogProps) {
  const { handleConnectWithFacebook } = useFacebookSDK();

  // Remove the hook call and related state destructuring
  // const { ... } = useIntegrationConnectionState(selectedIntegration, open);

  // Simplified dialog change handler
  const handleDialogChange = (isOpen: boolean) => {
    onOpenChange(isOpen);
  };

  // Remove conditional rendering based on hook state (showDeviceSelect, showWebhookSetup)
  // This logic needs to move to IntegrationTabs

  return (
    <Dialog open={open} onOpenChange={handleDialogChange}>
      <DialogContent className="max-w-6xl w-[90%] max-h-[85vh] flex space-x-4 overflow-hidden">
        {/* Left Column - Now only needs selectedIntegration */}
        <DialogMain
          selectedIntegration={selectedIntegration}
          // Remove all other props passed previously
        />

        {/* Right Column - Will now contain the core logic */}
        <div className="w-1/2">
          <IntegrationTabs
            selectedIntegration={selectedIntegration}
            handleConnectWithFacebook={handleConnectWithFacebook} // Keep if needed for FB
            onClose={() => handleDialogChange(false)} // Keep close handler
            // Remove props that are now managed internally by IntegrationTabs
            // onConnect={handleConnect}
            // liveConnectionState={connectionState as ConnectionState}
            open={open} // Pass open state if needed by the hook inside IntegrationTabs
            onOpenChange={onOpenChange} // Pass onOpenChange if needed by the hook inside IntegrationTabs
            currentPlan={currentPlan} // Pass currentPlan to IntegrationTabs
            profileId={profileId} // Pass profileId to IntegrationTabs instead of tenantId
          />
        </div>

        <button
          onClick={() => handleDialogChange(false)}
          className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground"
        >
          <span className="sr-only">Close</span>
        </button>
      </DialogContent>
    </Dialog>
  );
}
