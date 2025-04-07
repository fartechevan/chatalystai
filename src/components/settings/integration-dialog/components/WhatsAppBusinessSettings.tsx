
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { CheckCircle, Plus, AlertCircle, X, Loader2, PhoneCall } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { Integration } from "../../types";
import { logoutWhatsAppInstance } from "@/integrations/evolution-api/services/logoutService"; // Updated path
// Import the service to fetch all instances
import fetchInstances from "@/integrations/evolution-api/services/fetchInstancesService"; // Updated path
import { useEvolutionApiConfig } from "@/integrations/evolution-api/hooks/useEvolutionApiConfig"; // Updated path and hook name
import { WHATSAPP_INSTANCE } from "@/integrations/evolution-api/services/config"; // Updated path


interface WhatsAppBusinessSettingsProps {
  selectedIntegration: Integration | null;
  onConnect: () => void;
}

// Define type based on the actual API response structure provided
// It's an array of these objects
interface InstanceData {
  id: string;
  name: string; // This seems to be the identifier used previously as instanceName/instance_id
  token: string; // API Key/Token for this instance
  connectionStatus: string; // e.g., 'connecting', 'open', 'close'
  ownerJid?: string | null;
  profileName?: string | null;
  profilePicUrl?: string | null;
  number?: string; // Added based on example
  // Add other relevant fields from the provided example if needed
  // status?: string; // Alternative status field? Check API consistency
}


// Type for the state holding the relevant instance data
type DisplayInstance = InstanceData; // State holds one of these objects

