
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus } from "lucide-react";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { IntegrationDialog } from "./integration-dialog/IntegrationDialog";
import { IntegrationCard } from "./integration-card/IntegrationCard";
import type { Integration } from "./types";

const tabs = ["All", "Inbox", "Automations", "Lead sources", "Connected"];

export function IntegrationsView() {
  const [activeTab, setActiveTab] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedIntegration, setSelectedIntegration] = useState<Integration | null>(null);

  const { data: integrations = [], isLoading } = useQuery({
    queryKey: ['integrations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('integrations')
        .select('*')
        .order('name');
      
      if (error) throw error;
      
      // Add WhatsApp Cloud API integration if not already in the database
      const whatsappCloudApi = {
        id: "whatsapp-cloud-api",
        name: "WhatsApp Cloud API",
        description: "Connect your WhatsApp Business account through Facebook.",
        icon_url: "/lovable-uploads/8d699109-6446-4dd5-b026-f2f32a953f05.png",
        status: "available",
        is_connected: false
      };
      
      const hasWhatsAppCloudApi = data.some(integration => 
        integration.name === "WhatsApp Cloud API"
      );
      
      return hasWhatsAppCloudApi 
        ? data as Integration[]
        : [...data, whatsappCloudApi] as Integration[];
    },
  });

  const handleIntegrationClick = (integration: Integration) => {
    setSelectedIntegration(integration);
    setDialogOpen(true);
  };

  const filteredIntegrations = integrations.filter(integration => {
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
        onOpenChange={setDialogOpen}
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
