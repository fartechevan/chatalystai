import { Input } from "@/components/ui/input";
import { ShieldAlert } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"; // Import Tabs components
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database, Json } from "@/types/supabase"; // Import Database type
import { IntegrationDialog } from "./integration-dialog/IntegrationDialog";
import { IntegrationCard } from "./integration-card/IntegrationCard";
import type { Integration, ConnectionState, PlanDetails } from "./types"; // Import PlanDetails
import { useToast } from "@/hooks/use-toast";
import { checkInstanceStatus } from "@/integrations/evolution-api/services/instanceStatusService";
import { useTeams } from "@/context/TeamContext"; // Import useTeams
import { useAuth } from "@/components/auth/AuthProvider"; // Import useAuth

interface IntegrationsViewProps {
  isActive: boolean; // Prop to control loading
}

export function IntegrationsView({ isActive }: IntegrationsViewProps) {
  const { currentTeam, isLoading: isLoadingTeamsContext } = useTeams(); // Get current team for plan fetching
  const [activeTab, setActiveTab] = useState("all"); // Default to 'all'
  const [searchQuery, setSearchQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedIntegration, setSelectedIntegration] = useState<Integration | null>(null);
  const { toast } = useToast();
  const { user: authUser } = useAuth(); // Get authenticated user
  const { teamUsers } = useTeams(); // Get team users from context, isLoadingTeamsContext already destructured

  const [userRoleInTeam, setUserRoleInTeam] = useState<string | null>(null);
  const [isCheckingRole, setIsCheckingRole] = useState(true); 
  const [currentPlan, setCurrentPlan] = useState<PlanDetails | null>(null);
  const [isLoadingPlan, setIsLoadingPlan] = useState(false);
  const [tenantId, setTenantId] = useState<string | null>(null); // Added state for tenantId
  const [isLoadingTenant, setIsLoadingTenant] = useState(false); // Added loading state for tenantId

  // State for overall integration counts
  const [overallConnectedCount, setOverallConnectedCount] = useState(0);
  const [overallMaxAllowed, setOverallMaxAllowed] = useState<number | string | null>('N/A');


  useEffect(() => {
    const simpleFetchIntegrations = async () => {
      console.log("[IntegrationsView] Attempting simple fetch from 'integrations' table...");
      try {
        const { data, error, count } = await supabase
          .from('integrations')
          .select('id, name', { count: 'exact' })
          .limit(5);
        if (error) {
          console.error("[IntegrationsView] Simple fetch error:", error);
        } else {
          console.log("[IntegrationsView] Simple fetch success. Count:", count, "Data:", data);
        }
      } catch (e) {
        console.error("[IntegrationsView] Simple fetch exception:", e);
      }
    };
    simpleFetchIntegrations();
  }, []); // Run once on mount

  useEffect(() => {
    const fetchPlanAndDetermineRole = async () => {
      setIsCheckingRole(true); 
      setIsLoadingPlan(true);

      if (authUser && currentTeam) {
        const currentUserMembership = teamUsers.find(
          (tu) => tu.user_id === authUser.id && tu.team_id === currentTeam.id
        );
        const role = currentUserMembership?.role || null;
        setUserRoleInTeam(role);
        console.log(`[IntegrationsView fetchPlanAndDetermineRole] Current team ID: ${currentTeam.id}, User role: ${role}`);
        
        if (currentTeam.id) {
          try {
            // 1. Fetch tenant for currentTeam to get owner_profile_id
            const { data: tenantDataUntyped, error: tenantFetchError } = await supabase
              .from('tenants')
              .select('owner_profile_id') // Corrected to fetch owner_profile_id
              .eq('team_id', currentTeam.id)
              .maybeSingle();
            
            const tenantData = tenantDataUntyped as unknown as ({ owner_profile_id: string | null } | null);

            if (tenantFetchError) {
              console.error("Error fetching tenant to get owner_profile_id:", tenantFetchError);
            }

            if (!tenantData || !tenantData.owner_profile_id) {
              console.log(`[IntegrationsView] No tenant found for team ${currentTeam.id} or tenant has no owner_profile_id. Tenant data from query:`, tenantDataUntyped);
              setCurrentPlan(null);
              setIsCheckingRole(false);
              setIsLoadingPlan(false);
              return; 
            }
            
            console.log(`[IntegrationsView] Tenant's owner_profile_id: ${tenantData.owner_profile_id}`);

            // 2. Use tenantData.owner_profile_id to fetch the subscription
            const { data: subscriptionData, error: subscriptionError } = await supabase
              .from('subscriptions')
              .select('plan_id, status')
              .eq('profile_id', tenantData.owner_profile_id) // Query by subscriptions.profile_id using owner_profile_id
              .eq('status', 'active')
              .maybeSingle();

            if (subscriptionError) {
              console.error("Error fetching subscription by owner_profile_id:", subscriptionError);
            }
            
            if (subscriptionData?.plan_id) {
              console.log(`[IntegrationsView] Found active subscription for owner_profile_id ${tenantData.owner_profile_id} with plan_id: ${subscriptionData.plan_id}`);
              const { data: planData, error: planError } = await supabase
                .from('plans')
                .select('*') 
                .eq('id', subscriptionData.plan_id)
                .single();
              
              if (planError) {
                console.error("Error fetching plan details:", planError);
                toast({ title: "Error", description: "Could not load plan details.", variant: "destructive" });
                setCurrentPlan(null);
              } else {
                setCurrentPlan(planData as PlanDetails);
                console.log("[IntegrationsView] setCurrentPlan with data:", planData);
              }
            } else {
              setCurrentPlan(null); 
              console.log("[IntegrationsView] setCurrentPlan to null (no subscriptionData or plan_id).");
            }
          } catch (error) {
            console.error("Error fetching subscription/plan details:", error); // Log the actual error
            setCurrentPlan(null);
            console.log("[IntegrationsView] setCurrentPlan to null (due to error in try-catch).");
          }
        } else {
          setCurrentPlan(null); 
          console.log("[IntegrationsView] setCurrentPlan to null (no currentTeam.id).");
        }
      } else {
        setUserRoleInTeam(null);
        setCurrentPlan(null);
        console.log("[IntegrationsView] setCurrentPlan to null (no authUser or currentTeam).");
      }
      setIsCheckingRole(false); 
      setIsLoadingPlan(false);
    };

    if (!isLoadingTeamsContext) { 
        fetchPlanAndDetermineRole();
    }
  }, [authUser, currentTeam, toast, teamUsers, isLoadingTeamsContext]);

  useEffect(() => {
    const fetchTenant = async () => {
      if (currentTeam?.id) {
        setIsLoadingTenant(true);
        try {
          const { data: tenantData, error: tenantError } = await supabase
            .from('tenants')
            .select('id')
            .eq('team_id', currentTeam.id)
            .maybeSingle(); 

          if (tenantError) throw tenantError;
          setTenantId(tenantData?.id || null);
          console.log("[IntegrationsView] Fetched tenantId:", tenantData?.id || null);
        } catch (error) {
          console.error("Error fetching tenant ID:", error);
          toast({ title: "Error", description: "Could not load tenant information.", variant: "destructive" });
          setTenantId(null);
        } finally {
          setIsLoadingTenant(false);
        }
      } else {
        setTenantId(null);
         console.log("[IntegrationsView] No currentTeam.id, tenantId set to null.");
      }
    };

    if (!isLoadingTeamsContext) { 
      fetchTenant();
    }
  }, [currentTeam?.id, isLoadingTeamsContext, toast]);

  // Effect to fetch overall integration counts for the tenant
  useEffect(() => {
    const fetchOverallCounts = async () => {
      if (!tenantId || !currentPlan) { // Ensure tenantId and currentPlan are available
        setOverallConnectedCount(0);
        setOverallMaxAllowed('N/A');
        return;
      }

      // 1. Fetch current total connected integrations for the tenant
      const { count: currentCount, error: countError } = await supabase
        .from('integrations_config')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', tenantId);
      
      if (countError) {
        console.error("Error fetching overall connected count:", countError);
        toast({ title: "Error", description: "Could not load total integrations count.", variant: "destructive" });
        setOverallConnectedCount(0); // Default on error
      } else {
        setOverallConnectedCount(currentCount ?? 0);
      }

      // 2. Determine max allowed from the already fetched currentPlan
      // The currentPlan.integrations_allowed is the specific field from the plans table.
      let calculatedMaxAllowed: string | number = 'N/A';
      if (currentPlan.integrations_allowed === null) {
        calculatedMaxAllowed = 'Unlimited';
      } else if (typeof currentPlan.integrations_allowed === 'number') {
        calculatedMaxAllowed = currentPlan.integrations_allowed;
      }
      setOverallMaxAllowed(calculatedMaxAllowed); 
      console.log("[IntegrationsView fetchOverallCounts] overallConnectedCount:", currentCount ?? 0, "overallMaxAllowed:", calculatedMaxAllowed, "currentPlan.integrations_allowed:", currentPlan.integrations_allowed);
    };

    if (isActive && tenantId && currentPlan && !isLoadingPlan && !isLoadingTenant) {
      fetchOverallCounts();
    } else {
      console.log("[IntegrationsView fetchOverallCounts] Skipped due to conditions:", {isActive, tenantId, currentPlan, isLoadingPlan, isLoadingTenant});
    }
  }, [isActive, tenantId, currentPlan, isLoadingPlan, isLoadingTenant, toast]);


  const isAdmin = userRoleInTeam === 'admin' || userRoleInTeam === 'owner';

  type DBIntegrationConfig = {
    id: string;
    instance_id?: string;
    token?: string;
    status?: string;
  };
  
  type DBIntegrationType = {
    id: string;
    name: string;
    description?: string;
    base_url?: string;
    icon_url?: string;
    status?: 'available' | 'coming_soon' | string; 
    type?: string;
    integrations_config: DBIntegrationConfig[] | null;
  };
  
  type ProcessedIntegration = Integration & { 
    instance_id?: string; 
    token?: string; 
    connectedInstances: number;
    integrations_config_raw?: DBIntegrationConfig[] | null; 
  };

  const { data: userAccessIntegrationIds, isLoading: isLoadingAccess } = useQuery({
    queryKey: ['userIntegrationAccess', authUser?.id],
    queryFn: async () => {
      if (!authUser?.id) return []; 
      
      const { data: accessData, error: accessError } = await supabase
        .from('profile_integration_access') 
        .select('integration_id')
        .eq('profile_id', authUser.id);

      if (accessError) {
        console.error("Error fetching user integration access:", accessError);
        return [];
      }
      if (!accessData || accessData.length === 0) return [];

      return [...new Set(accessData.map(a => a.integration_id).filter(Boolean) as string[])];
    },
    enabled: !!authUser?.id && !isAdmin && isActive && !isCheckingRole && !isLoadingPlan && !isLoadingTeamsContext && !isLoadingTenant,
  });

  const { data: allIntegrations = [], isLoading: isLoadingIntegrations, refetch } = useQuery({
    queryKey: ['allIntegrationsWithConfig', tenantId], // Added tenantId to queryKey to refetch if it changes
    queryFn: async () => {
      console.log("Fetching ALL integrations joined with config...");
      let data = null; // Declare data here
      let error = null; // Declare error here
      try {
        const response = await supabase
          .from('integrations')
          .select(`
            *,
            integrations_config (
              id,
              instance_id, 
              token, 
              status
            )
          `)
          .order('name');
        data = response.data;
        error = response.error;
      } catch (e) {
        console.error("[IntegrationsView] Exception during supabase.from('integrations').select(...):", e);
        throw e; 
      }
      
      console.log("[IntegrationsView] allIntegrations query (with join) result - data:", data, "error:", error);

      if (error) {
        console.error("Error fetching joined integrations:", error);
        throw error;
      }

      const integrationsData = data || []; // Declare integrationsData here
      console.log("[IntegrationsView] integrationsData before map:", integrationsData);

      let processedData: ProcessedIntegration[] = []; // Declare processedData here
      try {
        processedData = (integrationsData as unknown as DBIntegrationType[]).map((item: DBIntegrationType, index: number): ProcessedIntegration => {
          console.log(`[IntegrationsView] Mapping item ${index}:`, item);
          try {
            let configArray: DBIntegrationConfig[] = [];
            if (Array.isArray(item.integrations_config)) {
              configArray = item.integrations_config;
            } else if (item.integrations_config) { // If it's a single object (and not null/undefined)
              configArray = [item.integrations_config as DBIntegrationConfig]; 
            }

            const connectedConfigs = configArray.filter(c => c.status === 'open');
            
            const firstStatusStr = configArray[0]?.status;
            let resolvedFirstStatus: ConnectionState = 'unknown';
            const validStates: ConnectionState[] = ['idle', 'connecting', 'open', 'close', 'unknown', 'qrcode', 'pairingCode'];
            if (firstStatusStr && validStates.includes(firstStatusStr as ConnectionState)) {
                resolvedFirstStatus = firstStatusStr as ConnectionState;
            }

            const overallConnectionStatus: ConnectionState = connectedConfigs.length > 0 ? 'open' : resolvedFirstStatus;
            
            const firstConfig = configArray[0];

            const mappedItem = {
              id: item.id,
              name: item.name,
              type: item.type || "messenger", 
              description: item.description,
              base_url: item.base_url,
              icon_url: item.icon_url,
              status: item.status || 'unknown', 
              connectionStatus: overallConnectionStatus, 
              instance_id: firstConfig?.instance_id,
              token: firstConfig?.token,
              connectedInstances: configArray.length, // Use length of normalized configArray
              integrations_config_raw: configArray, // Store the normalized array
            };
            console.log(`[IntegrationsView] Successfully mapped item ${index}:`, mappedItem);
            return mappedItem;
          } catch (mapError) {
            console.error(`[IntegrationsView] Error mapping item ${index}:`, item, "Error:", mapError);
            // Return a default/error object or rethrow, depending on desired behavior
            // For now, let's try to continue mapping other items if possible, by returning a placeholder
            // This might not be ideal as it could hide issues, but helps see if *any* item fails.
            // A better approach might be to filter out items that fail mapping.
            // However, if any item fails, the whole query might be considered failed by react-query if an error is thrown.
            throw mapError; // Re-throw to ensure react-query sees the error
          }
        });
      } catch (outerMapError) {
        console.error("[IntegrationsView] Error during the .map operation itself:", outerMapError);
        throw outerMapError; // Re-throw
      }

      console.log("[IntegrationsView] queryFn returning processedData:", processedData);
      return processedData;
    },
    enabled: isActive && !isCheckingRole && !isLoadingPlan && !isLoadingTeamsContext,
  });

  const updateAndRefreshStatus = async (integration: ProcessedIntegration) => {
    let finalStatus: ConnectionState = 'unknown';
    const { id: integrationId, instance_id, token, base_url, integrations_config_raw } = integration;

    if (!integrationId) {
      console.error("Integration ID missing, cannot update status.");
      return;
    }

    let targetConfigToUpdate: DBIntegrationConfig | undefined = undefined;
    if (instance_id && integrations_config_raw) {
      targetConfigToUpdate = integrations_config_raw.find(c => c.instance_id === instance_id);
    } else if (integrations_config_raw?.length === 1) {
      targetConfigToUpdate = integrations_config_raw[0];
    }

    if (!targetConfigToUpdate?.id) {
      console.log(`No specific config instance to update status for integration ${integrationId}. Refreshing general list.`);
      refetch();
      return;
    }
    
    const configIdToUpdate = targetConfigToUpdate.id;

    try {
      if (targetConfigToUpdate.instance_id && targetConfigToUpdate.token && base_url) {
        console.log(`Checking status for instance ${targetConfigToUpdate.instance_id} (Config ID: ${configIdToUpdate})...`);
        finalStatus = await checkInstanceStatus(targetConfigToUpdate.instance_id, integrationId);
        console.log(`Status check result for ${targetConfigToUpdate.instance_id}: ${finalStatus}`);
      } else {
        console.log(`Cannot check status for config ${configIdToUpdate}. Missing instanceId, token, or baseUrl.`);
        finalStatus = 'unknown';
      }

      console.log(`Updating status in DB for integration config ${configIdToUpdate} to ${finalStatus}...`);
      
      const updatePayload: Partial<DBIntegrationConfig> = { status: finalStatus };

      const { error: updateError } = await supabase
        .from('integrations_config')
        .update(updatePayload)
        .eq('id', configIdToUpdate);

      if (updateError) {
        console.error(`Error updating status in DB for config ${configIdToUpdate}:`, updateError);
        toast({ title: "DB Update Error", description: `Failed to save status: ${updateError.message}`, variant: "destructive" });
      } else {
        console.log(`Successfully updated status in DB for config ${configIdToUpdate}.`);
        refetch();
      }
    } catch (error) {
      console.error(`Error during updateAndRefreshStatus for config ${configIdToUpdate}:`, error);
    }
  };

  const connectWhatsApp = async (integration: ProcessedIntegration) => {
    setSelectedIntegration(integration);
    const currentConnectionStatus = integration.connectionStatus || 'unknown';
    const instanceId = integration.instance_id; 
    const integrationName = integration.name;

    const planLimit = typeof currentPlan?.integration_limits === 'object' && currentPlan.integration_limits && currentPlan.integration_limits[integrationName] !== undefined
      ? currentPlan.integration_limits[integrationName] as number
      : currentPlan?.max_integrations;

    if (planLimit !== undefined && planLimit !== null && integration.connectedInstances >= planLimit) {
      toast({
        title: "Limit Reached",
        description: `You have reached the maximum number of allowed ${integrationName} integrations for your current plan.`,
        variant: "destructive",
      });
      return;
    }
    
    console.log(`ConnectWhatsApp called for ${integration.name}. Current connection status: ${currentConnectionStatus}, Instance ID: ${instanceId}`);

    if (currentConnectionStatus === 'open' && instanceId) {
        toast({
            title: "Already Connected",
            description: `An instance for ${integration.name} is already connected. Manage or add new instances via the dialog.`,
        });
        setDialogOpen(true); 
        return;
    }

    toast({
      title: "Connecting WhatsApp...",
      description: `Status is ${currentConnectionStatus}. Attempting to guide connection.`,
    });

    if (!instanceId && integration.name === "WhatsApp") {
      console.log(`No primary instance_id configured for ${integration.id}. Opening dialog for new setup.`);
      setDialogOpen(true);
      return;
    }
    
    if (instanceId) {
      console.log(`Instance ID ${instanceId} found. Current connection status: ${currentConnectionStatus}. Opening dialog.`);
      localStorage.setItem('instanceID', instanceId);
      toast({
          title: "Connection Needed",
          description: `Instance ${instanceId} found but status is ${currentConnectionStatus}. Please follow instructions in the dialog.`,
      });
    }
    setDialogOpen(true);
  };
  
  const handleIntegrationClick = async (integration: Integration) => {
    const fullIntegrationData = integration as ProcessedIntegration;
    setSelectedIntegration(fullIntegrationData);

    const integrationName = fullIntegrationData.name;
    let limitForThisIntegration: number | undefined | null = undefined;

    if (currentPlan?.integration_limits && typeof currentPlan.integration_limits === 'object' && currentPlan.integration_limits[integrationName] !== undefined) {
        limitForThisIntegration = currentPlan.integration_limits[integrationName] as number;
    } else if (currentPlan?.max_integrations !== undefined && currentPlan.max_integrations !== null) {
        limitForThisIntegration = currentPlan.max_integrations;
    }
    
    if (fullIntegrationData.connectionStatus !== 'open' && 
        limitForThisIntegration !== undefined && 
        limitForThisIntegration !== null && 
        fullIntegrationData.connectedInstances >= limitForThisIntegration) {
        toast({
            title: "Limit Reached",
            description: `You have reached the maximum of ${limitForThisIntegration} ${integrationName} connections for your plan.`,
            variant: "destructive",
        });
        return; 
    }

    if (integration.name === "WhatsApp") {
      await connectWhatsApp(fullIntegrationData);
    } else {
      setDialogOpen(true);
    }
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    if (selectedIntegration) {
       const fullIntegrationData = selectedIntegration as ProcessedIntegration; 
       updateAndRefreshStatus(fullIntegrationData);
    }
  };

  const baseIntegrationsList = useMemo(() => {
    console.log("[IntegrationsView] Recalculating baseIntegrationsList:", {
      isCheckingRole,
      isLoadingPlan,
      isLoadingTeamsContext,
      isAdmin,
      allIntegrationsLength: allIntegrations ? allIntegrations.length : 0,
      isLoadingAccess,
      userAccessIntegrationIds: userAccessIntegrationIds ? userAccessIntegrationIds.length : 0,
    });
    if (isCheckingRole || isLoadingPlan || isLoadingTeamsContext) {
      console.log("[IntegrationsView] baseIntegrationsList: Returning [] due to loading state (role/plan/teams context).");
      return [];
    }
    
    const currentAllIntegrations = allIntegrations || [];
    const currentAccessIds = userAccessIntegrationIds || [];

    if (isAdmin) {
      console.log("[IntegrationsView] baseIntegrationsList: Returning allIntegrations (admin). Length:", currentAllIntegrations.length);
      return currentAllIntegrations;
    } else {
      if (isLoadingAccess || !userAccessIntegrationIds) { 
        console.log("[IntegrationsView] baseIntegrationsList: Returning [] due to isLoadingAccess or no userAccessIntegrationIds (non-admin).");
        return [];
      }
      const filtered = currentAllIntegrations.filter(integration => 
        currentAccessIds.includes(integration.id)
      );
      console.log("[IntegrationsView] baseIntegrationsList: Returning filtered integrations (non-admin). Length:", filtered.length);
      return filtered;
    }
  }, [allIntegrations, userAccessIntegrationIds, isAdmin, isCheckingRole, isLoadingAccess, isLoadingPlan, isLoadingTeamsContext]);

  const filteredIntegrations = useMemo(() => {
    console.log("[IntegrationsView] Recalculating filteredIntegrations. Base length:", baseIntegrationsList.length, "Search:", searchQuery, "Tab:", activeTab);
    const result = baseIntegrationsList.filter((integration: ProcessedIntegration) => {
      const matchesSearch = integration.name.toLowerCase().includes(searchQuery.toLowerCase());
      if (activeTab === "connected") { 
        return matchesSearch && integration.connectionStatus === 'open' && integration.connectedInstances > 0;
      }
      return matchesSearch; 
    });
    console.log("[IntegrationsView] filteredIntegrations result length:", result.length);
    return result;
  }, [baseIntegrationsList, searchQuery, activeTab]);

  const isLoading = isCheckingRole || isLoadingIntegrations || (!isAdmin && isLoadingAccess) || isLoadingPlan || isLoadingTeamsContext || isLoadingTenant; 

  const getIntegrationLimit = (integrationName: string): number | string => {
    console.log(`[IntegrationsView getIntegrationLimit] Called for: ${integrationName}. Current Plan:`, currentPlan);
    if (!currentPlan) {
      console.log(`[IntegrationsView getIntegrationLimit] No currentPlan, returning 'N/A'.`);
      return 'N/A'; 
    }
    if (currentPlan.integration_limits && typeof currentPlan.integration_limits === 'object') {
      const limits = currentPlan.integration_limits as Record<string, number | null>; 
      if (limits[integrationName] !== undefined) {
        const specificLimit = limits[integrationName] === null ? 'Unlimited' : limits[integrationName]!;
        console.log(`[IntegrationsView getIntegrationLimit] Found specific limit for ${integrationName}: ${specificLimit}`);
        return specificLimit;
      }
    }
    // Fallback to the general plan limit if no type-specific limit is found
    const generalLimit = currentPlan.integrations_allowed === null ? 'Unlimited' : (currentPlan.integrations_allowed ?? 'N/A');
    console.log(`[IntegrationsView getIntegrationLimit] No specific limit for ${integrationName}, falling back to general plan limit: ${generalLimit}`);
    return generalLimit;
  };

  console.log("[IntegrationsView] Rendering. States:", {
    isActive,
    authUser: authUser?.id,
    currentTeam: currentTeam?.id,
    userRoleInTeam,
    currentPlanId: currentPlan?.id,
    isCheckingRole,
    isLoadingPlan,
    isLoadingTeamsContext,
    isAdmin,
    isLoadingAccess,
    userAccessIntegrationIds: userAccessIntegrationIds ? userAccessIntegrationIds.length : 0,
    isLoadingIntegrations,
    allIntegrationsLength: allIntegrations ? allIntegrations.length : 0,
    baseIntegrationsListLength: baseIntegrationsList.length,
    filteredIntegrationsLength: filteredIntegrations.length,
    searchQuery,
    activeTab,
    isLoading,
  });

  return (
    <div className="space-y-8"> 
      <IntegrationDialog
        open={dialogOpen}
        onOpenChange={handleDialogClose}
        selectedIntegration={selectedIntegration as ProcessedIntegration | null}
        currentPlan={currentPlan}
        tenantId={tenantId} // Pass tenantId to IntegrationDialog
      />

      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 md:gap-0">
        <Input
          placeholder="Search"
          className="w-full md:max-w-sm"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

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
          Overall Usage: {overallConnectedCount} / {String(overallMaxAllowed)}
        </div>

        <TabsContent value="all" className="mt-0"> 
          <h2 className="text-lg font-semibold mb-6">Messengers</h2>
          {isLoading ? (
            <div className="text-center text-muted-foreground py-8">Loading integrations...</div>
          ) : filteredIntegrations.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {filteredIntegrations.map((integration) => {
                const limit = getIntegrationLimit(integration.name); // This is per integration TYPE
                const typedIntegration = integration as ProcessedIntegration;
                
                console.log(`[IntegrationsView Rendering Card - All Tab] For ${integration.name}: connectedInstances=${typedIntegration.connectedInstances}, limit=${limit}, overallConnected=${overallConnectedCount}, overallMax=${overallMaxAllowed}`);

                const isIndividuallyOverLimit = typeof limit === 'number' && typedIntegration.connectedInstances >= limit;
                const isOverallOverLimit = typeof overallMaxAllowed === 'number' && overallConnectedCount >= overallMaxAllowed;
                
                // Disable if individually over limit OR if overall limit is reached AND this is a new connection attempt (not already open)
                const isDisabled = (isIndividuallyOverLimit || (isOverallOverLimit && typedIntegration.connectionStatus !== 'open')) && typedIntegration.connectionStatus !== 'open';
                console.log(`[IntegrationsView Rendering Card - All Tab] For ${integration.name}: isIndividuallyOverLimit=${isIndividuallyOverLimit}, isOverallOverLimit=${isOverallOverLimit}, isDisabled=${isDisabled}`);

                return (
                  <IntegrationCard
                    key={typedIntegration.id}
                    integration={typedIntegration}
                    onConnect={handleIntegrationClick}
                    connectedCount={typedIntegration.connectedInstances}
                    limit={limit} // Limit for this specific integration type
                    disabled={isDisabled}
                  />
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground flex flex-col items-center gap-2">
              <ShieldAlert className="h-6 w-6" />
              <span>No integrations found matching your criteria or access rights.</span>
            </div>
          )}
        </TabsContent>
        <TabsContent value="connected" className="mt-0">
           <h2 className="text-lg font-semibold mb-6">Messengers</h2>
           {isLoading ? (
             <div className="text-center text-muted-foreground py-8">Loading integrations...</div>
           ) : filteredIntegrations.length > 0 ? (
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
               {filteredIntegrations.map((integration) => {
                 const limit = getIntegrationLimit(integration.name);
                 const typedIntegration = integration as ProcessedIntegration;
                 console.log(`[IntegrationsView Rendering Card - Connected Tab] For ${integration.name}: connectedInstances=${typedIntegration.connectedInstances}, limit=${limit}`);
                 const isIndividuallyOverLimit = typeof limit === 'number' && typedIntegration.connectedInstances >= limit;
                 // For "connected" tab, we generally don't disable based on overall limit as they are already connected.
                 // The primary concern is if they are over their individual type limit (though this state should ideally not occur if limits are enforced on connection).
                 const isDisabled = isIndividuallyOverLimit && typedIntegration.connectionStatus !== 'open'; // Keep existing logic for connected tab
                 console.log(`[IntegrationsView Rendering Card - Connected Tab] For ${integration.name}: isIndividuallyOverLimit=${isIndividuallyOverLimit}, isDisabled=${isDisabled}`);
                 return (
                  <IntegrationCard
                    key={typedIntegration.id}
                    integration={typedIntegration}
                    onConnect={handleIntegrationClick}
                    connectedCount={typedIntegration.connectedInstances}
                    limit={limit}
                    disabled={isDisabled} 
                  />
                 );
                })}
             </div>
           ) : (
             <div className="text-center py-8 text-muted-foreground flex flex-col items-center gap-2">
               <ShieldAlert className="h-6 w-6" />
               <span>No connected integrations found matching your criteria or access rights.</span>
             </div>
           )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
