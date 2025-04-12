
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, ShieldAlert } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
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
  const [userId, setUserId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isCheckingRole, setIsCheckingRole] = useState(true);

  // Get current user ID and Role
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

  // Define the type for each item in the response data array
  type DBIntegrationType = {
    id: string;
    name: string;
    description?: string;
    base_url?: string;
    icon_url?: string;
    status?: 'available' | 'coming_soon' | string;
    type?: string;
    integrations_config: { // Keep config for status/instance_id, but access is based on integration_id now
      instance_id?: string;
      token?: string;
      status?: string;
    }[] | null;
  };

  // Fetch the integration_ids the current user has access to (only needed if NOT admin)
  const { data: userAccessIntegrationIds, isLoading: isLoadingAccess } = useQuery({
    queryKey: ['userIntegrationAccess', userId],
    queryFn: async () => {
      if (!userId) return []; 
      
      // Fetch integration IDs directly from profile_integration_access
      const { data: accessData, error: accessError } = await supabase
        .from('profile_integration_access')
        .select('integration_id') // Select the correct foreign key
        .eq('profile_id', userId);

      if (accessError) throw accessError;
      if (!accessData || accessData.length === 0) return [];

      // Return unique integration IDs directly
      return [...new Set(accessData.map(a => a.integration_id).filter(Boolean) as string[])];
    },
    enabled: !!userId && !isAdmin && isActive && !isCheckingRole, // Only run for non-admins when ready
  });

  // Fetch ALL integrations joined with config (still need config for status/instance)
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

      // Process the data to ensure consistent types
      const processedData = (data as unknown as DBIntegrationType[]).map((item: DBIntegrationType) => {
        const config = item.integrations_config?.[0]; // Still get config for status/instance

        return {
          ...item, // Spread integration fields
          instance_id: config?.instance_id,
          token: config?.token,
          // No longer need config_id here as access is based on integration.id
          status: item.status || 'unknown', // Keep original availability status
          connectionStatus: (config?.status as ConnectionState) || 'unknown',
          integrations_config: undefined, // Remove the nested object
          type: item.type || "messenger", // Ensure there's always a type
        } as Integration & { instance_id?: string; token?: string }; // Removed config_id from type assertion
      });

      // Manually add WhatsApp Cloud API if not present
       const whatsappCloudApi: Integration = {
         id: "whatsapp-cloud-api",
         name: "WhatsApp Cloud API",
         description: "Connect your WhatsApp Business account through Facebook.",
         icon_url: "/lovable-uploads/8d699109-6446-4dd5-b026-f2f32a953f05.png",
         status: "unknown", // Default status
         base_url: "https://api.evoapicloud.com",
         type: "messenger"
       };

      const hasWhatsAppCloudApi = processedData.some(integration =>
        integration.name === "WhatsApp Cloud API"
      );

      // Add manual entry if it doesn't exist in the DB result
      return hasWhatsAppCloudApi ? processedData : [...processedData, whatsappCloudApi];
    },
    enabled: isActive && !isCheckingRole, // Only fetch when view is active and role check is done
  });

  // This function checks status, updates DB, and triggers refetch
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
        finalStatus = await checkInstanceStatus(instance_id, token, base_url);
        console.log(`Status check result for ${instance_id}: ${finalStatus}`);
      } else {
        console.log(`Cannot check status for integration ${integrationId}. Missing instanceId, token, or baseUrl.`);
        finalStatus = 'unknown';
      }

      // Update the status in the integrations_config table
      console.log(`Updating status in DB for integration ${integrationId} to ${finalStatus}...`);
      
      // Update the 'status' column in the database using the finalStatus
      const { error: updateError } = await supabase
        .from('integrations_config')
        .update({ 
          // Use status field as it exists in the table schema
          status: finalStatus as string 
        })
        .eq('integration_id', integrationId);

      if (updateError) {
        console.error(`Error updating status in DB for ${integrationId}:`, updateError);
        toast({ title: "DB Update Error", description: `Failed to save status: ${updateError.message}`, variant: "destructive" });
      } else {
        console.log(`Successfully updated status in DB for ${integrationId}.`);
        // Trigger refetch to get the updated status from DB
        refetch();
      }

    } catch (error) {
      console.error(`Error during updateAndRefreshStatus for ${integrationId}:`, error);
      finalStatus = 'unknown'; // Keep status as unknown on error
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

  // Determine the base list of integrations to show (all for admin, accessible for others)
  const baseIntegrationsList = useMemo(() => {
    if (isCheckingRole) return []; // Wait until role check is done
    if (isAdmin) {
      return allIntegrations; // Admins see everything fetched
    } else {
      // Non-admins: filter based on fetched access IDs
      if (isLoadingAccess || !userAccessIntegrationIds) {
        return []; // Wait for access data or return empty if no access
      }
      return allIntegrations.filter(integration => 
        userAccessIntegrationIds.includes(integration.id)
      );
    }
  }, [allIntegrations, userAccessIntegrationIds, isAdmin, isCheckingRole, isLoadingAccess]);

  // Final filtering based on search query and active tab
  const filteredIntegrations = useMemo(() => {
    return baseIntegrationsList.filter(integration => {
      const matchesSearch = integration.name.toLowerCase().includes(searchQuery.toLowerCase());
      if (activeTab === "Connected") {
        // Ensure connectionStatus exists and is 'open'
        return matchesSearch && integration.connectionStatus === 'open'; 
      }
      return matchesSearch;
    });
  }, [baseIntegrationsList, searchQuery, activeTab]);

  // Combine loading states
  const isLoading = isCheckingRole || isLoadingIntegrations || (!isAdmin && isLoadingAccess); 

  return (
    // Removed all padding again. Rely entirely on parent (SettingsLayout). Kept space-y-8.
    <div className="space-y-8"> 
      <IntegrationDialog
        open={dialogOpen}
        onOpenChange={handleDialogClose}
        selectedIntegration={selectedIntegration}
      />

      {/* Make top row stack on mobile, row on md+ */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 md:gap-0">
        <Input
          placeholder="Search"
          className="w-full md:max-w-sm" // Full width on mobile, max-w on md+
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        {/* Removed Webhooks and Create Integration buttons */}
      </div>

      {/* Removed duplicated search row */}

      {/* Keep margin-bottom */}
      <div className="flex items-center gap-4 border-b mb-8"> 
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

      {/* Removed px-4 wrapper */}
      <div> 
        <h2 className="text-lg font-semibold mb-6">Messengers</h2> 
        {isLoading ? (
          <div className="text-center text-muted-foreground py-8">Loading integrations...</div>
        ) : filteredIntegrations.length > 0 ? (
          // Re-added gap-4 to grid container
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
      </div>
    </div>
  );
}