export function WhatsAppBusinessSettings({ selectedIntegration, onConnect }: WhatsAppBusinessSettingsProps) {
  // State holds the details of the *configured* instance
  const [instanceDetails, setInstanceDetails] = useState<DisplayInstance | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLogoutLoading, setIsLogoutLoading] = useState<string | null>(null); // Track by instanceName
  const [loadError, setLoadError] = useState<string | null>(null);
  // Capture the full return object from useToast
  const toastUtils = useToast();
  const { toast } = toastUtils; // Keep destructuring for convenience if needed elsewhere
  const { config } = useEvolutionApiConfig(selectedIntegration); // Use updated hook name

  // Fetch configured WhatsApp instance details
  useEffect(() => {
    const fetchConfiguredInstance = async () => {
      if (!selectedIntegration?.id) {
        setIsLoading(false);
        setLoadError("No integration selected.");
        return;
      }

      setIsLoading(true);
      setLoadError(null);
      setInstanceDetails(null); // Reset previous details

      try {
        // 1. Fetch instance_id from Supabase config
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
          // This is not necessarily an error, just means not configured yet.
          setLoadError("WhatsApp integration is not configured yet."); // Informative message
          setIsLoading(false);
          return;
        }

        const instanceId = configData.instance_id;
        console.log(`Found instance ID: ${instanceId}. Fetching details...`);

        const instanceNameFromConfig = configData.instance_id; // Assuming instance_id in config matches instanceName in API
        console.log(`Found configured instance name: ${instanceNameFromConfig}. Fetching all instances to find details...`);

        // 2. Fetch all instances
        const allInstancesResult = await fetchInstances();

        // Check if the result is NOT an array (indicating an error object was returned)
        if (!Array.isArray(allInstancesResult)) {
          // Type assertion to help TypeScript understand it's the error object now
          const errorResult = allInstancesResult as { error: string }; 
          console.error('Error fetching instances list:', errorResult.error);
          throw new Error(errorResult.error || 'Failed to fetch instances list.');
        }
        
        // If we reach here, allInstancesResult is confirmed to be an array
        console.log("Successfully fetched instances array:", allInstancesResult);
        
        // Log all IDs received from the API for debugging
        const receivedIds = (allInstancesResult as InstanceData[]).map(item => item.id);
        console.log(`[DEBUG] IDs received from fetchInstances API:`, receivedIds);
        console.log(`[DEBUG] Searching for ID from Supabase config: ${instanceNameFromConfig}`);

        // 3. Find the matching instance in the array using the 'id' property
        // instanceNameFromConfig holds the ID fetched from Supabase config
        const matchingInstance = (allInstancesResult as InstanceData[]).find(
          item => item.id === instanceNameFromConfig // Match based on 'id'
        );

        if (!matchingInstance) {
          // Update error message to reflect searching by ID
          console.error(`Configured instance with ID '${instanceNameFromConfig}' not found in the fetched list.`); 
          throw new Error(`Configured instance with ID '${instanceNameFromConfig}' not found.`);
        }

        // Log the found configured instance response
        console.log("Found matching configured instance data:", matchingInstance);

        // 4. Set state with the details of the matching instance and save the object to localStorage
        console.log("Setting instance details:", matchingInstance);
        setInstanceDetails(matchingInstance); // Set the whole object
        // Save the entire matching instance object to localStorage
        // so other services like status checks can retrieve it and extract needed info.
        console.log(`[DEBUG] Attempting to save to localStorage with key ${WHATSAPP_INSTANCE}:`, matchingInstance); // Log object before saving
        try {
          localStorage.setItem(WHATSAPP_INSTANCE, JSON.stringify(matchingInstance)); // Store the found object directly
          console.log(`[DEBUG] Successfully saved full instance data to localStorage using key ${WHATSAPP_INSTANCE}.`);
          // Immediately try to retrieve and log to verify
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
  }, [selectedIntegration, toast]); // Re-run if integration changes

  // Handle logout of WhatsApp instance - use instanceName now
  const handleLogout = async (instanceName: string) => {
    if (!selectedIntegration || !instanceName) return;

    setIsLogoutLoading(instanceName);

    try {
      // Assuming logoutWhatsAppInstance takes instanceName
      const success = await logoutWhatsAppInstance(
        instanceName,
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
      setIsLogoutLoading(null); // Reset loading state
    }
  };

  // Updated helper functions based on the actual DisplayInstance structure
  const getStatusIcon = (details: DisplayInstance | null) => {
    // Use connectionStatus primarily, maybe fallback to status if needed and available
    const status = details?.connectionStatus; // Use connectionStatus from API response
    const isConnected = status === 'open';

    return isConnected
      ? <CheckCircle className="h-5 w-5 text-green-500" />
      : <AlertCircle className="h-5 w-5 text-amber-500" />;
  };

  const isConnected = (details: DisplayInstance | null) => {
    // Use connectionStatus primarily
    return details?.connectionStatus === 'open';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (loadError && !instanceDetails) { // Show error prominently if loading failed and no details are available
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4 p-4 text-center">
        <AlertCircle className="h-10 w-10 text-red-500" />
        <p className="text-red-600 font-medium">Error Loading Instance</p>
        <p className="text-sm text-gray-600">{loadError}</p>
        {/* Provide a way to retry fetching */}
        {/* <Button onClick={fetchConfiguredInstance}>Retry</Button> */}
         <Button onClick={() => window.location.reload()} variant="outline">Refresh Page</Button>
      </div>
    );
  }

  // If loading finished and still no instance details (e.g., not configured)
  if (!isLoading && !instanceDetails && !loadError) {
    // Display a message indicating it needs configuration or setup
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4 p-4 text-center">
        <PhoneCall className="h-10 w-10 text-muted-foreground" />
        <p className="text-lg font-medium">WhatsApp Instance Not Found</p>
        <p className="text-muted-foreground text-center max-w-md">
          The WhatsApp instance details could not be loaded. It might need to be configured first.
        </p>
        {/* Optionally link to configuration or provide refresh */}
         <Button onClick={() => window.location.reload()} variant="outline">Refresh</Button>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="space-y-4">
        <div className="space-y-4 mt-6">
          <h3 className="text-lg font-semibold">Configured Instance</h3>
          {/* Removed backup number text as we show only the configured one */}
          {/* <p className="text-gray-500">...</p> */}

          <div className="mt-8">
            {instanceDetails ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    {/* Add Number if available in InstanceDetails */}
                    {/* <TableHead>Number</TableHead> */}
                    <TableHead>Pipeline</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {/* Render the single instance using the correct state structure */}
                  <TableRow key={instanceDetails.id}> {/* Use instance id as key */}
                    {/* Use profileName or name as Name */}
                    <TableCell className="font-medium">{instanceDetails.profileName || instanceDetails.name}</TableCell>
                    {/* Add Number cell if data exists */}
                    {/* <TableCell>{instanceDetails.number || 'N/A'}</TableCell> */}
                    <TableCell>
                      {/* Pipeline selection - functionality might need review */}
                      <select className="border rounded-md px-2 py-1">
                        <option>Default Pipeline</option>
                        {/* Add other pipeline options */}
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
                            onClick={() => handleLogout(instanceDetails.name)} // Use name for logout
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
                             onClick={onConnect} // Use the prop passed from IntegrationDialog/IntegrationsView
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
               // This case should be handled by the loading/error/not found states above
               <p className="text-muted-foreground">Instance details not available.</p>
            )}

            {/* "Add number" button might be redundant if only one instance is configured/shown */}
            {/* <Button className="mt-4" variant="outline" onClick={onConnect}>
              <Plus className="h-4 w-4 mr-2" />
              Add number
            </Button> */}
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
