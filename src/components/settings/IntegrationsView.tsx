import { ShieldAlert } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Integration, ConnectionState, PlanDetails, DBIntegrationType, DBUserIntegrationConfig, ProcessedIntegration } from "./types"; // Added new types
import { IntegrationDialog } from "./integration-dialog/IntegrationDialog";
import { IntegrationCard } from "./integration-card/IntegrationCard";
import { useToast } from "@/hooks/use-toast";
import { checkInstanceStatus } from "@/integrations/evolution-api/services/instanceStatusService";
import { useAuth } from "@/components/auth/AuthProvider";
import { useSettingsSearch } from "@/context/SettingsSearchContext";

interface IntegrationsViewProps {
  isActive: boolean;
}

// Removed local definitions of DBIntegrationType, DBUserIntegrationConfig, ProcessedIntegration as they are now imported from ./types

export function IntegrationsView({ isActive }: IntegrationsViewProps) {
  const [activeTab, setActiveTab] = useState("all");
  const { searchQuery } = useSettingsSearch();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedIntegration, setSelectedIntegration] = useState<ProcessedIntegration | null>(null);
  const { toast } = useToast();
  const { user: authUser } = useAuth();

  // Fetch all available integration types (global list)
  const { data: availableIntegrationTypes = [], isLoading: isLoadingIntegrationTypes } = useQuery<DBIntegrationType[]>({
    queryKey: ['availableIntegrationTypes'],
    queryFn: async () => {
      const { data, error } = await supabase.from('integrations').select('*').order('name');
      if (error) throw error;
      return data || [];
    },
    enabled: isActive,
  });

  // Fetch current user's specific integration configurations
  const { data: userIntegrationConfigs = [], isLoading: isLoadingUserConfigs, refetch: refetchUserConfigs } = useQuery<DBUserIntegrationConfig[]>({
    queryKey: ['userIntegrationConfigs', authUser?.id],
    queryFn: async () => {
      if (!authUser?.id) return [];
      const { data, error } = await supabase
        .from('integrations_config')
        .select('*')
        .eq('profile_id', authUser.id);
      if (error) throw error;
      return data || [];
    },
    enabled: !!authUser?.id && isActive,
  });

  // Combine available types with the user's configurations
  const processedIntegrations = useMemo((): ProcessedIntegration[] => {
    const mappedIntegrations = availableIntegrationTypes.map((integrationType: DBIntegrationType): ProcessedIntegration => {
      const userConfig: DBUserIntegrationConfig | undefined = userIntegrationConfigs.find(config => config.integration_id === integrationType.id);
      return {
        id: integrationType.id,
        name: integrationType.name,
        type: integrationType.type || "messenger", // Ensure default for type
        description: integrationType.description,
        base_url: integrationType.base_url,
        icon_url: integrationType.icon_url,
        status: integrationType.status || 'unknown', // Status of the integration type itself
        connectionStatus: userConfig?.status as ConnectionState || 'unknown', // Status from user's config
        user_config_id: userConfig?.id,
        instance_id: userConfig?.instance_id,
        token: userConfig?.token,
        connectedInstances: userConfig ? 1 : 0,
      };
    });
    return mappedIntegrations as ProcessedIntegration[]; // Explicit cast
  }, [availableIntegrationTypes, userIntegrationConfigs]);

  const refetchAll = async () => {
    await refetchUserConfigs();
    // queryClient.invalidateQueries(['availableIntegrationTypes']) // If types can change
  };

  const updateAndRefreshStatus = async (integration: ProcessedIntegration) => {
    if (!integration.user_config_id || !authUser?.id) {
      console.log("No user config to update status for or user not authenticated.");
      await refetchAll();
      return;
    }

    let finalStatus: ConnectionState = 'unknown';
    try {
      if (integration.instance_id && integration.token && integration.base_url) {
        finalStatus = await checkInstanceStatus(integration.instance_id, integration.id);
      }

      const { error: updateError } = await supabase
        .from('integrations_config')
        .update({ status: finalStatus })
        .eq('id', integration.user_config_id)
        .eq('profile_id', authUser.id); // Ensure RLS would also catch this

      if (updateError) throw updateError;
      await refetchAll();
    } catch (error) {
      console.error("Error updating status:", error);
      toast({ title: "Error", description: "Failed to update integration status.", variant: "destructive" });
    }
  };
  
  const handleIntegrationClick = async (integration: ProcessedIntegration) => {
    setSelectedIntegration(integration);
    // Simplified: directly open dialog. Limit logic removed for now.
    // If it's WhatsApp and not configured, dialog will guide.
    setDialogOpen(true);
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    if (selectedIntegration) {
       updateAndRefreshStatus(selectedIntegration);
    }
  };

  const filteredIntegrations = useMemo(() => {
    return processedIntegrations.filter(integration => {
      const matchesSearch = integration.name.toLowerCase().includes(searchQuery.toLowerCase());
      if (activeTab === "connected") {
        return matchesSearch && integration.user_config_id && integration.connectionStatus === 'open';
      }
      return matchesSearch;
    });
  }, [processedIntegrations, searchQuery, activeTab]);

  const isLoading = isLoadingIntegrationTypes || isLoadingUserConfigs;

  // Simplified limit display - assuming unlimited for now
  const userConnectedCount = userIntegrationConfigs.length;
  const userMaxAllowed = "Unlimited";

  return (
    <div className="space-y-8">
      <IntegrationDialog
        open={dialogOpen}
        onOpenChange={handleDialogClose}
        selectedIntegration={selectedIntegration}
        profileId={authUser?.id} // Pass profileId for new configs
        // currentPlan is removed, dialog needs to handle this if plan logic is reintroduced
      />

      <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-8">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="connected">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-green-500" />
              Connected
            </div>
          </TabsTrigger>
        </TabsList>
        
        <div className="mb-4 text-sm text-muted-foreground">
          Your Connections: {userConnectedCount} / {userMaxAllowed}
        </div>

        <TabsContent value="all" className="mt-0">
          <h2 className="text-lg font-semibold mb-6">Available Integrations</h2>
          {isLoading ? (
            <div className="text-center text-muted-foreground py-8">Loading integrations...</div>
          ) : filteredIntegrations.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {filteredIntegrations.map((integration) => (
                <IntegrationCard
                  key={integration.id} // Use integration type ID as key
                  integration={integration}
                  onConnect={() => handleIntegrationClick(integration)}
                  connectedCount={integration.connectedInstances} // 0 or 1
                  limit={'Unlimited'} // Simplified
                  disabled={false} // Simplified
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground flex flex-col items-center gap-2">
              <ShieldAlert className="h-6 w-6" />
              <span>No integrations found.</span>
            </div>
          )}
        </TabsContent>
        <TabsContent value="connected" className="mt-0">
           <h2 className="text-lg font-semibold mb-6">Your Connected Integrations</h2>
           {isLoading ? (
             <div className="text-center text-muted-foreground py-8">Loading integrations...</div>
           ) : filteredIntegrations.length > 0 ? ( // This tab already filters for connected
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
               {filteredIntegrations.map((integration) => (
                  <IntegrationCard
                    key={integration.id}
                    integration={integration}
                    onConnect={() => handleIntegrationClick(integration)}
                    connectedCount={integration.connectedInstances}
                    limit={'Unlimited'}
                    disabled={false}
                  />
                ))}
             </div>
           ) : (
             <div className="text-center py-8 text-muted-foreground flex flex-col items-center gap-2">
               <ShieldAlert className="h-6 w-6" />
               <span>No connected integrations found.</span>
             </div>
           )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
