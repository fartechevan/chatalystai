import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus } from "lucide-react";
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { IntegrationDialog } from "./integration-dialog/IntegrationDialog";
import { IntegrationCard } from "./integration-card/IntegrationCard";
import type { Integration } from "./types";
import { useToast } from "@/hooks/use-toast";
// Import the service to check a specific instance's status
import checkInstanceStatus from "./integration-dialog/hooks/whatsapp/services/checkInstanceStatusService";
// Import the getEvolutionApiKey function instead of the hardcoded key
import { getEvolutionApiKey } from "./integration-dialog/hooks/whatsapp/services/config";

interface IntegrationsViewProps {
  isActive: boolean; // Prop to control loading
}

const tabs = ["All", "Connected"];

export function IntegrationsView({ isActive }: IntegrationsViewProps) {
  const [activeTab, setActiveTab] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedIntegration, setSelectedIntegration] = useState<Integration | null>(null);
  const [connectedIntegrations, setConnectedIntegrations] = useState<Record<string, boolean>>({});
  const { toast } = useToast();

  const { data: integrations = [], isLoading, refetch } = useQuery({
    queryKey: ['integrations'],
    queryFn: async () => {
      console.log("Fetching integrations data..."); // Log when query actually runs
      interface RawIntegrationData {
        id: string;
        name: string;
        type?: string;
        configuration?: Record<string, unknown>;
        created_at?: string;
        updated_at?: string;
        base_url?: string;
        provider?: string;
        category?: string;
        status?: string;
        icon?: string;
        icon_url?: string;
        description?: string;
        is_connected?: boolean;
      }

      const { data, error } = await supabase
        .from('integrations')
        .select('*')
        .order('name');

      if (error) throw error;

      const typedData = (data as RawIntegrationData[]).map(item => ({
        ...item,
        type: item.type || "messenger"
      })) as Integration[];

      const whatsappCloudApi: Integration = {
        id: "whatsapp-cloud-api",
        name: "WhatsApp Cloud API",
        description: "Connect your WhatsApp Business account through Facebook.",
        icon_url: "/lovable-uploads/8d699109-6446-4dd5-b026-f2f32a953f05.png",
        status: "available",
        is_connected: false,
        base_url: "https://api.evoapicloud.com",
        type: "messenger"
      };

      const hasWhatsAppCloudApi = typedData.some(integration =>
        integration.name === "WhatsApp Cloud API"
      );

      return hasWhatsAppCloudApi ? typedData : [...typedData, whatsappCloudApi];
    },
    enabled: isActive, // Only run query when the component is active
  });

  // Function to check connection status using Supabase config and new service
  const checkAndUpdateConnectionStatus = async (integrationId: string): Promise<boolean> => {
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
    } finally {
      setConnectedIntegrations(prev => ({
        ...prev,
        [integrationId]: isConnected
      }));
    }
    return isConnected;
  };

  // REMOVED useEffect hooks that automatically checked status on load/dialog close.
  // Status will now only be checked on click.


  // Function to handle the connection process for WhatsApp (will now also check status)
  const connectWhatsApp = async (integration: Integration) => {
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
  };

  // Handles clicking on an integration card
  const handleIntegrationClick = async (integration: Integration) => {
    setSelectedIntegration(integration);
    if (integration.name === "WhatsApp" || integration.name === "WhatsApp Cloud API") {
      await connectWhatsApp(integration);
    } else {
      setDialogOpen(true);
    }
  };

  // Handles closing the dialog
  const handleDialogClose = (/* connected: boolean */) => {
    setDialogOpen(false);
  };

  // Prepare the list for display
  const integrationsList = integrations.map(integration => ({
    ...integration,
    is_connected: connectedIntegrations[integration.id] || false,
    type: integration.type || "messenger"
  }));

  // Filter based on search query and active tab
  const filteredIntegrations = integrationsList.filter(integration => {
    const matchesSearch = integration.name.toLowerCase().includes(searchQuery.toLowerCase());
    if (activeTab === "Connected") {
      return matchesSearch && integration.is_connected;
    }
    return matchesSearch;
  });

  // Render the component
  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <IntegrationDialog
        open={dialogOpen}
        onOpenChange={handleDialogClose}
        selectedIntegration={selectedIntegration}
      />

      <div className="flex items-center justify-between">
        <Input
          placeholder="Search"
          className="max-w-sm"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            WEB HOOKS
          </Button>
          <Button size="sm">
            <Plus className="h-4 w-4 mr-2" />
            CREATE INTEGRATION
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-4 border-b">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              activeTab === tab
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab === "Connected" && (
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-green-500" />
                {tab}
              </div>
            )}
            {tab !== "Connected" && tab}
          </button>
        ))}
      </div>

      <div className="space-y-6">
        <h2 className="text-lg font-semibold">Messengers</h2>
        {isLoading ? (
          <div className="text-center text-muted-foreground">Loading integrations...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {filteredIntegrations.map((integration) => (
              <IntegrationCard
                key={integration.id}
                integration={integration}
                onConnect={handleIntegrationClick}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
