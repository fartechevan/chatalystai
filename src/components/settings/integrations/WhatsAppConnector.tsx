import { toast } from "@/hooks/use-toast";
import { Integration } from "../types";
import { supabase } from "@/integrations/supabase/client";
import { getEvolutionApiKey } from "../integration-dialog/hooks/whatsapp/services/config";
import checkInstanceStatus from "../integration-dialog/hooks/whatsapp/services/checkInstanceStatusService";

export async function connectWhatsApp(
  integration: Integration,
  setSelectedIntegration: (integration: Integration) => void,
  setDialogOpen: (open: boolean) => void
) {
  setSelectedIntegration(integration);

  // API Key check is now implicitly handled by the service via config.ts
  // We might still want a check here to prevent unnecessary steps if the key isn't set *at all* in the config
  const apiKey = await getEvolutionApiKey();
  if (!apiKey) {
     toast({ title: "Configuration Error", description: "Evolution API Key is missing in the application configuration.", variant: "destructive" });
     return;
  }

  // Check connection status FIRST when clicking the card
  const isCurrentlyConnected = await checkAndUpdateConnectionStatus(integration.id);

  // If already connected, just show a success toast and maybe refresh data?
  // Or perhaps open the dialog anyway for management? Let's show a toast for now.
  if (isCurrentlyConnected) {
      toast({
          title: "Already Connected",
          description: `WhatsApp instance for ${integration.name} is already connected.`,
      });
      // Optionally open dialog here if management is needed even when connected
      // setSelectedIntegration(integration);
      // setDialogOpen(true);
      return; // Stop further connection attempt if already connected
  }

  // If not connected, proceed with the connection/configuration flow
  toast({
    title: "Connecting WhatsApp...",
    description: "Instance not connected. Attempting to fetch configuration and guide connection.",
  });

  try {
    // Fetch instance_id from Supabase config (This part might be redundant if checkAndUpdateConnectionStatus already did it, but let's keep for clarity)
    console.log(`Fetching config for integration ${integration.id}...`);
    const { data: configData, error: configError } = await supabase
      .from('integrations_config')
      .select('instance_id')
      .eq('integration_id', integration.id)
      .maybeSingle();

    if (configError) {
      console.error(`Error fetching config for integration ${integration.id}:`, configError);
      toast({ title: "Error", description: `Failed to fetch configuration: ${configError.message}`, variant: "destructive" });
      setDialogOpen(true);
      return;
    }

    if (!configData?.instance_id) {
      console.log(`No instance_id configured for integration ${integration.id}.`);
      toast({ title: "Configuration Needed", description: "WhatsApp instance name not found in configuration.", variant: "destructive" });
      setDialogOpen(true);
      return;
    }

    const instanceId = configData.instance_id;
    console.log(`Found instance ID: ${instanceId}. Configuration seems present.`);

    // No need to call checkInstanceStatus again here, checkAndUpdateConnectionStatus did it.
    // We know isCurrentlyConnected is false from the check above.

    // Store credentials (Supabase instance_id and API Key from config) - needed for dialog/polling
    console.log(`Storing credentials for connection attempt: InstanceID=${instanceId}, ApiKey=***`);
    localStorage.setItem('instanceID', instanceId);
    localStorage.setItem('apiKey', apiKey); // Store the key from config for dialog use

    // Since we know it's not connected, open the dialog to guide the user
    toast({
        title: "Connection Needed",
        description: `Instance ${instanceId} found but not connected. Please follow instructions in the dialog.`,
    });
    setDialogOpen(true); // Open the dialog for QR/Pairing code

  } catch (error) {
    console.error('Error during WhatsApp connection process:', error);
    toast({
      title: "Connection Error",
      description: `An unexpected error occurred: ${(error as Error).message}`,
      variant: "destructive",
    });
  }
}

// Function to check connection status using Supabase config and new service
export async function checkAndUpdateConnectionStatus(integrationId: string): Promise<boolean> {
  let isConnected = false;
  try {
    console.log(`Fetching config for integration ${integrationId} to check status...`);
    const { data: configData, error: configError } = await supabase
      .from('integrations_config')
      .select('instance_id')
      .eq('integration_id', integrationId)
      .maybeSingle();

    if (configError) {
      console.error(`Error fetching config for integration ${integrationId}:`, configError);
    } else if (configData?.instance_id) {
      const instanceId = configData.instance_id;
      console.log(`Checking status for instance ${instanceId} (Integration: ${integrationId})`);

      // Call service without API key (it gets it from config)
      const statusResult = await checkInstanceStatus(instanceId);

      // Type check and status validation
      if (statusResult && typeof statusResult === 'object' && 'state' in statusResult && !('error' in statusResult) && statusResult.state === 'open') {
        console.log(`Instance ${instanceId} is connected.`);
        isConnected = true;
      } else {
        const logMessage = (statusResult && typeof statusResult === 'object' && 'error' in statusResult) ? statusResult.error : `State: ${statusResult?.state}`;
        console.log(`Instance ${instanceId} is not connected or error occurred:`, logMessage);
        isConnected = false;
      }
    } else {
      console.log(`No instance_id configured for integration ${integrationId}. Cannot check status.`);
      isConnected = false;
    }
  } catch (error) {
    console.error(`Error in checkAndUpdateConnectionStatus for ${integrationId}:`, error);
    isConnected = false;
  }
  return isConnected;
}
