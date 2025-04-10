// UI Imports
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { CheckCircle, AlertCircle, X, Loader2, PhoneCall, Trash2 } from "lucide-react"; // Icons

// React & Tanstack Query Imports
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query"; // Import queryClient

// Project Imports
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { Integration } from "../../types";
import { logoutWhatsAppInstance } from "@/integrations/evolution-api/services/logoutService";
import { fetchEvolutionInstances } from "@/integrations/evolution-api/services/fetchInstancesService";
import { deleteEvolutionInstance } from "@/integrations/evolution-api/services/deleteInstanceService";
import { useEvolutionApiConfig } from "@/integrations/evolution-api/hooks/useEvolutionApiConfig";
import { getEvolutionCredentials } from "@/integrations/evolution-api/utils/credentials";
import type { ConnectionState } from "../../types"; // Import ConnectionState

interface WhatsAppBusinessSettingsProps {
  selectedIntegration: Integration | null;
  onConnect: () => void;
}

interface InstanceData {
  id?: string;
  token?: string;
  instance: {
    instanceName: string;
    status: 'open' | 'connecting' | 'close' | 'qrcode' | 'syncing';
    owner?: string;
    profileName?: string;
    profilePictureUrl?: string;
  };
}

interface ValidatedCreatePayload {
  instanceName: string;
  integration: string;
  projectId: string;
  customerId: string;
  qrcode: boolean;
  webhook: {
    url: string;
    events: string[];
    ByEvents: boolean;
  };
}

type DisplayInstance = InstanceData;

