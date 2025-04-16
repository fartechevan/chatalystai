// UI Imports
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Input } from "@/components/ui/input"; // Import Input
import { Label } from "@/components/ui/label"; // Import Label
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
import { setEvolutionWebhook } from "@/integrations/evolution-api/services/setWebhookService"; // <-- Import added
// Import useEvolutionApiConfig to get refetchConfig
import { useEvolutionApiConfig } from "@/integrations/evolution-api/hooks/useEvolutionApiConfig";
import { getEvolutionCredentials } from "@/integrations/evolution-api/utils/credentials";
import type { ConnectionState } from "../../types"; // Import ConnectionState from settings
import type { EvolutionInstance } from "@/integrations/evolution-api/types"; // Import the correct instance type

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

// Updated payload type: Removed projectId, customerId, webhook
interface ValidatedCreatePayload {
  instanceName: string;
  integration: string; // e.g., 'WHATSAPP-BAILEYS'
  qrcode: boolean;
}

// Remove the outdated InstanceData interface
/*
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
*/

// Removed duplicated incorrect ValidatedCreatePayload definition

// Remove the outdated DisplayInstance type alias
// type DisplayInstance = InstanceData;

export function WhatsAppBusinessSettings({ selectedIntegration, onConnect }: WhatsAppBusinessSettingsProps) {
  const queryClient = useQueryClient();
  const toastUtils = useToast();
  const { toast } = toastUtils;
  // Get refetchConfig from the hook
  const { config, isLoading: isConfigLoading, refetchConfig } = useEvolutionApiConfig(selectedIntegration);

  // Update the state type to use the correct EvolutionInstance type
  const [instanceDetails, setInstanceDetails] = useState<EvolutionInstance | null>(null);
  const [isFetchingLive, setIsFetchingLive] = useState(true);
  // Add state for refetching before connect
  const [isRefetching, setIsRefetching] = useState(false);
  const [isLogoutLoading, setIsLogoutLoading] = useState<string | null>(null);
  const [isDeleteLoading, setIsDeleteLoading] = useState<boolean>(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [noInstanceFoundFromServer, setNoInstanceFoundFromServer] = useState(false);
  const [isCreating, setIsCreating] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false); // Keep isSaving if used elsewhere, otherwise remove
  const [newInstanceName, setNewInstanceName] = useState<string>(""); // State for user input

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
        // Fetch all live instances (array)
        console.log(`Fetching instances for integration ${selectedIntegration.id}...`);
        const liveInstances = await fetchEvolutionInstances(selectedIntegration.id);
        // fetchEvolutionInstances now returns EvolutionInstance[] or throws an error
        console.log("Fetched live instances:", liveInstances);

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
         // console.log("Latest config data fetched directly:", latestConfigData); // Removed log
         const configuredInstanceId = latestConfigData?.instance_id; // Use ID from the direct fetch

         // --- Determine the target instance based on config and live instances ---
         let targetInstance: EvolutionInstance | null = null; // Use correct type

         if (configuredInstanceId) {
           console.log(`Configured instance ID found: ${configuredInstanceId}. Searching in live instances...`);
           targetInstance = liveInstances.find(inst => inst.id === configuredInstanceId) ?? null;
           if (targetInstance) {
             console.log(`Found matching live instance: ${targetInstance.id}`);
           } else {
             console.log(`Configured instance ${configuredInstanceId} not found among live instances.`);
             // If config existed but no matching live instance, clear the stale config later
           }
         } else if (liveInstances.length === 1) {
           // No configured ID, but exactly one live instance exists. Select it.
           targetInstance = liveInstances[0];
           console.log(`No configured ID, but found one live instance (${targetInstance.id}). Selecting it.`);
         } else if (liveInstances.length > 1) {
           // No configured ID, and multiple live instances. Ambiguous.
           console.warn(`No configured ID and multiple (${liveInstances.length}) live instances found. Cannot automatically select one.`);
           // Treat as no instance found for now.
         } else {
           // No configured ID and no live instances.
           console.log("No configured ID and no live instances found.");
         }
         // --- End Instance Determination ---


         // Handle case where no target instance could be determined (or specifically no live instances at all)
         if (liveInstances.length === 0) { // Check if *any* live instances were returned
           console.log("No live instances found on the server for this integration.");
           setNoInstanceFoundFromServer(true);
           // If config existed but no live instances, clear the stale config
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
           return; // Exit early if no live instances were found at all
         }

         // --- Logic for handling found/not found targetInstance ---
         let connectionStatus: ConnectionState = 'unknown'; // Keep connectionStatus determination

         if (targetInstance && targetInstance.id) { // Proceed if a targetInstance was determined
          // Instance found live that matches the latest config ID (or is the only live one)
          const fetchedInstanceId = targetInstance.id;
          const fetchedToken = targetInstance.token; // Use token from the live instance data
          console.log(`Found matching live instance ID: ${fetchedInstanceId}. Determining display name and status...`);

          // Determine display name (prioritize profile name from live data, fallback to name)
          const displayName = targetInstance.profileName || targetInstance.name || fetchedInstanceId || 'Unnamed Instance';
          console.log(`Determined display name: ${displayName}`);

          // Determine connection status from live data (using top-level connectionStatus)
          const fetchedStatus = targetInstance.connectionStatus; // Use top-level field
          if (fetchedStatus === 'open') connectionStatus = 'open';
          else if (fetchedStatus === 'close') connectionStatus = 'close';
          else if (['connecting', 'qrcode', 'syncing'].includes(fetchedStatus || '')) connectionStatus = 'connecting'; // Handle potential undefined fetchedStatus
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
           // console.log("Setting LIVE instance details state:", targetInstance); // Removed log
           setInstanceDetails(targetInstance);
           // Invalidate config query in case display name/token was updated
           await queryClient.invalidateQueries({ queryKey: ['integration-config', selectedIntegration.id] });

        } else if (configuredInstanceId) { // Only run this block if a config ID *existed* but wasn't found live
           // Configured instance ID exists in DB, but no matching live instance found (targetInstance is null here)
           console.log(`Configured instance ID ${configuredInstanceId} exists, but no matching live instance found. Clearing stored config.`);
           connectionStatus = 'close'; // Keep this for UI logic

           // Clear the stale configuration from the database (ensure this runs only if config existed but instance didn't match)
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
      // 1. Fetch API Key and Base URL (metadata is no longer returned)
      const { apiKey, baseUrl } = await getEvolutionCredentials(selectedIntegration.id);
      const createUrl = `${baseUrl}/instance/create`;

      // 2. Fetch necessary configuration details
      console.log(`Fetching config details for integration ${selectedIntegration.id}`);

       // Use the user-provided instance name from state
       if (!newInstanceName) {
         throw new Error("Instance name is required. Please enter a name.");
       }
       const instanceNameForCreation = newInstanceName.trim(); // Use trimmed input
       // Hardcode the integration type for the API payload, assuming Baileys for this component
       const integrationType = 'WHATSAPP-BAILEYS';

       // 3. Construct the final payload for the API
       const payloadToSend: ValidatedCreatePayload = {
         instanceName: instanceNameForCreation, // Use the name from user input state
         integration: integrationType, // Hardcoded type
         qrcode: false, // Hardcoded as per requirement
         // webhook details omitted - TODO: Add webhook config later
       };
       instanceNameForLogs = payloadToSend.instanceName;

       console.log("--- handleDirectCreateInstance: Sending payload built from config/integration tables:", JSON.stringify(payloadToSend, null, 2));
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
           // Declare variables needed for upsert *before* the conditional blocks
           let fetchedInstanceId: string | undefined;
           let fetchedToken: string | undefined;
           let displayName: string | undefined;

          console.log("Fetching instance details immediately after creation...");
          console.log("Fetching instance details immediately after creation...");
          const liveInstancesAfterCreate = await fetchEvolutionInstances(selectedIntegration.id); // Returns Instance[]
          console.log("Live instances after create:", liveInstancesAfterCreate);

          // Find the newly created instance in the array (using the name from the payload)
          const newInstance = liveInstancesAfterCreate.find(inst => inst.name === instanceNameForLogs);

          // Check if an instance was actually found
          if (!newInstance) {
            // Add a small delay and retry fetching once, in case of propagation delay
            console.warn(`Instance ${instanceNameForLogs} not found immediately after creation. Retrying fetch in 2 seconds...`);
            await new Promise(resolve => setTimeout(resolve, 2000));
            const liveInstancesRetry = await fetchEvolutionInstances(selectedIntegration.id);
            console.log("Live instances after retry:", liveInstancesRetry);
            const newInstanceRetry = liveInstancesRetry.find(inst => inst.name === instanceNameForLogs);
            if (!newInstanceRetry) {
              throw new Error(`Could not find instance '${instanceNameForLogs}' details after creation and retry.`);
            }
            // Use the instance found after retry
            const fetchedInstanceId = newInstanceRetry.id;
            const fetchedToken = newInstanceRetry.token;
            const displayName = newInstanceRetry.profileName || newInstanceRetry.name || fetchedInstanceId || 'Unnamed Instance';
            console.log(`Found instance ${fetchedInstanceId} after retry.`);
            // Proceed with upsert using newInstanceRetry details
             console.log(`Upserting config for new instance ${fetchedInstanceId} with display name ${displayName}.`); // Status is not saved here
             const { error: upsertError } = await supabase
               .from('integrations_config')
               .upsert(
                 {
                   integration_id: selectedIntegration.id,
                   instance_id: fetchedInstanceId, // Use ID from retry
                   token: fetchedToken, // Use token from retry
                   instance_display_name: displayName, // Use display name from retry
                 },
                 { onConflict: 'integration_id' }
               );
             if (upsertError) {
               throw new Error(`Failed to save instance configuration after creation retry: ${upsertError.message}`);
             }

           } else {
              // Instance found on the first try
              fetchedInstanceId = newInstance.id; // Assign to outer scope variable
              fetchedToken = newInstance.token; // Assign to outer scope variable
              // Determine display name using top-level fields
              displayName = newInstance.profileName || newInstance.name || fetchedInstanceId || 'Unnamed Instance'; // Assign to outer scope variable
              console.log(`Found instance ${fetchedInstanceId} immediately.`);
              // Upsert logic moved after the if/else block
           }

           // Ensure variables were assigned before using them
           if (!fetchedInstanceId || !fetchedToken || !displayName) {
             throw new Error("Failed to determine necessary instance details (ID, Token, DisplayName) after creation/retry.");
           }

           // Proceed with upsert using the assigned variables
           console.log(`Upserting config for new instance ${fetchedInstanceId} with display name ${displayName}.`);
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
           toast({ title: "Configuration Saved", description: `Instance ${displayName} configured. Setting webhook...` });

           // --- BEGIN: Set Webhook after CREATION ---
           try {
             console.log(`[handleDirectCreateInstance] Attempting to set webhook for new instance ${displayName}...`);
             // Fetch the necessary webhook config again (URL and Events)
             const { data: webhookConfig, error: configError } = await supabase
               .from('integrations_config')
               .select('webhook_url, webhook_events') // Only need URL and events now
               .eq('integration_id', selectedIntegration.id)
               .single();

             if (configError) {
               throw new Error(`Failed to fetch webhook config for new instance: ${configError.message}`);
             }

             if (!webhookConfig?.webhook_url || !webhookConfig?.webhook_events) {
               console.warn("[handleDirectCreateInstance] Webhook URL or events missing in config. Skipping webhook setup for new instance.");
               toast({
                 title: "Webhook Setup Skipped",
                 description: "Webhook configuration details are incomplete for the new instance.",
                 variant: "default",
               });
             } else {
               // --- Added Log ---
               console.log("[handleDirectCreateInstance] Webhook events being set for new instance:", webhookConfig.webhook_events);
               // --- End Added Log ---

               const webhookSuccess = await setEvolutionWebhook(
                 selectedIntegration.id,
                  displayName, // Use the display name determined earlier
                  webhookConfig.webhook_url,
                  // --- Test: Hardcode only MESSAGES_UPSERT ---
                  ["MESSAGES_UPSERT"]
                  // webhookConfig.webhook_events // Original line commented out for testing
                );

                if (webhookSuccess) {
                 console.log("[handleDirectCreateInstance] Webhook set successfully for new instance.");
                 toast({ title: "Webhook Configured", description: "Webhook settings applied successfully for the new instance." });
               } else {
                 console.error("[handleDirectCreateInstance] Failed to set webhook via service for new instance.");
                 toast({ title: "Webhook Setup Failed", description: "Could not apply webhook settings automatically for the new instance.", variant: "destructive" });
               }
             }
           } catch (webhookError) {
             console.error("[handleDirectCreateInstance] Error during webhook setup for new instance:", webhookError);
             toast({
               title: "Webhook Setup Error",
               description: `An error occurred setting the webhook for the new instance: ${webhookError instanceof Error ? webhookError.message : String(webhookError)}`,
               variant: "destructive",
             });
           }
           // --- END: Set Webhook after CREATION ---


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
       // Use instance_display_name for the API call, as it corresponds to the {instanceName} in the path
       const instanceNameToDelete = config?.instance_display_name;
       if (!selectedIntegration?.id || !instanceNameToDelete) {
           toast({ title: "Error", description: "Integration or Instance Name missing.", variant: "destructive" });
           return;
       }
       setIsDeleteLoading(true);
       try {
           // Pass the correct name to the delete function
           const success = await deleteEvolutionInstance(instanceNameToDelete, selectedIntegration.id);
           if (success) {
               toast({ title: "Instance Deleted", description: `Instance ${instanceNameToDelete} successfully deleted.` });
              setInstanceDetails(null);
              // Invalidate queries to reflect deletion
              await queryClient.invalidateQueries({ queryKey: ['integrationsWithConfig'] });
              await queryClient.invalidateQueries({ queryKey: ['integration-config', selectedIntegration.id] });
               setNoInstanceFoundFromServer(true);
           } else {
               toast({ title: "Deletion Failed", description: `Could not delete instance ${instanceNameToDelete}.`, variant: "destructive" });
           }
       } catch (error) {
           console.error(`Error deleting instance ${instanceNameToDelete}:`, error);
          toast({
              title: "Deletion Error",
              description: `Failed to delete instance: ${error instanceof Error ? error.message : String(error)}`,
              variant: "destructive"
          });
      } finally {
          setIsDeleteLoading(false);
      }
  };
  // Removed the updateInstanceInformation function as it's obsolete with the current flow

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

  // Updated isConnected to use top-level connectionStatus
  const isConnected = (details: EvolutionInstance | null) => { // Use correct type
    // Assuming DisplayInstance still needs update or we cast/check properties directly
    // Let's cast to EvolutionInstance for type safety here, assuming DisplayInstance might be stale
    const evolutionDetails = details; // No need to cast anymore
    return evolutionDetails?.connectionStatus === 'open';
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
           No active WhatsApp instance was found for this integration. Please enter a name to create a new one.
         </p>
         <div className="w-full max-w-sm space-y-2">
            <Label htmlFor="newInstanceName">Instance Name</Label>
            <Input
              id="newInstanceName"
              type="text"
              placeholder="e.g., My Business WhatsApp"
              value={newInstanceName}
              onChange={(e) => setNewInstanceName(e.target.value)}
              className="text-center"
            />
         </div>
         <Button
           onClick={handleDirectCreateInstance}
           variant="default"
           // Disable if creating, loading config, or if name is empty
           disabled={isCreating || isConfigLoading || !newInstanceName.trim()}
         >
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
                            // Use top-level 'name' for logout, assuming 'name' is the instance name used by API
                            onClick={() => instanceDetails?.name && handleLogout(instanceDetails.name)}
                            disabled={!instanceDetails?.name || isLogoutLoading === instanceDetails.name}
                            title="Disconnect"
                          >
                            {isLogoutLoading === instanceDetails?.name ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <X className="h-4 w-4 text-gray-400 hover:text-red-500" />
                            )}
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-end space-x-2">
                          <Button // Reconstruct the Button tag correctly
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
