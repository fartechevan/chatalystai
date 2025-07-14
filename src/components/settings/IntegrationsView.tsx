import { ShieldAlert } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { ConnectionState, DBIntegrationType, DBUserIntegrationConfig, ProcessedIntegration } from "./types";
import { IntegrationDialog } from "./integration-dialog/IntegrationDialog";
import { IntegrationCard } from "./integration-card/IntegrationCard";
import { useToast } from "@/hooks/use-toast";
import { checkInstanceStatus } from "@/integrations/evolution-api/services/instanceStatusService";
import { useAuth } from "@/components/auth/AuthProvider";
import { useSettingsSearch } from "@/context/SettingsSearchContext";
import type { IntegrationsTabValue } from "@/components/dashboard/DashboardLayout";

// Define UserPlan interface, to reflect the actual field name from the plans table
interface UserPlan {
  integrations_allowed: number | null; 
}

const VALID_CONNECTION_STATES: ReadonlyArray<ConnectionState> = ['idle', 'connecting', 'open', 'close', 'unknown', 'qrcode', 'pairingCode'];

// Helper function to fetch user plan details
async function fetchUserPlanDetails(): Promise<UserPlan> {
  let determinedIntegrationsLimit: number | null = null; 

  try {
    const { data: subscriptionData, error: subscriptionError } = await supabase
      .from('subscriptions')
      .select('plan_id, status')
      .in('status', ['active', 'trialing'])
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (subscriptionError) {
      if (subscriptionError.code !== 'PGRST116') { // PGRST116 means no rows found, which is acceptable
        console.error('[IntegrationsView DEBUG] Error fetching subscription:', subscriptionError);
      }
    } else if (!subscriptionData) {
      // No active subscription found
    } else if (!subscriptionData.plan_id) {
      // Subscription found but no plan_id
    } else {
      const { data: planRecord, error: planError } = await supabase
        .from('plans')
        .select('*') 
        .eq('id', subscriptionData.plan_id)
        .single();
      
      if (planError) {
        console.error(`[IntegrationsView DEBUG] Error fetching plan details for plan_id ${subscriptionData.plan_id}:`, planError);
      } else if (planRecord) {
        const record = planRecord as Record<string, unknown>; 
        const potentialIntegrationsLimit = record.integrations_allowed; 
        
        if (typeof potentialIntegrationsLimit === 'number') {
          determinedIntegrationsLimit = potentialIntegrationsLimit;
        } else if (potentialIntegrationsLimit === null) {
          determinedIntegrationsLimit = null; 
        }
      }
    }
  } catch (e) {
    console.error("[IntegrationsView DEBUG] Unexpected error in fetchUserPlanDetails:", e);
  }
  
  return { integrations_allowed: determinedIntegrationsLimit }; 
}


interface IntegrationsViewProps {
  isActive: boolean;
  activeTab: IntegrationsTabValue;
  setActiveTab: React.Dispatch<React.SetStateAction<IntegrationsTabValue>>;
  profileId?: string; // Add profileId to props
}

