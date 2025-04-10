import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus } from "lucide-react";
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { IntegrationDialog } from "./integration-dialog/IntegrationDialog";
import { IntegrationCard } from "./integration-card/IntegrationCard";
import type { Integration, ConnectionState } from "./types";
import { useToast } from "@/hooks/use-toast";
import { checkInstanceStatus } from "@/integrations/evolution-api/services/instanceStatusService";

interface IntegrationsViewProps {
  isActive: boolean; // Prop to control loading
}

const tabs = ["All", "Connected"];

export function IntegrationsView({ isActive }: IntegrationsViewProps) {
  const [activeTab, setActiveTab] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedIntegration, setSelectedIntegration] = useState<Integration | null>(null);
  const { toast } = useToast();

  // Fetch integrations joined with config, including the new status field
  const { data: integrations = [], isLoading, refetch } = useQuery({
    queryKey: ['integrationsWithConfig'],
    queryFn: async () => {
      console.log("Fetching integrations joined with config...");
      const { data, error } = await supabase
        .from('integrations')
        .select(`
          *,
          integrations_config (
            instance_id,
            token,
            connection_status
          )
        `)
        .order('name');

      if (error) {
        console.error("Error fetching joined integrations:", error);
        throw error;
      }

      // Define a type for the joined data structure
      type JoinedIntegrationData = Integration & {
        integrations_config?: {
          instance_id?: string;
          token?: string;
          connection_status?: string;
        } | null | Array<{
          instance_id?: string;
          token?: string;
          connection_status?: string;
        }>;
      };

      // Process the data: flatten the structure and ensure types
      const processedData = data.map((item: any) => {
        // Cast item to any to avoid type conflicts
        const config = Array.isArray(item.integrations_config)
          ? item.integrations_config[0]
          : item.integrations_config;

        return {
          ...item,
          instance_id: config?.instance_id,
          token: config?.token,
          status: item.status || 'unknown',
          connectionStatus: (config?.connection_status as ConnectionState) || 'unknown',
          integrations_config: undefined,
          type: item.type || "messenger",
        } as Integration & { instance_id?: string; token?: string };
      });

      // Manually add WhatsApp Cloud API if not present
      const whatsappCloudApi: Integration = {
        id: "whatsapp-cloud-api",
        name: "WhatsApp Cloud API",
        description: "Connect your WhatsApp Business account through Facebook.",
        icon_url: "/lovable-uploads/8d699109-6446-4dd5-b026-f2f32a953f05.png",
        status: "unknown",
        base_url: "https://api.evoapicloud.com",
        type: "messenger"
      };

      const hasWhatsAppCloudApi = processedData.some(integration =>
        integration.name === "WhatsApp Cloud API"
      );

      return hasWhatsAppCloudApi ? processedData : [...processedData, whatsappCloudApi];
    },
    enabled: isActive,
  });

  // This function checks status, updates DB, and triggers refetch
  const updateAndRefreshStatus = async (integration: Integration & { instance_id?: string; token?: string }) => {
    let finalStatus: ConnectionState = 'unknown';
    const { id: integrationId, instance_id, token, base_url } = integration;

    if (!integrationId) {
      console.error("Integration ID missing, cannot update status.");
      return;
    }

    try {
      if (instance_id && token && base_url) {
        console.log(`Checking status for instance ${instance_id} (Integration: ${integrationId})...`);
        finalStatus = await checkInstanceStatus(instance_id, token, base_url);
        console.log(`Status check result for ${instance_id}: ${finalStatus}`);
      } else {
        console.log(`Cannot check status for integration ${integrationId}. Missing instanceId, token, or baseUrl.`);
        finalStatus = 'unknown';
      }

      // Update the status in the integrations_config table
      console.log(`Updating status in DB for integration ${integrationId} to ${finalStatus}...`);
      // Update the 'connection_status' column instead of 'status'
      const { error: updateError } = await supabase
        .from('integrations_config')
        .update({ connection_status: finalStatus as string })
        .eq('integration_id', integrationId);

      if (updateError) {
        console.error(`Error updating status in DB for ${integrationId}:`, updateError);
        toast({ title: "DB Update Error", description: `Failed to save status: ${updateError.message}`, variant: "destructive" });
      } else {
        console.log(`Successfully updated status in DB for ${integrationId}.`);
        refetch();
      }

    } catch (error) {
      console.error(`Error during updateAndRefreshStatus for ${integrationId}:`, error);
      finalStatus = 'unknown';
    }
  };

  const connectWhatsApp = async (integration: Integration & { instance_id?: string; token?: string }) => {
    setSelectedIntegration(integration);

    // Use connectionStatus for logic
    const currentConnectionStatus = integration.connectionStatus || 'unknown';
    const instanceId = integration.instance_id;

    console.log(`ConnectWhatsApp called for ${integration.name}. Current connection status: ${currentConnectionStatus}, Instance ID: ${instanceId}`);

    // Optional: Trigger a fresh status check and update before proceeding
    // await updateAndRefreshStatus(integration);
    // Note: updateAndRefreshStatus triggers refetch, might cause UI flicker.
    // Decide if check is needed here or rely on fetched status. Let's rely on fetched connectionStatus.

    if (currentConnectionStatus === 'open') {
        toast({
            title: "Already Connected",
            description: `WhatsApp instance for ${integration.name} is already connected (Status: ${currentConnectionStatus}).`,
        });
        // Optionally trigger a background status update if needed
        // updateAndRefreshStatus(integration);
        return; // Already connected, do nothing more
    }

    // If not 'open', proceed with connection attempt logic
    toast({
      title: "Connecting WhatsApp...",
      description: `Status is ${currentConnectionStatus}. Attempting to guide connection.`,
    });

    // Use the instanceId fetched from the main query
    if (!instanceId) {
      console.log(`No instance_id configured for integration ${integration.id}.`);
      toast({ title: "Configuration Needed", description: "WhatsApp instance name not found in configuration.", variant: "destructive" });
      setDialogOpen(true); // Open dialog for configuration
      return;
    }

    // Instance ID exists, but connectionStatus is not 'open'
    console.log(`Instance ID ${instanceId} found. Current connection status: ${currentConnectionStatus}. Opening dialog.`);

    // Store instance ID locally if needed for the dialog component
    localStorage.setItem('instanceID', instanceId);

    toast({
        title: "Connection Needed",
        description: `Instance ${instanceId} found but status is ${currentConnectionStatus}. Please follow instructions in the dialog.`,
    });
    setDialogOpen(true); // Open dialog to guide connection/show QR etc.

    // Removed the separate config fetch try-catch block as config is now part of the main query result
  };

  const handleIntegrationClick = async (integration: Integration) => {
    // Cast to include potential instance_id and token from the joined query result
    const fullIntegrationData = integration as Integration & { instance_id?: string; token?: string };

    setSelectedIntegration(fullIntegrationData); // Store potentially richer data

    if (integration.name === "WhatsApp" || integration.name === "WhatsApp Cloud API") {
      // Pass the full data including instance_id and token if available
      await connectWhatsApp(fullIntegrationData);
    } else {
      // For other integrations, just open the dialog
      setDialogOpen(true);
    }
  };

  const handleDialogClose = (/* connected: boolean */) => {
    setDialogOpen(false);
    // Trigger a status refresh for the selected integration when dialog closes
    if (selectedIntegration) {
       const fullIntegrationData = selectedIntegration as Integration & { instance_id?: string; token?: string };
       updateAndRefreshStatus(fullIntegrationData);
    }
    // Optionally refetch all integrations: refetch();
  };

  // Map integrations and merge with dynamic status from state
  const integrationsList = integrations.map(integration => ({
    ...integration,
    type: integration.type || "messenger"
  }));

  const filteredIntegrations = integrationsList.filter(integration => {
    const matchesSearch = integration.name.toLowerCase().includes(searchQuery.toLowerCase());
    if (activeTab === "Connected") {
      return matchesSearch && integration.connectionStatus === 'open';
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
