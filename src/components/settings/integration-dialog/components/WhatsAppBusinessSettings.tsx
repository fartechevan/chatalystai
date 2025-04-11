// UI Imports
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { CheckCircle, AlertCircle, X, Loader2, PhoneCall, Trash2 } from "lucide-react"; // Icons

// React & Tanstack Query Imports
import { useEffect, useState } from "react"; // Keep useState
import { useQueryClient } from "@tanstack/react-query"; // Import queryClient

// Project Imports
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { Integration } from "../../types";
import { logoutWhatsAppInstance } from "@/integrations/evolution-api/services/logoutService";
import { fetchEvolutionInstances } from "@/integrations/evolution-api/services/fetchInstancesService";
import { deleteEvolutionInstance } from "@/integrations/evolution-api/services/deleteInstanceService";
// Import useEvolutionApiConfig to get refetchConfig
import { useEvolutionApiConfig } from "@/integrations/evolution-api/hooks/useEvolutionApiConfig";
import { getEvolutionCredentials } from "@/integrations/evolution-api/utils/credentials";
import type { ConnectionState } from "../../types"; // Import ConnectionState

interface WhatsAppBusinessSettingsProps {
  selectedIntegration: Integration | null;
  // Modify onConnect prop to accept the display name
  onConnect: (instanceDisplayName: string | null | undefined) => void;
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
  // Get refetchConfig from the hook
  const { config, isLoading: isConfigLoading, refetchConfig } = useEvolutionApiConfig(selectedIntegration);

