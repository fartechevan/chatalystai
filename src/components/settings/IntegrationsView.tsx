
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { IntegrationDialog } from "./integration-dialog/IntegrationDialog";
import type { Integration } from "./types";
import { IntegrationSearch } from "./integrations/IntegrationSearch";
import { IntegrationTabs } from "./integrations/IntegrationTabs";
import { IntegrationGrid } from "./integrations/IntegrationGrid";
import { connectWhatsApp, checkAndUpdateConnectionStatus } from "./integrations/WhatsAppConnector";

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

  // Handles clicking on an integration card
  const handleIntegrationClick = async (integration: Integration) => {
    setSelectedIntegration(integration);
    if (integration.name === "WhatsApp" || integration.name === "WhatsApp Cloud API") {
      await connectWhatsApp(integration, setSelectedIntegration, setDialogOpen);
    } else {
      setDialogOpen(true);
    }
  };

  // Handles closing the dialog
  const handleDialogClose = () => {
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

      <IntegrationSearch 
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
      />

      <IntegrationTabs 
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        tabs={tabs}
      />

      <div className="space-y-6">
        <h2 className="text-lg font-semibold">Messengers</h2>
        <IntegrationGrid 
          integrations={filteredIntegrations}
          isLoading={isLoading}
          onIntegrationClick={handleIntegrationClick}
        />
      </div>
    </div>
  );
}
