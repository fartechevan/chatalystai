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

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import type { Integration } from "../types";
import { useWhatsAppConnection } from "./hooks/whatsapp/useWhatsAppConnection";
import { QRCodeScreen } from "./components/QRCodeScreen";
import { DeviceSelect } from "./components/DeviceSelect";
import { ConnectionStatus } from "./components/ConnectionStatus";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { CheckCircle, Plus, AlertCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Clock } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface IntegrationDialogProps {
  open: boolean;
  onOpenChange: (connected: boolean) => void;
  selectedIntegration: Integration | null;
}

export function IntegrationDialog({
  open,
  onOpenChange,
  selectedIntegration,
}: IntegrationDialogProps) {
  const [showDeviceSelect, setShowDeviceSelect] = useState(false);
  const [integrationMainPopup, setIntegrationMainPopup] = useState(true);
  const [integrationQRPopup, setIntegrationQRPopup] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [activeTab, setActiveTab] = useState<"settings" | "authorization">("settings");
  const [isFBInitialized, setIsFBInitialized] = useState(false);

  const { 
    initializeConnection, 
    qrCodeBase64, 
    connectionState, 
    isLoading,
    checkCurrentConnectionState 
  } = useWhatsAppConnection(selectedIntegration);

  useEffect(() => {
    // Load the Facebook SDK
    window.fbAsyncInit = function() {
      FB.init({
        appId      : 'your-app-id', // Replace with your Facebook app ID
        cookie     : true,
        xfbml      : true,
        version    : 'v12.0'
      });
      setIsFBInitialized(true);
    };

    (function(d, s, id){
      const fjs = d.getElementsByTagName(s)[0];
      if (d.getElementById(id)) {return;}
      const js = d.createElement(s) as HTMLScriptElement; js.id = id;
      js.src = "https://connect.facebook.net/en_US/sdk.js";
      fjs.parentNode.insertBefore(js, fjs);
    }(document, 'script', 'facebook-jssdk'));
  }, []);

  const handleConnectWithFacebook = () => {
    if (isFBInitialized) {
      FB.login(function(response) {
        if (response.authResponse) {
          console.log('Welcome! Fetching your information.... ');
          FB.api('/me', function(response) {
            console.log('Good to see you, ' + response.name + '.');
            // Here you can handle the access token and link it to the WhatsApp system user
            const accessToken = FB.getAuthResponse().accessToken;
            console.log('Access Token:', accessToken);
            // Link the access token to the WhatsApp system user
          });
        } else {
          console.log('User cancelled login or did not fully authorize.');
        }
      });
    } else {
      console.log('Facebook SDK not initialized yet.');
    }
  };

  // Check connection status when the dialog is opened
  useEffect(() => {
    if (open && selectedIntegration && selectedIntegration.name === "WhatsApp") {
      checkCurrentConnectionState();
    }
  }, [open, selectedIntegration, checkCurrentConnectionState]);

  useEffect(() => {
    if (connectionState === 'open' && integrationQRPopup) {
      // Close QR popup when connection is established
      setIntegrationQRPopup(false);
      setIntegrationMainPopup(true);
      setIsConnected(true);
      
      // Update the integration connection status in the database
      if (selectedIntegration) {
        updateIntegrationStatus(selectedIntegration.id);
      }
    }
  }, [connectionState, integrationQRPopup, selectedIntegration]);
  
  const updateIntegrationStatus = async (integrationId: string) => {
    try {
      // We don't have an is_connected field, so let's just ensure there's a record
      const { data: existingConfig, error: checkError } = await supabase
        .from('integrations_config')
        .select('id')
        .eq('integration_id', integrationId)
        .maybeSingle();
        
      if (checkError) {
        console.error('Error checking integration config:', checkError);
        return;
      }
      
      if (!existingConfig) {
        // Create a new config if one doesn't exist
        const { error: insertError } = await supabase
          .from('integrations_config')
          .insert({
            integration_id: integrationId,
            // Add default values for required fields
            base_url: 'https://api.evoapicloud.com'
          });
        
        if (insertError) {
          console.error('Error inserting integration config:', insertError);
        }
      }
    } catch (error) {
      console.error('Error updating integration status:', error);
    }
  };

  const handleConnect = () => {
    setShowDeviceSelect(true);
    setIntegrationMainPopup(false);
  };

  const handleDialogChange = (open: boolean) => {
    if (!open) {
      if (integrationQRPopup) {
        // If on QR screen, go back to main popup
        setIntegrationQRPopup(false);
        setIntegrationMainPopup(true);
        return;
      }
      if (showDeviceSelect) {
        // If on device select screen, go back to main popup
        setShowDeviceSelect(false);
        setIntegrationMainPopup(true);
        return;
      }
    }
    // Otherwise, close the dialog completely and notify parent about the connection status
    onOpenChange(isConnected || connectionState === 'open');
  };

  const handleIPhoneSelect = async () => {
    const success = await initializeConnection();
    if (success) {
      setShowDeviceSelect(false);
      setIntegrationQRPopup(true);
    }
  };

  if (integrationQRPopup) {
    return (
      <QRCodeScreen 
        open={open} 
        onOpenChange={handleDialogChange}
        onClose={() => {
          setIntegrationQRPopup(false);
          setIntegrationMainPopup(true);
        }}
        qrCodeBase64={qrCodeBase64}
      />
    );
  }

  if (showDeviceSelect) {
    return (
      <DeviceSelect 
        open={open}
        onOpenChange={handleDialogChange}
        onClose={() => {
          setShowDeviceSelect(false);
          setIntegrationMainPopup(true);
        }}
        onIPhoneSelect={handleIPhoneSelect}
      />
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleDialogChange}>
      <DialogContent className="max-w-5xl w-4/5 flex space-x-4">
        {/* Left Column */}
        <div className="w-1/2">
          <DialogHeader>
            <DialogTitle>Connect WhatsApp</DialogTitle>
            <DialogDescription>
              Connect multiple WhatsApp numbers to send important conversations straight to your inbox.
              Then nurture them with tools like templates and Salesbot!
            </DialogDescription>
          </DialogHeader>
          
          {isLoading ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <ConnectionStatus 
              connectionState={connectionState}
              selectedIntegration={selectedIntegration}
              onConnect={handleConnect}
              onOpenChange={handleDialogChange}
            />
          )}
        </div>

        {/* Right Column */}
        <div className="w-1/2">
          <Tabs defaultValue="settings" className="w-full">
            <TabsList className="w-full">
              <TabsTrigger value="settings" className="flex-1">Settings</TabsTrigger>
              <TabsTrigger value="authorization" className="flex-1">Authorization</TabsTrigger>
            </TabsList>
            {/* Render the content based on selected integration */}
            {selectedIntegration?.name === "WhatsApp Cloud API" ? (
              <>
                <TabsContent value="settings" className="space-y-6 h-96">
                  <ScrollArea className="h-full">
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
                  </ScrollArea>
                </TabsContent>
                
                <TabsContent value="authorization">
                  <ScrollArea className="h-full">
                    <div className="space-y-4">
                      <p className="text-sm text-muted-foreground">
                        Authorization settings will be available after connecting your WhatsApp account.
                      </p>
                    </div>
                  </ScrollArea>
                </TabsContent>
              </>
            ) : (
              <>
                <TabsContent value="settings" className="space-y-6 h-96">
                  <ScrollArea className="h-full">
                    <div className="space-y-4">
                      <div className="space-y-4 mt-6">
                        <h3 className="text-lg font-semibold">Backup number</h3>
                        <p className="text-gray-500">
                          This WhatsApp account will be used in case your other numbers get disconnected.
                        </p>
                        <div className="bg-gray-100 p-4 rounded-md">
                          <p className="text-gray-600">+60 17-516 8607</p>
                        </div>
                      </div>
                      
                      <div className="mt-8">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Name</TableHead>
                              <TableHead>Number</TableHead>
                              <TableHead>Pipeline</TableHead>
                              <TableHead>Status</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            <TableRow>
                              <TableCell className="font-medium">+60 17-516 8607</TableCell>
                              <TableCell>+60 17-516 8607</TableCell>
                              <TableCell>
                                <select className="border rounded-md px-2 py-1">
                                  <option>Pipeline</option>
                                  <option>Prospects</option>
                                  <option>Customers</option>
                                  <option>Leads</option>
                                </select>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center justify-between">
                                  <CheckCircle className="h-5 w-5 text-green-500" />
                                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                                    <X className="h-4 w-4 text-gray-400" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          </TableBody>
                        </Table>
                        
                        <Button className="mt-4" variant="outline">
                          <Plus className="h-4 w-4 mr-2" />
                          Add number
                        </Button>
                      </div>
                      
                      <div className="mt-8 p-4 bg-amber-50 rounded-lg border border-amber-100">
                        <div className="flex items-start space-x-3">
                          <AlertCircle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="text-sm text-amber-800">
                              Don't forget to use your phone at least <strong>once every 14 days</strong> to stay connected.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </ScrollArea>
                </TabsContent>
                
                <TabsContent value="authorization" className="space-y-6 h-96">
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
                </TabsContent>
              </>
            )}
            
            <div className="mt-6 flex justify-end">
              <Button variant="outline" onClick={() => handleDialogChange(false)}>
                Close
              </Button>
            </div>
          </Tabs>
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