export function IntegrationsView({ isActive, activeTab, setActiveTab, profileId }: IntegrationsViewProps) {
  const { searchQuery } = useSettingsSearch();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedIntegration, setSelectedIntegration] = useState<ProcessedIntegration | null>(null);
  const { toast } = useToast();
  const { user: authUser } = useAuth();
  const queryClient = useQueryClient();

  const targetUserId = profileId || authUser?.id;

  const { data: availableIntegrationTypes = [], isLoading: isLoadingIntegrationTypes } = useQuery<DBIntegrationType[], Error>({
    queryKey: ['availableIntegrationTypes'],
    queryFn: async (): Promise<DBIntegrationType[]> => {
      const { data, error } = await supabase.from('integrations').select('*').order('name');
      if (error) throw error;
      return data || [];
    },
    enabled: isActive,
  });

  const { data: userIntegrationConfigs = [], isLoading: isLoadingUserConfigs, refetch: refetchUserConfigs } = useQuery<DBUserIntegrationConfig[], Error>({
    queryKey: ['userIntegrationConfigs'],
    queryFn: async (): Promise<DBUserIntegrationConfig[]> => {
      const { data, error } = await supabase.from('integrations_config').select('*');
      
      if (error) {
        console.error('[IntegrationsView DEBUG] Error fetching userIntegrationConfigs:', error);
        throw error; 
      }
      console.log('[IntegrationsView DEBUG] User Integration Configs (data from Supabase):', data);
      return data || [];
    },
    enabled: isActive,
  });

  const { data: userPlan, isLoading: isLoadingPlan } = useQuery<UserPlan, Error>({
    queryKey: ['activeSubscriptionPlan'],
    queryFn: fetchUserPlanDetails,
    enabled: isActive,
  });
  
  const processedIntegrations: ProcessedIntegration[] = useMemo(() => {
    const mappedItems: ProcessedIntegration[] = availableIntegrationTypes.map((integrationType): ProcessedIntegration => {
      const userConfig = userIntegrationConfigs.find(config => config.integration_id === integrationType.id);
      let determinedConnectionStatus: ConnectionState = 'unknown';
      if (userConfig) {
        if (userConfig.status && VALID_CONNECTION_STATES.includes(userConfig.status as ConnectionState)) {
          determinedConnectionStatus = userConfig.status as ConnectionState;
        }
      }
      return {
        id: integrationType.id,
        name: integrationType.name,
        type: integrationType.type || "messenger",
        description: integrationType.description,
        base_url: integrationType.base_url,
        icon_url: integrationType.icon_url,
        status: integrationType.status,
        connectionStatus: determinedConnectionStatus,
        user_config_id: userConfig?.id,
        instance_id: userConfig?.instance_id,
        token: userConfig?.token,
        connectedInstances: userConfig ? 1 : 0,
      };
    });
    return mappedItems;
  }, [availableIntegrationTypes, userIntegrationConfigs]);

  const refetchAll = async () => {
    await refetchUserConfigs();
  };

  const updateAndRefreshStatus = async (integration: ProcessedIntegration) => {
    if (!integration.user_config_id || !authUser?.id) {
      await refetchAll();
      return;
    }

    let finalStatus: ConnectionState = 'unknown';
    try {
      if (integration.instance_id && integration.token && integration.base_url && integration.id) {
         finalStatus = await checkInstanceStatus(integration.instance_id, integration.id);
      }
      // Assuming owner_id is also used for updates if it's used for reads.
      const { error: updateError } = await supabase.from('integrations_config').update({ status: finalStatus }).eq('id', integration.user_config_id).eq('owner_id', authUser.id); 
      if (updateError) throw updateError;
      await refetchAll();
    } catch (error) {
      console.error("Error updating status:", error);
      toast({ title: "Error", description: "Failed to update integration status.", variant: "destructive" });
      await refetchAll();
    }
  };
  
  const handleIntegrationClick = (integration: ProcessedIntegration) => {
    setSelectedIntegration(integration);
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
      let passesFilter = false;
      if (activeTab === "connected") {
        passesFilter = matchesSearch && 
               integration.user_config_id && 
               integration.connectionStatus !== 'close' && 
               integration.connectionStatus !== 'unknown';
      } else {
        passesFilter = matchesSearch;
      }
      return passesFilter;
    });
  }, [processedIntegrations, searchQuery, activeTab]);

  const isLoading = isLoadingIntegrationTypes || isLoadingUserConfigs || isLoadingPlan;
  const userConnectedCount = userIntegrationConfigs.filter(conf => conf.status && conf.status !== 'close').length; // Include 'unknown' for this count
  
  const userMaxAllowed = useMemo(() => {
    let maxAllowed = '...';
    if (isLoadingPlan) {
      maxAllowed = '...'; 
    } else if (!userPlan || userPlan.integrations_allowed === null || userPlan.integrations_allowed < 0) { 
      maxAllowed = 'Unlimited';
    } else {
      maxAllowed = userPlan.integrations_allowed.toString(); 
    }
    return maxAllowed;
  }, [userPlan, isLoadingPlan]);

  return (
    <div className="space-y-8">
      <IntegrationDialog
        open={dialogOpen}
        onOpenChange={handleDialogClose}
        selectedIntegration={selectedIntegration}
        profileId={authUser?.id} // Keeping this as profileId for now, as IntegrationDialog might expect it.
                                 // If it also uses owner_id, this would need to change.
      />
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as IntegrationsTabValue)} className="w-full">
        <div className="mb-4 text-sm text-muted-foreground">
          Your Connections: {userConnectedCount} / {userMaxAllowed}
        </div>
        <TabsContent value="all" className="mt-0">
          <h2 className="text-lg font-semibold mb-6">Available Integrations</h2>
          {isLoading ? (
            <div className="text-center text-muted-foreground py-8">Loading integrations...</div>
          ) : filteredIntegrations.filter(int => activeTab === 'all' || (int.user_config_id && int.connectionStatus !== 'close' && int.connectionStatus !== 'unknown')).length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {filteredIntegrations.filter(int => activeTab === 'all').map((integration) => (
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
              <span>No integrations found.</span>
            </div>
          )}
        </TabsContent>
        <TabsContent value="connected" className="mt-0">
           <h2 className="text-lg font-semibold mb-6">Your Connected Integrations</h2>
           {isLoading ? (
             <div className="text-center text-muted-foreground py-8">Loading integrations...</div>
           ) : filteredIntegrations.filter(int => activeTab === 'connected').length > 0 ? (
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
               {filteredIntegrations.filter(int => activeTab === 'connected').map((integration) => (
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
