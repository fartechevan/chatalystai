import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, Plus, CheckCircle, X, AlertCircle, ArrowLeft, Clock } from "lucide-react";
import { useEffect, useState } from "react";
import type { Integration } from "../types";
import { useWhatsAppConnection } from "./hooks/whatsapp/useWhatsAppConnection";
import { QRCodeScreen } from "./components/QRCodeScreen";
import { DeviceSelect } from "./components/DeviceSelect";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";

interface IntegrationDialogProps {
  open: boolean;
  onOpenChange: (connected: boolean) => void;
  selectedIntegration: Integration | null;
}

function PipelineDropdown() {
    const [pipelines, setPipelines] = useState<Array<{ id: string; name: string }>>([]);
    const [selectedPipelineId, setSelectedPipelineId] = useState<string | null>(null);

    useEffect(() => {
        const loadPipelines = async () => {
            const { data, error } = await supabase
                .from('pipelines')
                .select('id, name')
                .order('created_at');

            if (error) {
                console.error('Error loading pipelines:', error);
                return;
            }

            setPipelines(data || []);
            if (data && data.length > 0) {
                setSelectedPipelineId(data[0].id);
            }
        };

        loadPipelines();
    }, []);

    return (
        <select
            className="border rounded-md px-2 py-1"
            value={selectedPipelineId || ""}
            onChange={(e) => setSelectedPipelineId(e.target.value)}
        >
            {pipelines.map((pipeline) => (
                <option key={pipeline.id} value={pipeline.id}>
                    {pipeline.name}
                </option>
            ))}
        </select>
    );
}