export function WhatsAppBusinessSettings({ selectedIntegration, onConnect }: WhatsAppBusinessSettingsProps) {
  const queryClient = useQueryClient();
  const toastUtils = useToast();
  const { toast } = toastUtils;
  const { config, isLoading: isConfigLoading } = useEvolutionApiConfig(selectedIntegration);

  const [instanceDetails, setInstanceDetails] = useState<DisplayInstance | null>(null);
  const [isFetchingLive, setIsFetchingLive] = useState(true);
  const [isLogoutLoading, setIsLogoutLoading] = useState<string | null>(null);
  const [isDeleteLoading, setIsDeleteLoading] = useState<boolean>(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [noInstanceFoundFromServer, setNoInstanceFoundFromServer] = useState(false);
  const [isCreating, setIsCreating] = useState<boolean>(false);

  useEffect(() => {
    const fetchAndConfigureInstance = async () => {
      if (!selectedIntegration?.id) {
        setIsFetchingLive(false);
        setLoadError("No integration selected.");
        return;
      }

      setIsFetchingLive(true);
      setLoadError(null);
      setInstanceDetails(null);
      setNoInstanceFoundFromServer(false);

      try {
        console.log(`Fetching all instances for integration ${selectedIntegration.id}...`);
        const allInstancesResult = await fetchEvolutionInstances(selectedIntegration.id);

        if (!Array.isArray(allInstancesResult)) {
          if (allInstancesResult !== null && typeof allInstancesResult === 'object' && 'error' in allInstancesResult) {
            const errorResult = allInstancesResult as { error: string; details?: string };
            console.error('Error fetching instances list:', errorResult.error, errorResult.details);
            throw new Error(errorResult.error || 'Failed to fetch instances list.');
          } else {
            console.error('Unexpected response from fetchInstances:', allInstancesResult);
            throw new Error('Received unexpected data format when fetching instances.');
          }
        }
        console.log("Successfully fetched instances array:", allInstancesResult);

        if (allInstancesResult.length === 0) {
          console.log("No instances found on the server for this integration.");
          setNoInstanceFoundFromServer(true);
          setIsFetchingLive(false);
          return;
        }

        const configuredInstanceId = config?.instance_id;
        let targetInstance: InstanceData | undefined = undefined;
        let connectionStatus: ConnectionState = 'unknown';

        if (configuredInstanceId) {
           console.log(`Looking for configured instance ID ${configuredInstanceId} in fetched results...`);
           targetInstance = (allInstancesResult as InstanceData[]).find(inst => inst.id === configuredInstanceId);
        } else {
           if (allInstancesResult.length === 1) {
               console.log("Config empty, but found one instance in fetch results. Selecting it for initial config.");
               targetInstance = (allInstancesResult as InstanceData[])[0];
           } else {
               setLoadError("Configuration needed: Multiple instances found, but none specifically configured.");
               setIsFetchingLive(false);
               return;
           }
        }

        if (targetInstance && targetInstance.id) {
          const fetchedInstanceId = targetInstance.id;
          const fetchedToken = targetInstance.token;
          console.log(`Found matching instance ID: ${fetchedInstanceId}. Determining display name and status...`);

          const displayName = targetInstance.instance?.profileName || targetInstance.instance?.instanceName || fetchedInstanceId || 'Unnamed Instance';
          console.log(`Determined display name: ${displayName}`);

          const fetchedStatus = targetInstance.instance?.status;
          if (fetchedStatus === 'open') {
            connectionStatus = 'open';
          } else if (fetchedStatus === 'close') {
            connectionStatus = 'close';
          } else if (['connecting', 'qrcode', 'syncing'].includes(fetchedStatus)) {
            connectionStatus = 'connecting';
          } else {
            connectionStatus = 'unknown';
          }
          console.log(`Mapped fetched status '${fetchedStatus}' to connectionStatus '${connectionStatus}'`);

          console.log(`Attempting to upsert config for integration ${selectedIntegration.id} (Instance: ${fetchedInstanceId}) with connection_status: ${connectionStatus}`);
          const { error: upsertError } = await supabase
            .from('integrations_config')
            .upsert(
              {
                integration_id: selectedIntegration.id,
                instance_id: fetchedInstanceId,
                token: fetchedToken,
                instance_display_name: displayName,
                connection_status: connectionStatus
              },
              { onConflict: 'integration_id' }
            );

          if (upsertError) {
            console.error(`Error upserting config for integration ${selectedIntegration.id}:`, upsertError);
            throw new Error(`Failed to save instance configuration: ${upsertError.message}`);
          } else {
             console.log(`Successfully upserted config for integration ${selectedIntegration.id} with status ${connectionStatus}.`);
          }

          console.log("Setting LIVE instance details state:", targetInstance);
          setInstanceDetails(targetInstance);

        } else {
           console.log(`Configured instance ID ${configuredInstanceId} not found in fetch results. Assuming disconnected/deleted.`);
           connectionStatus = 'close';

           console.log(`Attempting to update connection_status to '${connectionStatus}' for integration ${selectedIntegration.id} (Instance ID: ${configuredInstanceId})`);
           const { error: updateStatusError } = await supabase
             .from('integrations_config')
             .update({ connection_status: connectionStatus as string })
             .eq('integration_id', selectedIntegration.id);

           if (updateStatusError) {
             console.error(`Error updating connection_status to '${connectionStatus}' for integration ${selectedIntegration.id}:`, updateStatusError);
             toast({ title: "Status Update Failed", description: `Could not update status for missing instance: ${updateStatusError.message}`, variant: "destructive" });
           } else {
             console.log(`Successfully updated connection_status to '${connectionStatus}' for missing instance ${configuredInstanceId}.`);
           }
           setInstanceDetails(null);
        }

      } catch (error) {
        console.error('Error processing instance:', error);
        const errorMessage = (error as Error).message || "An unexpected error occurred";
        setLoadError(`Could not load WhatsApp instance details: ${errorMessage}`);
        toast({
          title: "Error Loading Instance",
          description: errorMessage,
          variant: "destructive"
        });
      } finally {
        setIsFetchingLive(false);
      }
    };

    fetchAndConfigureInstance();
  }, [selectedIntegration?.id, config, queryClient, toast]);

  const handleLogout = async (instanceName: string) => {
    if (!selectedIntegration?.id || !instanceName) return;
    setIsLogoutLoading(instanceName);
    try {
      const success = await logoutWhatsAppInstance(
        instanceName,
        selectedIntegration.id,
        () => {
          setInstanceDetails(null);
          toast({ title: "Disconnected", description: `Instance ${instanceName} disconnected.` });
          // Invalidate query to refetch status in IntegrationsView
          queryClient.invalidateQueries({ queryKey: ['integrationsWithConfig'] });
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

  const handleDirectCreateInstance = async () => {
    if (!selectedIntegration?.id) {
      toast({ title: "Error", description: "Integration details are missing.", variant: "destructive" });
      return;
    }
    setIsCreating(true);
    let instanceNameForLogs = 'Unknown';
    try {
      const { apiKey, baseUrl, metadata: fetchedMetadata } = await getEvolutionCredentials(selectedIntegration.id);
      const createUrl = `${baseUrl}/instance/create`;

      if (!fetchedMetadata || typeof fetchedMetadata !== 'object' || Array.isArray(fetchedMetadata)) {
        throw new Error("Fetched metadata is missing or not a valid object.");
      }
      const metadata = fetchedMetadata as Record<string, unknown>;

      const missingOrInvalid: string[] = [];
      if (typeof metadata.instanceName !== 'string' || !metadata.instanceName) missingOrInvalid.push('instanceName (string)');
      if (typeof metadata.integration !== 'string' || !metadata.integration) missingOrInvalid.push('integration (string)');
      if (typeof metadata.projectId !== 'string' || !metadata.projectId) missingOrInvalid.push('projectId (string)');
      if (typeof metadata.customerId !== 'string' || !metadata.customerId) missingOrInvalid.push('customerId (string)');
      if (typeof metadata.qrcode !== 'boolean') missingOrInvalid.push('qrcode (boolean)');

      let validatedWebhook: ValidatedCreatePayload['webhook'] | undefined = undefined;
      if (typeof metadata.webhook !== 'object' || metadata.webhook === null || Array.isArray(metadata.webhook)) {
        missingOrInvalid.push('webhook (object)');
      } else {
        const webhookData = metadata.webhook as Record<string, unknown>;
        if (typeof webhookData.url !== 'string' || !webhookData.url) missingOrInvalid.push('webhook.url (string)');
        if (!Array.isArray(webhookData.events) || webhookData.events.length === 0 || !webhookData.events.every((e: unknown) => typeof e === 'string')) {
             missingOrInvalid.push('webhook.events (non-empty array of strings)');
        }
        if (typeof webhookData.ByEvents !== 'boolean') missingOrInvalid.push('webhook.ByEvents (boolean)');
        if (!missingOrInvalid.some(field => field.startsWith('webhook.'))) {
           validatedWebhook = {
               url: webhookData.url as string,
               events: webhookData.events as string[],
               ByEvents: webhookData.ByEvents as boolean
           };
        }
      }

      if (missingOrInvalid.length > 0) {
        throw new Error(`Missing or invalid required fields in fetched metadata: ${missingOrInvalid.join(', ')}`);
      }

      const payloadToSend: ValidatedCreatePayload = {
        instanceName: metadata.instanceName as string,
        integration: metadata.integration as string,
        projectId: metadata.projectId as string,
        customerId: metadata.customerId as string,
        qrcode: metadata.qrcode as boolean,
        webhook: validatedWebhook!,
      };
      instanceNameForLogs = payloadToSend.instanceName;

      console.log("--- handleDirectCreateInstance: Sending strictly validated metadata payload:", JSON.stringify(payloadToSend, null, 2));
      const response = await fetch(createUrl, {
        method: 'POST',
        headers: { 'apikey': apiKey, 'Content-Type': 'application/json' },
        body: JSON.stringify(payloadToSend),
      });
      const responseData = await response.json();

      if (response.ok) {
        toast({
          title: "Instance Creation Initiated",
          description: `Instance ${responseData.instance?.instanceName || instanceNameForLogs} creation process started. Now saving configuration...`,
        });

        try {
          console.log("Fetching instance details immediately after creation...");
          const allInstancesResult = await fetchEvolutionInstances(selectedIntegration.id);
          if (!Array.isArray(allInstancesResult) || allInstancesResult.length === 0) {
            throw new Error("Could not fetch instance details after creation.");
          }
          const newInstance = (allInstancesResult as InstanceData[])[0];
          if (!newInstance || !newInstance.id || !newInstance.token) {
             throw new Error("Fetched instance details are incomplete (missing id or token).");
          }

          const fetchedInstanceId = newInstance.id;
          const fetchedToken = newInstance.token;
          const displayName = newInstance.instance?.profileName || newInstance.instance?.instanceName || fetchedInstanceId || 'Unnamed Instance';

          console.log(`Upserting config for new instance ${fetchedInstanceId} with display name ${displayName} and status 'unknown'.`);
          const { error: upsertError } = await supabase
            .from('integrations_config')
            .upsert(
              {
                integration_id: selectedIntegration.id,
                instance_id: fetchedInstanceId,
                token: fetchedToken,
                instance_display_name: displayName,
                connection_status: 'unknown'
              },
              { onConflict: 'integration_id' }
            );

          if (upsertError) {
            throw new Error(`Failed to save instance configuration after creation: ${upsertError.message}`);
          }

          console.log("Successfully saved configuration immediately after creation.");
          toast({ title: "Configuration Saved", description: `Instance ${displayName} configured.` });

          await queryClient.invalidateQueries({ queryKey: ['integrationsWithConfig'] });
          setNoInstanceFoundFromServer(false);

        } catch (fetchUpsertError) {
           console.error("Error fetching/upserting config after instance creation:", fetchUpsertError);
           toast({
             title: "Config Save Failed",
             description: `Instance created, but failed to save configuration: ${fetchUpsertError instanceof Error ? fetchUpsertError.message : String(fetchUpsertError)}`,
             variant: "destructive",
           });
           await queryClient.invalidateQueries({ queryKey: ['integrationsWithConfig'] });
        }
      } else {
        throw new Error(responseData.message || responseData.error || `HTTP error ${response.status}`);
      }
    } catch (error) {
      console.error(`--- handleDirectCreateInstance: Error creating instance ${instanceNameForLogs}:`, error);
      toast({
        title: "Instance Creation Failed",
        description: `Could not create instance: ${error instanceof Error ? error.message : String(error)}`,
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleDelete = async () => {
      const instanceIdToDelete = config?.instance_id;
      if (!selectedIntegration?.id || !instanceIdToDelete) {
          toast({ title: "Error", description: "Integration or Instance ID missing.", variant: "destructive" });
          return;
      }
      setIsDeleteLoading(true);
      try {
          const success = await deleteEvolutionInstance(instanceIdToDelete, selectedIntegration.id);
          if (success) {
              toast({ title: "Instance Deleted", description: `Instance ${config?.instance_display_name || instanceIdToDelete} successfully deleted.` });
              setInstanceDetails(null);
              // Invalidate queries to reflect deletion
              await queryClient.invalidateQueries({ queryKey: ['integrationsWithConfig'] });
              await queryClient.invalidateQueries({ queryKey: ['integration-config', selectedIntegration.id] });
              setNoInstanceFoundFromServer(true);
          } else {
              toast({ title: "Deletion Failed", description: `Could not delete instance ${config?.instance_display_name || instanceIdToDelete}.`, variant: "destructive" });
          }
      } catch (error) {
          console.error(`Error deleting instance ${instanceIdToDelete}:`, error);
          toast({
              title: "Deletion Error",
              description: `Failed to delete instance: ${error instanceof Error ? error.message : String(error)}`,
              variant: "destructive"
          });
      } finally {
          setIsDeleteLoading(false);
      }
  };

  const isConnected = (details: DisplayInstance | null) => {
    return details?.instance?.status === 'open';
  };

  if (isConfigLoading || isFetchingLive) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4 p-4 text-center">
        <AlertCircle className="h-10 w-10 text-red-500" />
        <p className="text-red-600 font-medium">Error Checking Instance</p>
        <p className="text-sm text-gray-600">{loadError}</p>
        <Button onClick={() => window.location.reload()} variant="outline">Refresh Page</Button>
      </div>
    );
  }

   if (noInstanceFoundFromServer) {
     return (
       <div className="flex flex-col items-center justify-center h-64 space-y-4 p-4 text-center">
         <PhoneCall className="h-10 w-10 text-muted-foreground" />
         <p className="text-lg font-medium">No Instance Found</p>
         <p className="text-muted-foreground text-center max-w-md">
           No active WhatsApp instance was found on the server for this integration. You can attempt to create one using the stored configuration.
         </p>
         <Button onClick={handleDirectCreateInstance} variant="default" disabled={isCreating || isConfigLoading}>
           {isCreating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
           Create Instance
         </Button>
       </div>
     );
   }

  if (!isConfigLoading && !isFetchingLive && !config?.instance_id && !loadError && !noInstanceFoundFromServer) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4 p-4 text-center">
        <AlertCircle className="h-10 w-10 text-orange-500" />
        <p className="text-lg font-medium">Configuration Issue</p>
        <p className="text-muted-foreground text-center max-w-md">
          Could not load instance configuration from the database. Try reconnecting.
        </p>
         <Button onClick={onConnect} variant="outline">Reconnect Instance</Button>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="space-y-4">
        <div className="space-y-4 mt-6">
          <h3 className="text-lg font-semibold">Configured Instance</h3>
          <p className="text-sm text-gray-500">
            Displaying the instance configured for this integration. Status is checked live.
          </p>

          <div className="mt-8">
            {config?.instance_id ? (
              <div className="border rounded-md">
                <ScrollArea className="h-[200px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Configured Name</TableHead>
                        <TableHead>Pipeline</TableHead>
                        <TableHead>Live Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow key={config.instance_id}>
                        <TableCell className="font-medium">{config.instance_display_name || config.instance_id || 'N/A'}</TableCell>
                        <TableCell>
                          <select className="border rounded-md px-2 py-1">
                            <option>Default Pipeline</option>
                          </select>
                        </TableCell>
                        <TableCell>
                          {isConnected(instanceDetails) ? (
                            <div className="flex items-center justify-between">
                              <CheckCircle className="h-5 w-5 text-green-500" />
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0"
                                onClick={() => instanceDetails?.instance?.instanceName && handleLogout(instanceDetails.instance.instanceName)}
                                disabled={!instanceDetails?.instance?.instanceName || isLogoutLoading === instanceDetails.instance.instanceName}
                                title="Disconnect"
                              >
                                {isLogoutLoading === instanceDetails?.instance?.instanceName ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <X className="h-4 w-4 text-gray-400 hover:text-red-500" />
                                )}
                              </Button>
                            </div>
                          ) : (
                            <div className="flex items-center justify-end space-x-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={onConnect}
                                disabled={isDeleteLoading}
                                title="Connect Instance"
                              >
                                 Connect
                               </Button>
                               <Button
                                 variant="destructive"
                                size="sm"
                                onClick={handleDelete}
                                disabled={isDeleteLoading}
                                title="Delete Instance"
                                className="h-6 w-6 p-0"
                              >
                                {isDeleteLoading ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Trash2 className="h-4 w-4" />
                                )}
                                <span className="sr-only">Delete Instance</span>
                              </Button>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </ScrollArea>
              </div>
            ) : (
               <p className="text-muted-foreground">Instance configuration not found.</p>
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
