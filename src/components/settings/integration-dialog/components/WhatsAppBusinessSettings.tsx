import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { CheckCircle, Plus, AlertCircle, X, Loader2, PhoneCall } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { Integration } from "../../types";
import { logoutWhatsAppInstance } from "../hooks/whatsapp/services/logoutService";
import fetchInstances from "../hooks/whatsapp/services/fetchInstancesService";
import { useWhatsAppConfig } from "../hooks/whatsapp/useWhatsAppConfig";
import { WHATSAPP_INSTANCE } from "../hooks/whatsapp/services/config";

interface WhatsAppBusinessSettingsProps {
  selectedIntegration: Integration | null;
  onConnect: () => void;
}

interface InstanceData {
  id: string;
  name: string;
  token: string;
  connectionStatus: string;
  ownerJid?: string | null;
  profileName?: string | null;
  profilePicUrl?: string | null;
  number?: string;
}

type DisplayInstance = InstanceData;

export function WhatsAppBusinessSettings({ selectedIntegration, onConnect }: WhatsAppBusinessSettingsProps) {
  const [instanceDetails, setInstanceDetails] = useState<DisplayInstance | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLogoutLoading, setIsLogoutLoading] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const toastUtils = useToast();
  const { toast } = toastUtils;
  const { config } = useWhatsAppConfig(selectedIntegration);

  useEffect(() => {
    const fetchConfiguredInstance = async () => {
      if (!selectedIntegration?.id) {
        setIsLoading(false);
        setLoadError("No integration selected.");
        return;
      }

      setIsLoading(true);
      setLoadError(null);
      setInstanceDetails(null);

      try {
        console.log(`Fetching config for integration ${selectedIntegration.id}...`);
        const { data: configData, error: configError } = await supabase
          .from('integrations_config')
          .select('instance_id')
          .eq('integration_id', selectedIntegration.id)
          .maybeSingle();

        if (configError) {
          console.error(`Error fetching config for integration ${selectedIntegration.id}:`, configError);
          throw new Error(`Failed to fetch configuration: ${configError.message}`);
        }

        if (!configData?.instance_id) {
          console.log(`No instance_id configured for integration ${selectedIntegration.id}.`);
          setLoadError("WhatsApp integration is not configured yet.");
          setIsLoading(false);
          return;
        }

        const instanceId = configData.instance_id;
        console.log(`Found instance ID: ${instanceId}. Fetching details...`);

        const instanceNameFromConfig = configData.instance_id;
        console.log(`Found configured instance name: ${instanceNameFromConfig}. Fetching all instances to find details...`);

        const allInstancesResult = await fetchInstances();

        if (!Array.isArray(allInstancesResult)) {
          const errorResult = allInstancesResult as { error: string };
          console.error('Error fetching instances list:', errorResult.error);
          throw new Error(errorResult.error || 'Failed to fetch instances list.');
        }
        
        console.log("Successfully fetched instances array:", allInstancesResult);
        const receivedIds = (allInstancesResult as InstanceData[]).map(item => item.id);
        console.log(`[DEBUG] IDs received from fetchInstances API:`, receivedIds);
        console.log(`[DEBUG] Searching for ID from Supabase config: ${instanceNameFromConfig}`);

        const matchingInstance = (allInstancesResult as InstanceData[]).find(
          item => item.id === instanceNameFromConfig
        );

        if (!matchingInstance) {
          console.error(`Configured instance with ID '${instanceNameFromConfig}' not found in the fetched list.`);
          throw new Error(`Configured instance with ID '${instanceNameFromConfig}' not found.`);
        }

        console.log("Found matching configured instance data:", matchingInstance);
        setInstanceDetails(matchingInstance);
        console.log(`[DEBUG] Attempting to save to localStorage with key ${WHATSAPP_INSTANCE}:`, matchingInstance);
        try {
          localStorage.setItem(WHATSAPP_INSTANCE, JSON.stringify(matchingInstance));
          console.log(`[DEBUG] Successfully saved full instance data to localStorage using key ${WHATSAPP_INSTANCE}.`);
          const retrievedData = localStorage.getItem(WHATSAPP_INSTANCE);
          console.log(`[DEBUG] Verification retrieve from localStorage:`, retrievedData ? JSON.parse(retrievedData) : 'null or empty');
        } catch (storageError) {
          console.error(`[DEBUG] Error saving to localStorage:`, storageError);
        }
      } catch (error) {
        console.error('Error fetching configured instance:', error);
        const errorMessage = (error as Error).message || "An unexpected error occurred";
        setLoadError(`Could not load WhatsApp instance details: ${errorMessage}`);
        toast({
          title: "Error Loading Instance",
          description: errorMessage,
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchConfiguredInstance();
  }, [selectedIntegration, toast]);

  const handleLogout = async (instanceName: string) => {
    if (!selectedIntegration || !instanceName) return;

    setIsLogoutLoading(instanceName);

    try {
      const success = await logoutWhatsAppInstance(
        instanceName,
        () => {
          setInstanceDetails(null);
          toast({ title: "Disconnected", description: `Instance ${instanceName} disconnected.` });
        },
        { toast: toastUtils }
      );

      if (success === false) {
        console.error(`Failed to logout WhatsApp instance ${instanceName}`);
      }
    } catch (error) {
      console.error(`Error logging out instance ${instanceName}:`, error);
      toast({
        title: "Logout Error",
        description: `Failed to disconnect instance ${instanceName}: ${(error as Error).message}`,
        variant: "destructive"
      });
    } finally {
      setIsLogoutLoading(null);
    }
  };

  const getStatusIcon = (details: DisplayInstance | null) => {
    const status = details?.connectionStatus;
    const isConnected = status === 'open';

    return isConnected
      ? <CheckCircle className="h-5 w-5 text-green-500" />
      : <AlertCircle className="h-5 w-5 text-amber-500" />;
  };

  const isConnected = (details: DisplayInstance | null) => {
    return details?.connectionStatus === 'open';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (loadError && !instanceDetails) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4 p-4 text-center">
        <AlertCircle className="h-10 w-10 text-red-500" />
        <p className="text-red-600 font-medium">Error Loading Instance</p>
        <p className="text-sm text-gray-600">{loadError}</p>
        <Button onClick={() => window.location.reload()} variant="outline">Refresh Page</Button>
      </div>
    );
  }

  if (!isLoading && !instanceDetails && !loadError) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4 p-4 text-center">
        <PhoneCall className="h-10 w-10 text-muted-foreground" />
        <p className="text-lg font-medium">WhatsApp Instance Not Found</p>
        <p className="text-muted-foreground text-center max-w-md">
          The WhatsApp instance details could not be loaded. It might need to be configured first.
        </p>
        <Button onClick={() => window.location.reload()} variant="outline">Refresh</Button>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="space-y-4">
        <div className="space-y-4 mt-6">
          <h3 className="text-lg font-semibold">Configured Instance</h3>
          <div className="mt-8">
            {instanceDetails ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Pipeline</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow key={instanceDetails.id}>
                    <TableCell className="font-medium">{instanceDetails.profileName || instanceDetails.name}</TableCell>
                    <TableCell>
                      <select className="border rounded-md px-2 py-1">
                        <option>Default Pipeline</option>
                      </select>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-between">
                        {getStatusIcon(instanceDetails)}
                        {isConnected(instanceDetails) ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={() => handleLogout(instanceDetails.name)}
                            disabled={isLogoutLoading === instanceDetails.name}
                            title="Disconnect"
                          >
                            {isLogoutLoading === instanceDetails.name ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <X className="h-4 w-4 text-gray-400 hover:text-red-500" />
                            )}
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            onClick={onConnect}
                            title="Attempt Reconnect"
                          >
                            Connect
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            ) : (
              <p className="text-muted-foreground">Instance details not available.</p>
            )}
          </div>
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
  );
}
