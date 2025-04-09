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
// Import only the function, InstanceMetadata is no longer exported/used here
import { createEvolutionInstance } from "@/integrations/evolution-api/services/createInstanceService";
// import { WHATSAPP_INSTANCE } from "@/integrations/evolution-api/services/config"; // Unused


interface WhatsAppBusinessSettingsProps {
  selectedIntegration: Integration | null;
  onConnect: () => void;
}

// Define type to match the EvolutionInstance structure from the service response
// Also include potential top-level 'id' and 'token' fields based on usage
interface InstanceData {
  id?: string; // Add optional top-level ID field
  token?: string; // Add optional top-level token field
  instance: {
    instanceName: string; // This is the ID/Name used for operations
    status: 'open' | 'connecting' | 'close' | 'qrcode' | 'syncing'; // Connection status
    owner?: string; // Typically the phone number
    profileName?: string;
    profilePictureUrl?: string;
    // Add other relevant fields from the API response if needed
  };
  // Add other top-level properties if the API returns them outside 'instance'
}


// Type for the state holding the relevant instance data
type DisplayInstance = InstanceData; // State holds one of these objects

export function WhatsAppBusinessSettings({ selectedIntegration, onConnect }: WhatsAppBusinessSettingsProps) {
  const queryClient = useQueryClient(); // Initialize queryClient
  // Capture the full return object from useToast
  const toastUtils = useToast();
  const { toast } = toastUtils; // Keep destructuring for convenience if needed elsewhere
  // Get the config object which now includes instance_display_name
  const { config, isLoading: isConfigLoading } = useEvolutionApiConfig(selectedIntegration);

  // State holds the LIVE details of the configured instance (fetched for status check)
  const [instanceDetails, setInstanceDetails] = useState<DisplayInstance | null>(null);
  // Loading state for the LIVE fetch
  const [isFetchingLive, setIsFetchingLive] = useState(true);
  // Loading state for the logout action
  const [isLogoutLoading, setIsLogoutLoading] = useState<string | null>(null); // Track by instanceName
  // Loading state for the delete action
  const [isDeleteLoading, setIsDeleteLoading] = useState<boolean>(false);
  // Error state for the LIVE fetch
  const [loadError, setLoadError] = useState<string | null>(null);
  // State to indicate if the initial fetch found no instances on the server
  const [noInstanceFoundFromServer, setNoInstanceFoundFromServer] = useState(false);
  // Loading state for the create action
  const [isCreating, setIsCreating] = useState<boolean>(false);


  // Fetch configured WhatsApp instance details (primarily for live status and initial setup/config save)
  useEffect(() => {
    const fetchAndConfigureInstance = async () => { // Renamed for clarity
      if (!selectedIntegration?.id) {
        setIsFetchingLive(false); // Stop fetching if no integration
        setLoadError("No integration selected.");
        return;
      }

      setIsFetchingLive(true);
      setLoadError(null);
      setInstanceDetails(null); // Reset previous live details
      setNoInstanceFoundFromServer(false); // Reset flag on each fetch attempt

      try {
        // 1. Fetch all instances first
        console.log(`Fetching all instances for integration ${selectedIntegration.id}...`);
        const allInstancesResult = await fetchEvolutionInstances(selectedIntegration.id);

        // 2. Validate the result
        if (!Array.isArray(allInstancesResult)) {
            // Check if it's a non-null object first
            if (allInstancesResult !== null && typeof allInstancesResult === 'object') {
                // Now check if it has the 'error' property
                if ('error' in allInstancesResult) {
                    const errorResult = allInstancesResult as { error: string; details?: string };
                    console.error('Error fetching instances list:', errorResult.error, errorResult.details);
                    throw new Error(errorResult.error || 'Failed to fetch instances list.');
                } else {
                    // Handle object without 'error' property
                    console.error('Received unexpected object format from fetchInstances:', allInstancesResult);
                    throw new Error('Received unexpected object format when fetching instances.');
                }
            } else {
                // Handle null, undefined, or other non-object types
                console.error('Unexpected non-array/non-object response from fetchInstances:', allInstancesResult);
                throw new Error('Received unexpected data format when fetching instances.');
            }
        }

        // If we reach here, allInstancesResult is confirmed to be a valid array
        console.log("Successfully fetched instances array:", allInstancesResult);

        // Check if the array is empty
        if (allInstancesResult.length === 0) {
            console.log("No instances found on the server for this integration.");
            setNoInstanceFoundFromServer(true);
            // Clear any potentially stale config in the DB? Optional, maybe risky.
            // For now, just set the flag and stop processing this effect.
            setIsFetchingLive(false); // Mark fetch as complete
            return; // Stop here, let the UI show the "Connect" state
        }


        // 3. Select the instance (assuming the first one if multiple exist)
        const targetInstance = (allInstancesResult as InstanceData[])[0];

        // This check might be redundant now if empty array is handled above, but keep for safety
        if (!targetInstance || !targetInstance.id) {
          console.error('First instance found has no ID.');
          setLoadError("Valid WhatsApp instance details could not be retrieved.");
          setIsFetchingLive(false); // Mark fetch as complete
          return;
        }

        const fetchedInstanceId = targetInstance.id;
        console.log(`Selected instance ID: ${fetchedInstanceId}. Determining display name and upserting to config...`);

        // 4. Determine the display name
        const displayName = targetInstance.instance?.profileName || targetInstance.instance?.instanceName || fetchedInstanceId || 'Unnamed Instance';
        console.log(`Determined display name: ${displayName}`);

        // 5. Upsert the fetched instance ID, token, AND display name into integrations_config
        const { error: upsertError } = await supabase
          .from('integrations_config')
          .upsert(
            {
              integration_id: selectedIntegration.id,
              instance_id: fetchedInstanceId,
              token: targetInstance.token, // Add the token from the fetched instance
              instance_display_name: displayName // Add the determined display name
            },
            { onConflict: 'integration_id' } // Update if integration_id already exists
          );

        if (upsertError) {
          console.error(`Error upserting instance_id ${fetchedInstanceId} for integration ${selectedIntegration.id}:`, upsertError);
          throw new Error(`Failed to save instance configuration: ${upsertError.message}`);
        }

        console.log(`Successfully upserted instance ID ${fetchedInstanceId} and display name ${displayName} into config.`);

        // 6. Set state with the LIVE details of the selected instance (for status check)
        console.log("Setting LIVE instance details state:", targetInstance);
        setInstanceDetails(targetInstance); // Set the whole object for live status

        // 7. Save the selected instance object to localStorage (optional, consider if needed)
        // console.log(`[DEBUG] Attempting to save to localStorage with key ${WHATSAPP_INSTANCE}:`, targetInstance);
        // try {
        //   localStorage.setItem(WHATSAPP_INSTANCE, JSON.stringify(targetInstance));
        //   console.log(`[DEBUG] Successfully saved full instance data to localStorage using key ${WHATSAPP_INSTANCE}.`);
        //   const retrievedData = localStorage.getItem(WHATSAPP_INSTANCE);
        //   console.log(`[DEBUG] Verification retrieve from localStorage:`, retrievedData ? JSON.parse(retrievedData) : 'null or empty');
        // } catch (storageError) {
        //   console.error(`[DEBUG] Error saving to localStorage:`, storageError);
        // }

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
        setIsFetchingLive(false); // Mark live fetch as complete
      }
    };

    fetchAndConfigureInstance(); // Corrected function name call
    // Dependency array: re-run if selectedIntegration changes.
    // We don't include 'toast' as it's stable from the hook.
    // We don't include 'config' because this effect is for *fetching live data* and *setting* the config,
    // not reacting to config changes. Reacting to config changes is handled by the component re-rendering when `useEvolutionApiConfig` provides new data.
  }, [selectedIntegration?.id]);

  // Handle logout of WhatsApp instance
  const handleLogout = async (instanceName: string) => {
    if (!selectedIntegration?.id || !instanceName) return;

    setIsLogoutLoading(instanceName);

    try {
      // Pass instanceName and integrationId
      const success = await logoutWhatsAppInstance(
        instanceName,
        selectedIntegration.id, // Pass integration ID here
        () => {
          // On success, clear the instance details from state
          setInstanceDetails(null);
          // Optionally, trigger a refresh or update connection status in IntegrationsView
           toast({ title: "Disconnected", description: `Instance ${instanceName} disconnected.` });
         },
         // Pass the full useToast object under the 'toast' key within the options object
         { toast: toastUtils }
       );

       if (success === false) { // Check explicit false if the service returns boolean
        console.error(`Failed to logout WhatsApp instance ${instanceName}`);
        // Toast might be handled within the service, otherwise add one here
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

  // Handle creation of a new WhatsApp instance
  const handleCreateInstance = async () => {
    // Only check for selectedIntegration and its ID, as configuration might not exist yet
    if (!selectedIntegration?.id) {
      toast({
        title: "Error",
        description: "Integration details are missing.",
        variant: "destructive",
      });
      return;
    }

    // Construct the metadata needed for the API call from selectedIntegration properties
    const instanceName = selectedIntegration.name || `Instance_${selectedIntegration.id.substring(0, 8)}`; // Default name if needed
    // Explicitly set the integration type expected by the API
    const integrationType = "WHATSAPP-BAILEYS"; // Use the specific type from API example

    // Validate the constructed/derived values
    if (!instanceName || !integrationType) {
       toast({
         title: "Error",
         description: "Required integration details (name) could not be determined.", // Updated error message
         variant: "destructive",
       });
       return;
    }

    // Construct the metadata object for the service call using the correct integration type
    // No specific type annotation needed as createEvolutionInstance now accepts Record<string, any>
    const metadataToCreate = {
        instanceName: instanceName,
        integration: integrationType, // Use the explicitly set type
        qrcode: true, // Default based on API example
    };


    setIsCreating(true);
    try {
      // Call the creation service with integration ID and the constructed metadata
      const creationResponse = await createEvolutionInstance(selectedIntegration.id, metadataToCreate);

      toast({
        title: "Instance Creation Initiated",
        // Adjust message based on whether QR code is expected/returned
        description: `Instance ${creationResponse.instance?.instanceName || 'new instance'} is being created. ${creationResponse.qrcode?.base64 || creationResponse.qrcode?.pairingCode || creationResponse.pairingCode ? 'Scan the QR code if prompted.' : ''}`,
      });

      // Invalidate queries to refetch config and potentially instance list/status
      await queryClient.invalidateQueries({ queryKey: ['integration-config', selectedIntegration.id] });
      await queryClient.invalidateQueries({ queryKey: ['evolution-instances', selectedIntegration.id] }); // Assuming this key is used elsewhere

      // TODO: Handle QR code display if necessary based on creationResponse.qrcode
      // This might involve calling the original onConnect prop to signal the parent dialog
      // onConnect(); // Call original onConnect if it handles QR display/dialog state

    } catch (error) {
      console.error("--- handleCreateInstance: Error creating instance:", error);
      toast({
        title: "Instance Creation Failed",
        description: `Could not create instance: ${error instanceof Error ? error.message : String(error)}`,
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  // Handle deletion of WhatsApp instance
  const handleDelete = async () => {
      // Get the actual instanceId (UUID) from the loaded config
      const instanceIdToDelete = config?.instance_id;

      if (!selectedIntegration?.id) {
          toast({ title: "Error", description: "Integration ID missing.", variant: "destructive" });
          return;
      }
      if (!instanceIdToDelete) {
          toast({ title: "Error", description: "Instance ID not found in configuration.", variant: "destructive" });
          return;
      }

      setIsDeleteLoading(true);
      try {
          // Pass the actual instanceId (UUID) to the delete service
          const success = await deleteEvolutionInstance(instanceIdToDelete, selectedIntegration.id);
          if (success) {
              toast({ title: "Instance Deleted", description: `Instance ${config?.instance_display_name || instanceIdToDelete} successfully deleted or already gone.` });
              // Clear local live state
              setInstanceDetails(null);
              // Invalidate the config query to force a refetch.
              // This should lead to fetchEvolutionInstances being called again (if the component logic triggers it),
              // finding no instance, and setting noInstanceFoundFromServer = true.
              await queryClient.invalidateQueries({ queryKey: ['integration-config', selectedIntegration.id] });
              // Also explicitly set the flag to potentially speed up UI update
              setNoInstanceFoundFromServer(true);
          } else {
              toast({ title: "Deletion Failed", description: `Could not delete instance ${config?.instance_display_name || instanceIdToDelete}. Check server logs.`, variant: "destructive" });
          }
      } catch (error) {
          console.error(`Error deleting instance ${instanceIdToDelete}:`, error);
          toast({
              title: "Deletion Error",
              description: `Failed to delete instance ${config?.instance_display_name || instanceIdToDelete}: ${error instanceof Error ? error.message : String(error)}`,
              variant: "destructive"
          });
      } finally {
          setIsDeleteLoading(false);
      }
  };


  // Updated helper functions based on the actual DisplayInstance structure
  const getStatusIcon = (details: DisplayInstance | null) => {
    // Access status from the nested instance object
    const status = details?.instance?.status;
    const isConnected = status === 'open';

    return isConnected
      ? <CheckCircle className="h-5 w-5 text-green-500" />
      : <AlertCircle className="h-5 w-5 text-amber-500" />;
  };

  const isConnected = (details: DisplayInstance | null) => {
    // Access status from the nested instance object
    // Use the live instanceDetails for status check
    return instanceDetails?.instance?.status === 'open';
  };

  // Use combined loading state
  if (isConfigLoading || isFetchingLive) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Show error ONLY if fetching live details failed with an actual error (not just empty array)
  if (loadError) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4 p-4 text-center">
        <AlertCircle className="h-10 w-10 text-red-500" />
        <p className="text-red-600 font-medium">Error Checking Instance</p>
        <p className="text-sm text-gray-600">{loadError}</p>
        {/* Provide a way to retry fetching live status */}
         <Button onClick={() => window.location.reload()} variant="outline">Refresh Page</Button>
      </div>
    );
  }

   // If initial fetch completed and found no instances on the server
   if (noInstanceFoundFromServer) {
     return (
       <div className="flex flex-col items-center justify-center h-64 space-y-4 p-4 text-center">
         <PhoneCall className="h-10 w-10 text-muted-foreground" />
         <p className="text-lg font-medium">No Instance Found</p>
         <p className="text-muted-foreground text-center max-w-md">
           No active WhatsApp instance was found on the server for this integration.
         </p>
         {/* This button should now trigger the creation process */}
         <Button onClick={handleCreateInstance} variant="default" disabled={isCreating}>
           {isCreating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
           Create New Instance
         </Button>
       </div>
     );
   }

  // If loading finished, no errors, instances were found initially, but config is missing ID (fallback state)
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
            {/* Display based on the config fetched by useEvolutionApiConfig */}
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
                  {/* Use config.instance_id as the key */}
                  <TableRow key={config.instance_id}>
                    {/* Display the stored name from config */}
                    <TableCell className="font-medium">{config.instance_display_name || config.instance_id || 'N/A'}</TableCell>
                    <TableCell>
                      <select className="border rounded-md px-2 py-1">
                        <option>Default Pipeline</option>
                        {/* Add other pipeline options */}
                      </select>
                    </TableCell>
                    <TableCell>
                      {/* Conditional rendering for the cell content */}
                      {isConnected(instanceDetails) ? (
                        // Connected State: Icon + Disconnect Button
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
                        // Disconnected State: Connect Button + Delete Button
                        <div className="flex items-center justify-end space-x-2"> {/* Use justify-end and space-x */}
                          <Button
                            variant="outline" // Or default
                            size="sm"
                            // Revert onClick to call the original onConnect prop
                            onClick={onConnect}
                            // Disable only if deleting
                            disabled={isDeleteLoading}
                            title="Connect Instance"
                          >
                             {/* Remove spinner logic related to creation */}
                             Connect
                           </Button>
                           <Button
                             variant="destructive"
                            size="sm"
                            onClick={handleDelete} // Correct handler
                            disabled={isDeleteLoading}
                            title="Delete Instance"
                            className="h-6 w-6 p-0" // Match size
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
               // This case is handled by the "Not Configured" state above
               <p className="text-muted-foreground">Instance configuration not found.</p>
            )}
            {/* Removed "Add number" button as the flow focuses on the single configured instance */}
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