export function IntegrationDialog({
    open,
    onOpenChange,
    selectedIntegration,
}: IntegrationDialogProps) {

    // State for managing different views within the dialog
    const [showDeviceSelect, setShowDeviceSelect] = useState(false);
    const [integrationMainPopup, setIntegrationMainPopup] = useState(true); // Main popup
    const [integrationQRPopup, setIntegrationQRPopup] = useState(false);
    const [isConnected, setIsConnected] = useState(false);
    const [phoneNumber, setPhoneNumber] = useState("+60 17-516 8607"); // This would come from the actual connection
    const [activeTab, setActiveTab] = useState<"settings" | "authorization">("settings");

    const handleDeleteNumber = async (instanceId: string | undefined) => {
        console.log('Deleting number with instanceId:', instanceId);
        if (!instanceId) {
            console.error('Instance ID is undefined');
            return;
        }

        try {
            const { error } = await supabase.functions.invoke('integrations/updateIntegrationConfig', {
                body: { instanceId },
            });

            if (error) {
                console.error('Error deleting number:', error);
                // TODO: Display an error message to the user
                return;
            }

            console.log('Number deleted successfully');
            setInstanceData(null);
        } catch (error) {
            console.error('Error deleting number:', error);
            // TODO: Display an error message to the user
        }
    };


    const {
        initializeConnection,
        qrCodeBase64,
        connectionState,
        isLoading,
        checkCurrentConnectionState,
        instanceData,
        setInstanceData
    } = useWhatsAppConnection(selectedIntegration);

    // Check connection status when the dialog is opened
    useEffect(() => {
        if (open && selectedIntegration) {
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
  const handleConnectWithFacebook = () => {
    // In a real implementation, this would initialize the Facebook SDK and trigger the login flow
    // For this demo, we'll just log the action
    console.log("Connecting with Facebook SDK...");
    window.open("https://business.facebook.com/wa/manage/", "_blank");
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
            <DialogContent className="max-w-3xl h-[600px]">
                <DialogHeader>
                    <DialogTitle>{selectedIntegration ? selectedIntegration.name : 'Connect Integration'}</DialogTitle>
                    <DialogDescription>
                        Connect your WhatsApp account to receive messages in the app.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex gap-x-8">
                    {/* Left Panel */}
                    <div className="flex flex-col items-center w-1/3 space-y-4">
                        {/*  Logo */}
                        <img src={selectedIntegration?.icon_url} alt={`${selectedIntegration?.name} Logo`} className="w-20 h-20 object-contain" />
                        <div className="text-lg font-semibold">{selectedIntegration?.name}</div>
                        {/* Installed/Uninstall buttons */}
                        {selectedIntegration && (
                            <div className="mt-2 flex items-center space-x-2">
                                {connectionState === 'open' ? (
                                    <>
                                        <span className="inline-flex items-center px-3 py-0.5 rounded-full text-sm font-medium bg-green-100 text-green-800">
                                            Installed
                                        </span>
                                        <Button variant="outline" size="sm" className="px-3 py-1">
                                            Uninstall
                                        </Button>
                                    </>
                                ) : (
                                    <Button onClick={handleConnect} className="px-4 py-2">Connect</Button>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Right Panel */}
                    <div className="w-2/3 pl-8">
                        {isLoading ? (
                            <div className="flex items-center justify-center p-8">
                                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                            </div>
                        ) : (
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
                                <ScrollArea className="h-[400px] w-full"> {/* Added ScrollArea with fixed height */}
                                    {selectedIntegration?.name === 'WhatsApp' && connectionState === 'open' && (
                                        <div className="space-y-4">
                                            <div className="space-y-2">
                                                <h3 className="text-base font-semibold">Backup number</h3>
                                                <p className="text-sm text-gray-500">
                                                    This WhatsApp account will be used in case your other numbers get disconnected.
                                                </p>
                                                <div className="bg-gray-100 p-2 rounded-md">
                                                    <p className="text-sm text-gray-600">{phoneNumber}</p>
                                                </div>
                                            </div>
                                            <div className="">
                                                <Table>
                                                    <TableHeader>
                                                        <TableRow>
                                                            <TableHead className="text-sm">Name</TableHead>
                                                            <TableHead className="text-sm">Number</TableHead>
                                                            <TableHead className="text-sm">Pipeline</TableHead>
                                                            <TableHead className="text-sm">Status</TableHead>
                                                        </TableRow>
                                                    </TableHeader>
                                                    <TableBody>
                                                        <TableRow>
                        <TableCell className="font-medium text-sm">{instanceData ? instanceData.name : phoneNumber}</TableCell>
                        <TableCell className="text-sm">{instanceData ? instanceData.number : phoneNumber}</TableCell>
                        <TableCell className="text-sm">
                          {instanceData ? <PipelineDropdown /> : <PipelineDropdown />}
                        </TableCell>
                                                            <TableCell>
                                                                <div className="flex items-center justify-between">
                                                                    {instanceData?.connectionStatus === 'open' ? (
                                                                        <CheckCircle className="h-4 w-4 text-green-500" />
                                                                    ) : (
                                                                        <X className="h-4 w-4 text-red-500" />
                                                                    )}
                                                                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                                                                        <X className="h-3 w-3 text-gray-400" />
                                                                    </Button>
                                                                </div>
                                                            </TableCell>
                                                            <TableCell>
                                                                <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => handleDeleteNumber(instanceData?.id)}>
                                                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3">
                                                                        <path fillRule="evenodd" d="M16.5 5.25a.75.75 0 00-1.5 0v2.25h-3V5.25a.75.75 0 00-1.5 0v2.25h-3V5.25a.75.75 0 00-1.5 0v2.25H5.25a.75.75 0 000 1.5h1.125v9a.75.75 0 00.75.75h9a.75.75 0 00.75-.75v-9h1.125a.75.75 0 000-1.5h-2.25V5.25zm-6 12.75a.75.75 0 01.75-.75h1.5a.75.75 0 01.75.75v1.5a.75.75 0 01-.75.75h-1.5a.75.75 0 01-.75-.75v-1.5zm-3-4.5a.75.75 0 01.75-.75h1.5a.75.75 0 01.75.75v1.5a.75.75 0 01-.75.75h-1.5a.75.75 0 01-.75-.75v-1.5zm6 4.5a.75.75 0 01.75-.75h1.5a.75.75 0 01.75.75v1.5a.75.75 0 01-.75.75h-1.5a.75.75 0 01-.75-.75v-1.5z" clipRule="evenodd" />
                                                                    </svg>
                                                                </Button>
                                                            </TableCell>
                                                        </TableRow>
                                                    </TableBody>
                                                </Table>

                                                <Button className="mt-2" variant="outline">
                                                    <Plus className="h-4 w-4 mr-2" />
                                                    Add number
                                                </Button>
                                            </div>
                                            <div className="mt-6 p-4 bg-amber-50 rounded-lg border border-amber-100">
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
                                    )}

                                    {selectedIntegration?.name === 'WhatsApp Cloud API' && (
                                        <>
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
                                        </>
                                    )}
                                    {(!selectedIntegration || (selectedIntegration.name !== 'WhatsApp' && selectedIntegration.name !== 'WhatsApp Cloud API')) && (
                                        <div className="space-y-4">
                                            <h3 className="text-lg font-semibold">Connect WhatsApp</h3>
                                            <p className="text-sm text-muted-foreground">
                                                Connect multiple WhatsApp numbers to send important conversations straight to your inbox.
                                            </p>
                                            <Button className="w-full" size="lg" onClick={handleConnect}>
                                                Connect
                                            </Button>
                                        </div>
                                    )}
                                </ScrollArea>
                            </TabsContent>
                            <TabsContent value="authorization">
                            <ScrollArea className="h-[400px] w-full"> {/* Added ScrollArea with fixed height */}

                              <div className="space-y-4">
                                <p className="text-sm text-muted-foreground">
                                  Authorization settings will be available after connecting your WhatsApp account.
                                </p>
                              </div>
                              </ScrollArea>
                            </TabsContent>
                        </Tabs>
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