  const [instanceDetails, setInstanceDetails] = useState<DisplayInstance | null>(null);
  const [isFetchingLive, setIsFetchingLive] = useState(true);
  // Add state for refetching before connect
  const [isRefetching, setIsRefetching] = useState(false);
  const [isLogoutLoading, setIsLogoutLoading] = useState<string | null>(null);
  const [isDeleteLoading, setIsDeleteLoading] = useState<boolean>(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [noInstanceFoundFromServer, setNoInstanceFoundFromServer] = useState(false);
  const [isCreating, setIsCreating] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  const [instanceName, setInstanceName] = useState<string>("");
  const [instanceDisplayName, setInstanceDisplayName] = useState<string>("");
  const [apiKey, setApiKey] = useState<string>("");

  useEffect(() => {
    const fetchAndConfigureInstance = async () => {
      // config is removed from dependencies, fetch fresh config inside
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
        // Fetch live instances first
        console.log(`Fetching all instances for integration ${selectedIntegration.id}...`);
        const allInstancesResult = await fetchEvolutionInstances(selectedIntegration.id);

        // --- Error handling for fetchInstances ---
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
        // --- End Error handling ---

        // Fetch the LATEST config directly from Supabase NOW
        console.log(`Fetching latest config directly for integration ${selectedIntegration.id}...`);
        const { data: latestConfigData, error: latestConfigError } = await supabase
          .from('integrations_config')
          .select('instance_id, token, instance_display_name') // Select necessary fields
          .eq('integration_id', selectedIntegration.id)
          .maybeSingle();

        if (latestConfigError && latestConfigError.code !== 'PGRST116') { // Ignore 'No rows found' error
          console.error('Error fetching latest config directly:', latestConfigError);
          throw new Error(`Failed to fetch latest configuration: ${latestConfigError.message}`);
        }
        console.log("Latest config data fetched directly:", latestConfigData);
        const configuredInstanceId = latestConfigData?.instance_id; // Use ID from the direct fetch

        // Handle case where no live instances exist
        if (allInstancesResult.length === 0) {
          console.log("No instances found on the server for this integration.");
          setNoInstanceFoundFromServer(true);
          // If config existed but no live instance, clear the stale config
          if (configuredInstanceId) {
             console.log(`No live instances found, but config exists for ${configuredInstanceId}. Clearing stored config.`);
             // Clear the stale configuration from the database
             const { error: clearConfigError } = await supabase
               .from('integrations_config')
               .update({
                 instance_id: null,
                 token: null,
                 instance_display_name: null
               })
               .eq('integration_id', selectedIntegration.id);

             if (clearConfigError) {
               console.error(`Error clearing stale config for integration ${selectedIntegration.id} (no live instances):`, clearConfigError);
               toast({
                 title: "Config Sync Warning",
                 description: `Could not clear stale configuration for missing instance ${configuredInstanceId}.`,
                 variant: "destructive"
               });
             } else {
               console.log(`Successfully cleared stale config for missing live instance ${configuredInstanceId} (no live instances).`);
               // Invalidate the config query to reflect the cleared state
               await queryClient.invalidateQueries({ queryKey: ['integration-config', selectedIntegration.id] });
             }
          }
          setIsFetchingLive(false);
          return;
        }

        // Now proceed with comparison using the freshly fetched configuredInstanceId
        let targetInstance: InstanceData | undefined = undefined;
        let connectionStatus: ConnectionState = 'unknown';

        if (configuredInstanceId) {
           console.log(`Comparing live instances against latest configured ID: ${configuredInstanceId}`);
           targetInstance = (allInstancesResult as InstanceData[]).find(inst => inst.id === configuredInstanceId);
        } else {
           // Handle case where DB config is missing/empty, but live instances exist
           if (allInstancesResult.length === 1) {
               console.log("DB Config empty/missing, but found one live instance. Selecting it for initial config.");
               targetInstance = (allInstancesResult as InstanceData[])[0];
           } else {
               console.log("DB Config empty/missing and multiple live instances found. Configuration needed.");
               setLoadError("Configuration needed: Multiple instances found, but none specifically configured in the database.");
               setIsFetchingLive(false);
               return; // Stop processing, user needs to configure
           }
        }

        // --- Logic for handling found/not found targetInstance ---
        if (targetInstance && targetInstance.id) {
          // Instance found live that matches the latest config ID (or is the only live one)
          const fetchedInstanceId = targetInstance.id;
          const fetchedToken = targetInstance.token; // Use token from the live instance data
          console.log(`Found matching live instance ID: ${fetchedInstanceId}. Determining display name and status...`);

          // Determine display name (prioritize profile name from live data)
          const displayName = targetInstance.instance?.profileName || targetInstance.instance?.instanceName || fetchedInstanceId || 'Unnamed Instance';
          console.log(`Determined display name: ${displayName}`);

          // Determine connection status from live data

          const fetchedStatus = targetInstance.instance?.status;
          if (fetchedStatus === 'open') connectionStatus = 'open';
          else if (fetchedStatus === 'close') connectionStatus = 'close';
          else if (['connecting', 'qrcode', 'syncing'].includes(fetchedStatus)) connectionStatus = 'connecting';
          else connectionStatus = 'unknown';
          console.log(`Mapped live status '${fetchedStatus}' to connectionStatus '${connectionStatus}'`);

          // Upsert the config with potentially updated token and display name (status is NOT part of integrations_config)
          console.log(`Attempting to upsert config for integration ${selectedIntegration.id} (Instance: ${fetchedInstanceId}), name: ${displayName}`);
          const { error: upsertError } = await supabase
            .from('integrations_config')
            .upsert(
              {
                integration_id: selectedIntegration.id,
                instance_id: fetchedInstanceId, // The ID of the matched/selected live instance
                token: fetchedToken, // The token from the live instance data
                instance_display_name: displayName, // The determined display name
                // status: connectionStatus // REMOVED - Not in integrations_config table
              },
              { onConflict: 'integration_id' } // Upsert based on integration_id
            );

          if (upsertError) {
            console.error(`Error upserting config for integration ${selectedIntegration.id}:`, upsertError);
            throw new Error(`Failed to save instance configuration: ${upsertError.message}`);
          } else {
             // The log message here was incorrect, status is not saved.
             // console.log(`Successfully upserted config for integration ${selectedIntegration.id} with status ${connectionStatus}.`);
             console.log(`Successfully upserted config for integration ${selectedIntegration.id}.`);
          }

          // Update the UI state with the live instance details
          console.log("Setting LIVE instance details state:", targetInstance);
          setInstanceDetails(targetInstance);
          // Invalidate config query in case display name/token was updated
          await queryClient.invalidateQueries({ queryKey: ['integration-config', selectedIntegration.id] });

        } else if (configuredInstanceId) { // Only run this block if a config ID *existed* but wasn't found live
           // Configured instance ID exists in DB, but no matching live instance found
           console.log(`Latest configured instance ID ${configuredInstanceId} not found in live results. Clearing stored config.`);
           connectionStatus = 'close'; // Keep this for UI logic

           // Clear the stale configuration from the database
           const { error: clearConfigError } = await supabase
             .from('integrations_config')
             .update({
               instance_id: null,
               token: null,
               instance_display_name: null
             })
             .eq('integration_id', selectedIntegration.id);

           if (clearConfigError) {
             console.error(`Error clearing stale config for integration ${selectedIntegration.id}:`, clearConfigError);
             // Optionally toast or throw, but clearing is best effort here
             toast({
               title: "Config Sync Warning",
               description: `Could not clear stale configuration for missing instance ${configuredInstanceId}.`,
               variant: "destructive" // Use destructive for errors
             });
           } else {
             console.log(`Successfully cleared stale config for missing live instance ${configuredInstanceId}.`);
             // Invalidate the config query to reflect the cleared state
             await queryClient.invalidateQueries({ queryKey: ['integration-config', selectedIntegration.id] });
           }

           // Clear the UI state as the configured instance isn't live
           setInstanceDetails(null);
        }
        // --- End Logic ---

      } catch (error) {
        console.error('Error during fetch/configure instance process:', error);
        const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";
        setLoadError(`Could not load WhatsApp instance details: ${errorMessage}`);
        // Avoid redundant toast if specific errors were already handled
        if (!errorMessage.startsWith("Failed to fetch") && !errorMessage.startsWith("Configuration needed")) {
            toast({
              title: "Error Loading Instance",
              description: errorMessage,
              variant: "destructive"
            });
        }
      } finally {
        setIsFetchingLive(false);
      }
    }; // <-- This closing brace was missing for fetchAndConfigureInstance

    // Run the effect only when the selected integration ID changes
    if (selectedIntegration?.id) {
        fetchAndConfigureInstance();
    }
    // Dependencies: only integration ID and queryClient for invalidation awareness
  }, [selectedIntegration?.id, queryClient, toast]); // <-- This closing parenthesis and brace were missing for useEffect

