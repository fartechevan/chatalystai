
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

const tabs = ["All", "Connected"];

export function IntegrationsView() {
  const [activeTab, setActiveTab] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedIntegration, setSelectedIntegration] = useState<Integration | null>(null);
  const [connectedIntegrations, setConnectedIntegrations] = useState<Record<string, boolean>>({});
  const { toast } = useToast();

  const { data: integrations = [], isLoading, refetch } = useQuery({
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

  useEffect(() => {
    // Check connected integrations from local storage or API
    const checkConnectionStatus = async () => {
      try {
        // For WhatsApp, check the connection status
        const { data, error } = await supabase
          .from('integrations_config')
          .select('id, integration_id, instance_id');
          
        if (error) throw error;
        
        // Get connection states for each configuration
        const connected: Record<string, boolean> = {};
        
        for (const config of data) {
          if (!config.instance_id) {
            connected[config.integration_id] = false;
            continue;
          }
          
          // Default to not connected
          connected[config.integration_id] = false;
          
          try {
            // Use the supabase edge function to check status
            const { data: instancesData, error } = await supabase.functions.invoke('integrations', {
              method: 'GET'
            });
            
            if (error) {
              console.error('Error fetching WhatsApp connection status:', error);
              continue;
            }
            
            if (Array.isArray(instancesData)) {
              const isAnyInstanceConnected = instancesData.some(item => 
                item.connectionStatus === 'open' && item.id === config.instance_id
              );
              
              if (isAnyInstanceConnected) {
                connected[config.integration_id] = true;
              }
            }
          } catch (fetchError) {
            console.error('Error fetching WhatsApp connection status:', fetchError);
          }
        }
        
        setConnectedIntegrations(connected);
      } catch (error) {
        console.error('Error checking connection status:', error);
      }
    };
    
    checkConnectionStatus();
  }, [dialogOpen]); // Re-check when dialog is closed

  const handleIntegrationClick = async (integration: Integration) => {
    // Set selected integration
    setSelectedIntegration(integration);
    
    // For WhatsApp integrations, fetch instances before opening dialog
    if (integration.name === "WhatsApp") {
      try {
        toast({
          title: "Checking WhatsApp connection...",
          description: "Fetching WhatsApp instances and checking connection status",
        });
        
        // Fetch instances and save to database with integration ID
        const { data, error } = await supabase.functions.invoke("integrations", {
          path: "/instance/fetchInstances",
          query: { integration_id: integration.id }
        });
        
        if (error) {
          console.error('Error fetching WhatsApp instances:', error);
          toast({
            title: "Connection Error",
            description: "Could not fetch WhatsApp instances",
            variant: "destructive"
          });
        } else {
          console.log('WhatsApp instances fetched successfully:', data);
          
          // Check if any instance is connected
          const hasConnectedInstance = Array.isArray(data) && data.some(
            instance => instance.connectionStatus === 'open' || instance.status === 'open'
          );
          
          if (hasConnectedInstance) {
            toast({
              title: "WhatsApp Connected",
              description: "Found connected WhatsApp instance",
            });
            
            // Update connected status
            setConnectedIntegrations(prev => ({
              ...prev,
              [integration.id]: true
            }));
          }
        }
      } catch (error) {
        console.error('Error in handleIntegrationClick:', error);
      }
    }
    
    // Open the dialog
    setDialogOpen(true);
  };

  const handleDialogClose = (connected: boolean) => {
    setDialogOpen(false);
    if (connected && selectedIntegration) {
      // Update the connected status
      setConnectedIntegrations(prev => ({
        ...prev,
        [selectedIntegration.id]: true
      }));
      
      // Refresh the integrations list
      refetch();
    }
  };

  const integrationsList = integrations.map(integration => ({
    ...integration,
    is_connected: connectedIntegrations[integration.id] || false
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
