
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Clock } from "lucide-react";
import { useState } from "react";
import type { Integration } from "../../types";

interface WhatsAppCloudApiDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedIntegration: Integration | null;
}

export function WhatsAppCloudApiDialog({
  open,
  onOpenChange,
  selectedIntegration,
}: WhatsAppCloudApiDialogProps) {
  const [activeTab, setActiveTab] = useState<"settings" | "authorization">("settings");
  
  // Function to handle Facebook SDK integration
  const handleConnectWithFacebook = () => {
    // In a real implementation, this would initialize the Facebook SDK and trigger the login flow
    // For this demo, we'll just log the action
    console.log("Connecting with Facebook SDK...");
    window.open("https://business.facebook.com/wa/manage/", "_blank");
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <div className="flex flex-col">
          <div className="flex items-center mb-6">
            <Button 
              variant="ghost" 
              size="sm" 
              className="p-0 mr-2"
              onClick={() => onOpenChange(false)}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h2 className="text-xl font-semibold">Back</h2>
          </div>

          <Tabs 
            defaultValue="settings" 
            value={activeTab}
            onValueChange={(value) => setActiveTab(value as "settings" | "authorization")}
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="settings" className="text-center">Settings</TabsTrigger>
              <TabsTrigger value="authorization" className="text-center">Authorization</TabsTrigger>
            </TabsList>

            <TabsContent value="settings" className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold mb-4">Connect a new number</h2>
                
                <div className="flex items-center text-amber-700 bg-amber-50 p-3 rounded-md mb-6">
                  <Clock className="h-5 w-5 mr-2 flex-shrink-0" />
                  <p>The connection takes about 10 minutes.</p>
                </div>
                
                <p className="mb-6">
                  The next step will take you to Facebook, where you will connect your number.
                </p>
                
                <div className="space-y-4 mb-6">
                  <h3 className="font-semibold">Important</h3>
                  <p>
                    Before you start, make sure your phone number is not associated with any other WhatsApp account. 
                    If it is, go back to the previous step.
                  </p>
                </div>
                
                <div className="space-y-4 mb-6">
                  <h3 className="font-semibold">During connection, you will:</h3>
                  <ul className="list-disc list-inside space-y-2 pl-4">
                    <li>Log in to your personal Facebook account.</li>
                    <li>Select or create a Facebook Business account.</li>
                    <li>Select or create a WhatsApp Business account to connect your number.</li>
                  </ul>
                </div>
                
                <Button 
                  className="w-full sm:w-auto flex items-center justify-center gap-2 bg-[#1877F2] hover:bg-[#0e69de]"
                  onClick={handleConnectWithFacebook}
                >
                  <svg viewBox="0 0 36 36" className="h-5 w-5 fill-current" xmlns="http://www.w3.org/2000/svg">
                    <path d="M34 16h-6v-5.2c0-.8.7-1.8 1.5-1.8h4.5V2h-6.2c-5.3 0-8.8 4-8.8 9v5h-5v7h5v16h7V23h4.8l1.2-7z"></path>
                  </svg>
                  Continue with Facebook
                </Button>
                
                <div className="bg-blue-50 p-4 rounded-md mt-8 text-center">
                  <p className="text-gray-700">
                    Need help connecting?{" "}
                    <a href="#" className="text-blue-500 hover:underline">Book a free WhatsApp demo</a>{" "}
                    or read{" "}
                    <a href="#" className="text-blue-500 hover:underline">the article</a>.
                  </p>
                </div>
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
        </div>
      </DialogContent>
    </Dialog>
  );
}