  const handleLogout = async (instanceName: string) => {
    // Ensure we use the LATEST config for logout, especially the instance_id
    const { data: currentConfig } = await supabase
        .from('integrations_config')
        .select('instance_id')
        .eq('integration_id', selectedIntegration?.id ?? '')
        .single();

    if (!selectedIntegration?.id || !instanceName || !currentConfig?.instance_id) {
        toast({ title: "Logout Error", description: "Missing required information to logout.", variant: "destructive" });
        return;
    }
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
                // status: 'unknown' // REMOVED - status not in integrations_config table
              },
              { onConflict: 'integration_id' }
            );

          if (upsertError) {
            throw new Error(`Failed to save instance configuration after creation: ${upsertError.message}`);
          }

          console.log("Successfully saved configuration immediately after creation.");
          toast({ title: "Configuration Saved", description: `Instance ${displayName} configured.` });

          // Invalidate both list and specific config queries
          await queryClient.invalidateQueries({ queryKey: ['integrationsWithConfig'] });
          await queryClient.invalidateQueries({ queryKey: ['integration-config', selectedIntegration.id] });
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

  const updateInstanceInformation = async () => {
    if (!selectedIntegration?.id || !instanceName) {
      toast({
        title: "Missing Information",
        description: "Integration ID or Instance Name is missing",
        variant: "destructive"
      });
      return;
    }

    setIsSaving(true);
    try {
      // Check if a config already exists for this integration
      const { data: existingConfig, error: configError } = await supabase
        .from('integrations_config')
        .select('id, instance_id')
        .eq('integration_id', selectedIntegration.id)
        .maybeSingle();

      if (configError) throw configError;

      if (existingConfig) {
        // Update the existing config
        const { error: updateError } = await supabase
          .from('integrations_config')
          .update({
            instance_id: instanceName,
            instance_display_name: instanceDisplayName || instanceName,
            // Remove status field as it doesn't exist
            connection_status: 'unknown'
          })
          .eq('id', existingConfig.id);

        if (updateError) throw updateError;
      } else {
        // Create a new config
        const { error: insertError } = await supabase
          .from('integrations_config')
          .insert({
            integration_id: selectedIntegration.id,
            instance_id: instanceName,
            instance_display_name: instanceDisplayName || instanceName,
            token: apiKey, // If provided
            // Remove status field as it doesn't exist
            connection_status: 'unknown'
          });

        if (insertError) throw insertError;
      }

      toast({
        title: "Success",
        description: "Instance configuration saved successfully."
      });

      // Optionally call onConnect callback with the display name
      if (onConnect) onConnect(instanceDisplayName || instanceName);

    } catch (error) {
      console.error("Error updating instance information:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save instance configuration",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleRefetchAndConnect = async () => {
    setIsRefetching(true);
    console.log("[handleRefetchAndConnect] Refetching config...");
    try {
      const { data: latestConfig, error: refetchError } = await refetchConfig();

      if (refetchError) {
        console.error("[handleRefetchAndConnect] Error refetching config:", refetchError);
        toast({ variant: "destructive", title: "Error", description: `Failed to refresh configuration: ${refetchError.message}` });
        setIsRefetching(false);
        return;
      }

      const latestInstanceDisplayName = latestConfig?.instance_display_name;
      console.log("[handleRefetchAndConnect] Refetch complete. Display Name:", latestInstanceDisplayName);

      if (!latestInstanceDisplayName) {
         console.error("[handleRefetchAndConnect] Refetched config missing instance_display_name.");
         toast({ variant: "destructive", title: "Configuration Error", description: "Instance name is missing after refresh. Cannot connect." });
         setIsRefetching(false);
         return;
      }

      // Call the onConnect prop (which is handleConnect from the parent hook) with the fresh name
      onConnect(latestInstanceDisplayName);

    } catch (error) {
       console.error("[handleRefetchAndConnect] Unexpected error:", error);
       toast({ variant: "destructive", title: "Error", description: "An unexpected error occurred while preparing to connect." });
    } finally {
       // Ensure loading state is turned off, connect logic will handle its own loading state
       setIsRefetching(false);
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
         {/* Use handleRefetchAndConnect here as well */}
         <Button
            onClick={handleRefetchAndConnect}
            variant="outline"
            disabled={isRefetching} // Add disabled state
          >
            {isRefetching ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Reconnect Instance
          </Button>
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
                            // Use the new handler
                            onClick={handleRefetchAndConnect}
                            // Disable if deleting OR refetching
                            disabled={isDeleteLoading || isRefetching}
                            title="Connect Instance"
                          >
                             {isRefetching ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
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
