import { Input } from "@/components/ui/input";
import { ShieldAlert } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"; // Import Tabs components
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/types/supabase"; // Import Database type
import { IntegrationDialog } from "./integration-dialog/IntegrationDialog";
import { IntegrationCard } from "./integration-card/IntegrationCard";
import type { Integration, ConnectionState } from "./types";
import { useToast } from "@/hooks/use-toast";
import { checkInstanceStatus } from "@/integrations/evolution-api/services/instanceStatusService";

interface IntegrationsViewProps {
  isActive: boolean; // Prop to control loading
}

export function IntegrationsView({ isActive }: IntegrationsViewProps) {
  const [activeTab, setActiveTab] = useState("all"); // Default to 'all'
  const [searchQuery, setSearchQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedIntegration, setSelectedIntegration] = useState<Integration | null>(null);
  const { toast } = useToast();
  const [userId, setUserId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isCheckingRole, setIsCheckingRole] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      setIsCheckingRole(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();
        
        if (error) {
          console.error("Error fetching user role:", error);
          setUserRole(null);
        } else {
          setUserRole(profile?.role || null);
        }
      } else {
        setUserId(null);
        setUserRole(null);
      }
      setIsCheckingRole(false);
    };
    fetchUser();
  }, []);

  const isAdmin = userRole === 'admin';

  type DBIntegrationType = {
    id: string;
    name: string;
    description?: string;
    base_url?: string;
    icon_url?: string;
    status?: 'available' | 'coming_soon' | string;
    type?: string;
    integrations_config: {
      instance_id?: string;
      token?: string;
      status?: string;
    }[] | null;
  };

  const { data: userAccessIntegrationIds, isLoading: isLoadingAccess } = useQuery({
    queryKey: ['userIntegrationAccess', userId],
    queryFn: async () => {
      if (!userId) return []; 
      
      const { data: accessData, error: accessError } = await supabase
        .from('profile_integration_access')
        .select('integration_id')
        .eq('profile_id', userId);

      if (accessError) throw accessError;
      if (!accessData || accessData.length === 0) return [];

      return [...new Set(accessData.map(a => a.integration_id).filter(Boolean) as string[])];
    },
    enabled: !!userId && !isAdmin && isActive && !isCheckingRole,
  });

  const { data: allIntegrations = [], isLoading: isLoadingIntegrations, refetch } = useQuery({
    queryKey: ['allIntegrationsWithConfig'],
    queryFn: async () => {
      console.log("Fetching ALL integrations joined with config...");
      const { data, error } = await supabase
        .from('integrations')
        .select(`
          *,
          integrations_config ( 
            instance_id, 
            token, 
            status
          )
        `)
        .order('name');

      if (error) {
        console.error("Error fetching joined integrations:", error);
        throw error;
      }

      const processedData = (data as unknown as DBIntegrationType[]).map((item: DBIntegrationType) => {
        const config = item.integrations_config?.[0];

        return {
          ...item,
          instance_id: config?.instance_id,
          token: config?.token,
          status: item.status || 'unknown',
          connectionStatus: (config?.status as ConnectionState) || 'unknown',
          integrations_config: undefined,
          type: item.type || "messenger",
        } as Integration & { instance_id?: string; token?: string };
      });

      return processedData;
    },
    enabled: isActive && !isCheckingRole,
  });

  const updateAndRefreshStatus = async (integration: Integration & { instance_id?: string; token?: string; }) => {
    let finalStatus: ConnectionState = 'unknown';
    const { id: integrationId, instance_id, token, base_url } = integration;

    if (!integrationId) {
      console.error("Integration ID missing, cannot update status.");
      return;
    }

    try {
      if (instance_id && token && base_url) {
        console.log(`Checking status for instance ${instance_id} (Integration: ${integrationId})...`);
        finalStatus = await checkInstanceStatus(instance_id, integrationId);
        console.log(`Status check result for ${instance_id}: ${finalStatus}`);
      } else {
        console.log(`Cannot check status for integration ${integrationId}. Missing instanceId, token, or baseUrl.`);
        finalStatus = 'unknown';
      }

      console.log(`Updating status in DB for integration ${integrationId} to ${finalStatus}...`);
      
      type IntegrationsConfigUpdate = Database['public']['Tables']['integrations_config']['Update'];
      const updatePayload: IntegrationsConfigUpdate = { status: finalStatus };

      const { error: updateError } = await supabase
        .from('integrations_config')
        .update(updatePayload)
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
    const currentConnectionStatus = integration.connectionStatus || 'unknown';
    const instanceId = integration.instance_id;

    console.log(`ConnectWhatsApp called for ${integration.name}. Current connection status: ${currentConnectionStatus}, Instance ID: ${instanceId}`);

    if (currentConnectionStatus === 'open') {
        toast({
            title: "Already Connected",
            description: `WhatsApp instance for ${integration.name} is already connected (Status: ${currentConnectionStatus}).`,
        });
        return;
    }

    toast({
      title: "Connecting WhatsApp...",
      description: `Status is ${currentConnectionStatus}. Attempting to guide connection.`,
    });

    if (!instanceId) {
      console.log(`No instance_id configured for integration ${integration.id}.`);
      toast({ title: "Configuration Needed", description: "WhatsApp instance name not found in configuration.", variant: "destructive" });
      setDialogOpen(true);
      return;
    }

    console.log(`Instance ID ${instanceId} found. Current connection status: ${currentConnectionStatus}. Opening dialog.`);
    localStorage.setItem('instanceID', instanceId);

    toast({
        title: "Connection Needed",
        description: `Instance ${instanceId} found but status is ${currentConnectionStatus}. Please follow instructions in the dialog.`,
    });
    setDialogOpen(true);
  };

  const handleIntegrationClick = async (integration: Integration) => {
    const fullIntegrationData = integration as Integration & { instance_id?: string; token?: string };
    setSelectedIntegration(fullIntegrationData);

    if (integration.name === "WhatsApp") {
      await connectWhatsApp(fullIntegrationData);
    } else {
      setDialogOpen(true);
    }
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    if (selectedIntegration) {
       const fullIntegrationData = selectedIntegration as Integration & { instance_id?: string; token?: string };
       updateAndRefreshStatus(fullIntegrationData);
    }
  };

  const baseIntegrationsList = useMemo(() => {
    if (isCheckingRole) return [];
    if (isAdmin) {
      return allIntegrations;
    } else {
      if (isLoadingAccess || !userAccessIntegrationIds) {
        return [];
      }
      return allIntegrations.filter(integration => 
        userAccessIntegrationIds.includes(integration.id)
      );
    }
  }, [allIntegrations, userAccessIntegrationIds, isAdmin, isCheckingRole, isLoadingAccess]);

  const filteredIntegrations = useMemo(() => {
    return baseIntegrationsList.filter(integration => {
      const matchesSearch = integration.name.toLowerCase().includes(searchQuery.toLowerCase());
      if (activeTab === "connected") { 
        return matchesSearch && integration.connectionStatus === 'open';
      }
      return matchesSearch; 
    });
  }, [baseIntegrationsList, searchQuery, activeTab]);

  const isLoading = isCheckingRole || isLoadingIntegrations || (!isAdmin && isLoadingAccess); 

  return (
    <div className="space-y-8"> 
      <IntegrationDialog
        open={dialogOpen}
        onOpenChange={handleDialogClose}
        selectedIntegration={selectedIntegration}
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

        <TabsContent value="all" className="mt-0"> 
          <h2 className="text-lg font-semibold mb-6">Messengers</h2>
          {isLoading ? (
            <div className="text-center text-muted-foreground py-8">Loading integrations...</div>
          ) : filteredIntegrations.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {filteredIntegrations.map((integration) => (
                <IntegrationCard
                  key={integration.id}
                  integration={integration}
                  onConnect={handleIntegrationClick}
                />
              ))}
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
               {filteredIntegrations.map((integration) => (
                 <IntegrationCard
                   key={integration.id}
                   integration={integration}
                   onConnect={handleIntegrationClick}
                 />
               ))}
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
