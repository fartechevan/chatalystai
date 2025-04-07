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
// Updated import path for checkInstanceStatus
import { checkInstanceStatus } from "@/integrations/evolution-api/services/instanceStatusService"; 
// Removed evolutionApiKey import as it's handled server-side

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

        // Call the refactored service which returns the state directly
        const connectionStateResult = await checkInstanceStatus(instanceId); 

        console.log(`Status check result for ${instanceId}: ${connectionStateResult}`);

        if (connectionStateResult === 'open') {
          console.log(`Instance ${instanceId} is connected.`);
          isConnected = true;
        } else {
          console.log(`Instance ${instanceId} is not connected (State: ${connectionStateResult}).`);
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

  const connectWhatsApp = async (integration: Integration) => {
    setSelectedIntegration(integration);

    // Removed API key check as it's handled server-side
    // if (!evolutionApiKey) { ... }

    const isCurrentlyConnected = await checkAndUpdateConnectionStatus(integration.id);

    if (isCurrentlyConnected) {
        toast({
            title: "Already Connected",
            description: `WhatsApp instance for ${integration.name} is already connected.`,
        });
        return;
    }

    toast({
      title: "Connecting WhatsApp...",
      description: "Instance not connected. Attempting to fetch configuration and guide connection.",
    });

    try {
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

      // Store only the instance ID locally if needed, API key is handled server-side
      console.log(`Storing instance ID for connection attempt: InstanceID=${instanceId}`);
      localStorage.setItem('instanceID', instanceId); 
      // localStorage.setItem('apiKey', evolutionApiKey); // Removed API key storage

      toast({
          title: "Connection Needed",
          description: `Instance ${instanceId} found but not connected. Please follow instructions in the dialog.`,
      });
      setDialogOpen(true);
    } catch (error) {
      console.error('Error during WhatsApp connection process:', error);
      toast({
        title: "Connection Error",
        description: `An unexpected error occurred: ${(error as Error).message}`,
        variant: "destructive",
      });
    }
  };

  const handleIntegrationClick = async (integration: Integration) => {
    setSelectedIntegration(integration);
    if (integration.name === "WhatsApp" || integration.name === "WhatsApp Cloud API") {
      await connectWhatsApp(integration);
    } else {
      setDialogOpen(true);
    }
  };

  const handleDialogClose = (/* connected: boolean */) => {
    setDialogOpen(false);
  };

  const integrationsList = integrations.map(integration => ({
    ...integration,
    is_connected: connectedIntegrations[integration.id] || false,
    type: integration.type || "messenger"
  }));

  const filteredIntegrations = integrationsList.filter(integration => {
    const matchesSearch = integration.name.toLowerCase().includes(searchQuery.toLowerCase());
    if (activeTab === "Connected") {
      return matchesSearch && integration.is_connected;
    }
    return matchesSearch;
  });

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
