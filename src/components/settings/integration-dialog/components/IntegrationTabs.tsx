import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useState } from "react";
import type { Integration, PlanDetails } from "../../types"; // Import PlanDetails
// import { WhatsAppCloudApiContent } from "./WhatsAppCloudApiContent"; // Removed
import { usePipelinesList } from "@/hooks/usePipelinesList"; // Import pipeline hook
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"; // Import Select components
import { Label } from "@/components/ui/label"; // Import Label
// import { WhatsAppAuthorizationContent } from "./WhatsAppAuthorizationContent"; // Removed
// import { WhatsAppBusinessSettings } from "./WhatsAppBusinessSettings"; // Remove unused import
import { WhatsAppBusinessAuthorization } from "./WhatsAppBusinessAuthorization";
import { useToast } from "@/hooks/use-toast";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Loader2, Trash2, Plus, CheckCircle, AlertCircle, X, Power, RefreshCw } from "lucide-react"; // Consolidated imports + RefreshCw
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { ConnectionState, EvolutionInstance } from "@/integrations/evolution-api/types"; // Corrected import path, added EvolutionInstance
import { useIntegrationConnectionState } from "../hooks/useIntegrationConnectionState"; // Import the hook
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table"; // Import Table components
import { Input } from "@/components/ui/input"; // Import Input
// import { logoutInstance } from "@/integrations/evolution-api/services/instanceLogoutService"; // Remove logout import
import { deleteEvolutionInstance } from "@/integrations/evolution-api/services/deleteInstanceService"; // Import the delete service
import { refreshWebhookSetupWithToast } from "@/integrations/evolution-api/services/refreshWebhookService"; // Import refresh webhook service

interface IntegrationTabsProps {
  selectedIntegration: Integration | null;
  handleConnectWithFacebook: () => void; // Keep for FB
  onClose: () => void; // Keep for closing dialog
  open: boolean; // Add open state for the hook
  onOpenChange: (open: boolean) => void; // Add onOpenChange for the hook
  currentPlan?: PlanDetails | null; // Add currentPlan prop
  profileId?: string | null; // Changed tenantId to profileId
}

export function IntegrationTabs({
  selectedIntegration,
  handleConnectWithFacebook,
  onClose,
  open,
  onOpenChange,
  currentPlan, // Destructure currentPlan
  profileId, // Changed tenantId to profileId
}: IntegrationTabsProps) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"settings" | "authorization">("settings");
  const [isClearing, setIsClearing] = useState(false);
  const { toast } = useToast();
  const [isRefreshingWebhooks, setIsRefreshingWebhooks] = useState(false); // Track webhook refresh state
  // const [isLogoutLoading, setIsLogoutLoading] = useState<string | null>(null); // Remove logout state
  const [isDeleteLoading, setIsDeleteLoading] = useState<string | null>(null); // Instance name being deleted
  const [selectedPipelineId, setSelectedPipelineId] = useState<string | undefined>(undefined); // State for pipeline ID
  // Fetch all pipelines - selection is handled during save/connect
  const { pipelines, isLoading: isLoadingPipelines, error: pipelineError } = usePipelinesList(); 

  // --- Call the hook here ---
  const {
    // showDeviceSelect, // Logic might need adjustment if DeviceSelect is used
    // setShowDeviceSelect,
    // integrationMainPopup,
    // setIntegrationMainPopup,
    isConnected, // Use this to know if *any* connection is established
    connectionState, // Overall state, useful for QR code
    isLoading, // Loading state for hook operations
    // checkCurrentConnectionState, // Might not be needed directly - Removed
    qrCodeBase64,
    pairingCode,
    handleConnect, // Function to initiate connection for an instance
    fetchedInstances,
    isFetchingInstances, // Loading state specifically for fetching instances
    selectedInstanceName, // Get selected instance name
    // handleSelectedInstanceNameChange, // No longer needed here
    newInstanceName,
    handleNewInstanceNameChange,
    handleCreateAndConnect,
    // Webhook setup state/handlers - Keep these if WebhookSetupForm is rendered here
    showWebhookSetup,
    pendingWebhookIntegrationId,
    handleWebhookSetupComplete,
    // Need refetch function from the hook to update list after delete/logout
    refetch: refetchInstances, // Assuming the hook exposes a refetch function for instances
  } = useIntegrationConnectionState(selectedIntegration, open, profileId); // Pass profileId to the hook

  // --- End hook call ---

  // --- Remove Logout Handler ---
  /*
  const handleLogout = async (instanceName: string) => {
      // ... (removed implementation)
  };
  */

  // --- Delete Handler ---
   const handleDelete = async (instanceName: string) => {
       if (!selectedIntegration?.id || !instanceName) {
           toast({ title: "Error", description: "Integration or Instance Name missing.", variant: "destructive" });
           return;
       }
       // Optional: Add confirmation dialog here before proceeding
       setIsDeleteLoading(instanceName);
       try {
           // Call the imported delete service
           const evolutionSuccess = await deleteEvolutionInstance(instanceName, selectedIntegration.id);

           if (evolutionSuccess) {
               // Optional: Consider removing the config row from Supabase as well
               // try { ... } catch { ... }

               // Refetch instance list after delete
               if (typeof refetchInstances === 'function') {
                 await refetchInstances(); // Ensure await if refetch is async
               }
               await queryClient.invalidateQueries({ queryKey: ['configuredIntegrations'] });
               await queryClient.invalidateQueries({ queryKey: ['integrations'] });
               // Show single success toast after refetch
               toast({ title: "Success", description: `Instance ${instanceName} deleted successfully.` });

           } else {
               toast({ title: "Deletion Failed", description: `Could not delete instance ${instanceName} from provider.`, variant: "destructive" });
           }
       } catch (error) {
           console.error(`Error deleting instance ${instanceName}:`, error);
           toast({ title: "Deletion Error", description: `Failed to delete: ${(error as Error).message}`, variant: "destructive" });
       } finally {
           setIsDeleteLoading(null);
       }
   };

  const handleClearData = async () => {
    if (!selectedIntegration?.id) {
      toast({
        title: "Error",
        description: "No integration selected",
        variant: "destructive",
      });
      return;
    }

    setIsClearing(true);
    try {
      // 1. Get the integration config IDs for the selected integration
      const { data: integrationConfigs, error: configError } = await supabase
        .from('integrations_config')
        .select('id')
        .eq('integration_id', selectedIntegration.id);

      if (configError) {
        throw configError;
      }

      if (!integrationConfigs || integrationConfigs.length === 0) {
        toast({
          title: "No data to clear",
          description: "No configuration found for this integration.",
        });
        setIsClearing(false);
        return;
      }

      const integrationConfigIds = integrationConfigs.map(config => config.id);
      let deletedItemsCount = 0;

      // 2. Get all conversations related to these integration configs
      const { data: conversations, error: conversationsError } = await supabase
        .from('conversations')
        .select('conversation_id')
        .in('integrations_id', integrationConfigIds);

      if (conversationsError) {
        throw conversationsError;
      }

      let conversationIds: string[] = [];
      if (conversations && conversations.length > 0) {
        conversationIds = conversations.map(c => c.conversation_id);
        deletedItemsCount += conversations.length;
      }

      // 3. Get all AI agent sessions related to these integration configs
      const { data: aiSessions, error: aiSessionsError } = await supabase
        .from('ai_agent_sessions')
        .select('id')
        .in('integrations_config_id', integrationConfigIds);

      if (aiSessionsError) {
        throw aiSessionsError;
      }

      let sessionIds: string[] = [];
      if (aiSessions && aiSessions.length > 0) {
        sessionIds = aiSessions.map(s => s.id);
        deletedItemsCount += aiSessions.length;
      }

      // 4. Delete in proper order to avoid foreign key constraint violations
      
      // Delete agent conversations (references ai_agent_sessions)
      if (sessionIds.length > 0) {
        const { error: agentConversationsError } = await supabase
          .from('agent_conversations')
          .delete()
          .in('session_id', sessionIds);

        if (agentConversationsError) {
          throw agentConversationsError;
        }
      }

      // Delete messages (references conversations)
      if (conversationIds.length > 0) {
        const { error: messagesError } = await supabase
          .from('messages')
          .delete()
          .in('conversation_id', conversationIds);

        if (messagesError) {
          throw messagesError;
        }
      }

      // Delete conversation participants (references conversations)
      if (conversationIds.length > 0) {
        const { error: participantsError } = await supabase
          .from('conversation_participants')
          .delete()
          .in('conversation_id', conversationIds);

        if (participantsError) {
          throw participantsError;
        }
      }

      // Delete conversation summaries (references conversations)
      if (conversationIds.length > 0) {
        const { error: summariesError } = await supabase
          .from('conversation_summaries')
          .delete()
          .in('conversation_id', conversationIds);

        if (summariesError && summariesError.code !== 'PGRST116') {
          throw summariesError;
        }
      }

      // Delete batch sentiment analysis details (references conversations)
      if (conversationIds.length > 0) {
        const { error: sentimentDetailsError } = await supabase
          .from('batch_sentiment_analysis_details')
          .delete()
          .in('conversation_id', conversationIds);

        if (sentimentDetailsError && sentimentDetailsError.code !== 'PGRST116') {
          throw sentimentDetailsError;
        }
      }

      // Delete broadcast recipients (references broadcasts)
      const { data: broadcasts, error: broadcastsQueryError } = await supabase
        .from('broadcasts')
        .select('id')
        .in('integration_config_id', integrationConfigIds);

      if (broadcastsQueryError) {
        throw broadcastsQueryError;
      }

      if (broadcasts && broadcasts.length > 0) {
        const broadcastIds = broadcasts.map(b => b.id);
        
        const { error: broadcastRecipientsError } = await supabase
          .from('broadcast_recipients')
          .delete()
          .in('broadcast_id', broadcastIds);

        if (broadcastRecipientsError) {
          throw broadcastRecipientsError;
        }
        
        deletedItemsCount += broadcasts.length;
      }

      // Delete broadcasts (references integrations_config)
      const { error: broadcastsError } = await supabase
        .from('broadcasts')
        .delete()
        .in('integration_config_id', integrationConfigIds);

      if (broadcastsError) {
        throw broadcastsError;
      }

      // Delete message logs (references integrations_config)
      const { error: messageLogsError } = await supabase
        .from('message_logs')
        .delete()
        .in('integration_config_id', integrationConfigIds);

      if (messageLogsError && messageLogsError.code !== 'PGRST116') {
        throw messageLogsError;
      }

      // Note: ai_agent_channels table may not exist in current schema

      // Delete AI agent sessions (references integrations_config)
      if (sessionIds.length > 0) {
        const { error: aiSessionsDeleteError } = await supabase
          .from('ai_agent_sessions')
          .delete()
          .in('id', sessionIds);

        if (aiSessionsDeleteError) {
          throw aiSessionsDeleteError;
        }
      }

      // Delete conversations (references integrations_config)
      if (conversationIds.length > 0) {
        const { error: deleteConversationsError } = await supabase
          .from('conversations')
          .delete()
          .in('conversation_id', conversationIds);

        if (deleteConversationsError) {
          throw deleteConversationsError;
        }
      }

      // Get and delete leads that were associated with the conversations
      if (conversationIds.length > 0) {
        // First get the lead IDs from conversations
        const { data: conversationsWithLeads, error: conversationsLeadsError } = await supabase
          .from('conversations')
          .select('lead_id')
          .in('conversation_id', conversationIds)
          .not('lead_id', 'is', null);

        if (conversationsLeadsError) {
          throw conversationsLeadsError;
        }

        if (conversationsWithLeads && conversationsWithLeads.length > 0) {
          const leadIds = conversationsWithLeads.map(c => c.lead_id).filter(Boolean);
          
          if (leadIds.length > 0) {
            // Delete lead tags first (references leads)
            const { error: leadTagsError } = await supabase
              .from('lead_tags')
              .delete()
              .in('lead_id', leadIds);

            if (leadTagsError && leadTagsError.code !== 'PGRST116') {
              throw leadTagsError;
            }

            // Delete lead pipeline entries (references leads)
            const { error: leadPipelineError } = await supabase
              .from('lead_pipeline')
              .delete()
              .in('lead_id', leadIds);

            if (leadPipelineError && leadPipelineError.code !== 'PGRST116') {
              throw leadPipelineError;
            }

            // Delete leads
            const { error: leadsError } = await supabase
              .from('leads')
              .delete()
              .in('id', leadIds);

            if (leadsError) {
              throw leadsError;
            }
            
            deletedItemsCount += leadIds.length;
          }
        }
      }

      if (deletedItemsCount > 0) {
        toast({
          title: "Success",
          description: `Cleared all related data including ${deletedItemsCount} main records (conversations, sessions, broadcasts, leads) and their associated data`,
        });
      } else {
        toast({
          title: "No data to clear",
          description: "No data found for this integration",
        });
      }
    } catch (error) {
      console.error("Error clearing data:", error);
      toast({
        title: "Error clearing data",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive",
      });
    } finally {
      setIsClearing(false);
    }
  };

  const handleRefreshWebhooks = async () => {
    if (!selectedIntegration?.id) return;
    
    setIsRefreshingWebhooks(true);
    try {
      await refreshWebhookSetupWithToast(selectedIntegration.id);
      // Optionally refresh instances after webhook setup
      if (typeof refetchInstances === 'function') {
        refetchInstances();
      }
    } catch (error) {
      console.error('Error refreshing webhooks:', error);
      toast({
        title: "Webhook Refresh Error",
        description: "Failed to refresh webhook setup. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsRefreshingWebhooks(false);
    }
  };

  // --- Helper function to render instance status ---
  const renderStatus = (status: ConnectionState | undefined) => {
    let statusText = "Unknown";
    let statusColor = "text-gray-400";
    let StatusIcon: React.ElementType | null = AlertCircle;

    switch (status) {
      case "open": statusText = "Connected"; statusColor = "text-green-600"; StatusIcon = CheckCircle; break;
      case "connecting":
      case "qrcode":
      case "pairingCode": statusText = "Connecting"; statusColor = "text-yellow-600"; StatusIcon = Loader2; break;
      case "close": statusText = "Closed"; statusColor = "text-gray-500"; StatusIcon = X; break;
      default: break; // Keep defaults
    }

    return (
      <span className={`inline-flex items-center gap-1 font-medium ${statusColor}`}>
        {StatusIcon && <StatusIcon className={`w-4 h-4 ${status === 'connecting' || status === 'qrcode' || status === 'pairingCode' ? 'animate-spin' : ''}`} />}
        {statusText}
      </span>
    );
  };
  // --- End Helper Function ---

  return (
    <Tabs defaultValue="settings" className="w-full">
      <TabsList className="w-full">
        <TabsTrigger value="settings" className="flex-1">Settings</TabsTrigger>
        <TabsTrigger value="authorization" className="flex-1">Authorization</TabsTrigger>
      </TabsList>

      {/* --- Render content for WhatsApp types (Evolution API) --- */}
      <>
        <TabsContent value="settings" className="space-y-6 max-h-[60vh] overflow-y-auto flex flex-col"> {/* Improved height and flex layout */}
          {/* --- Conditional Rendering Logic (Moved from WhatsAppBusinessSettings) --- */}
          {(() => {
              // Loading State
              if (isLoading || isFetchingInstances) {
                return (
                  <div className="flex items-center justify-center h-full">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <span className="ml-2">Loading configuration...</span>
                  </div>
                );
              }

              // QR Code / Pairing Code State
              if (connectionState === 'qrcode') {
                console.log("[IntegrationTabs] Rendering QR Code state. qrCodeBase64:", qrCodeBase64 ? qrCodeBase64.substring(0, 50) + '...' : qrCodeBase64, "pairingCode:", pairingCode); // Log state
                return (
                  <div className="space-y-4 pt-4">
                     <h3 className="text-lg font-semibold text-center">Scan QR or Enter Code</h3>
                    {pairingCode && (
                      <div className="p-4 bg-blue-50 border border-blue-100 rounded-lg text-center">
                        <p className="text-sm font-medium text-blue-800">Pairing Code</p>
                        <p className="text-xl font-bold tracking-wider mt-2">{pairingCode}</p>
                        <p className="text-xs text-blue-600 mt-2">
                          Enter this code in WhatsApp → Settings → Linked Devices → Link a Device
                        </p>
                      </div>
                    )}
                    <div className="flex items-center justify-center">
                       {/* Simplified Container Styling */}
                       <div
                         className="relative group bg-white p-4 rounded-xl"
                         style={{ width: '240px', height: '240px' }}
                       >
                         {qrCodeBase64 ? (
                           <img
                             src={qrCodeBase64}
                             alt="WhatsApp QR Code"
                             // Removed className and inline style
                             onError={(e) => console.error('QR code image error:', e)}
                           />
                         ) : (
                           <div className="w-full h-full flex items-center justify-center text-gray-400">
                             {pairingCode ? 'Use pairing code above' : 'Loading QR code...'}
                           </div>
                         )}
                         {/* Refresh Button Overlay */}
                         <Button
                            variant="outline"
                            size="icon"
                            className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-white/80 hover:bg-white"
                            onClick={() => handleConnect(selectedInstanceName)} // Call handleConnect with the selected instance name
                            disabled={isLoading}
                            title="Refresh QR Code"
                          >
                            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                          </Button>
                       </div>
                     </div>
                     <div className="text-center space-y-2">
                       <p className="text-sm text-muted-foreground">
                         To find WhatsApp's QR scanner, tap Settings ⚙️ {'>'} Linked Devices {'>'} Link a Device.
                       </p>
                       <p className="text-sm text-muted-foreground">
                         <a href="#" className="text-blue-600 hover:underline">Trouble connecting?</a>
                       </p>
                     </div>
                  </div>
                );
              }

              // No Instances State
              if (!isFetchingInstances && fetchedInstances.length === 0) {
                 return (
                   <div className="flex flex-col h-full">
                     <div className="flex-1 space-y-4 pt-4">
                       <div className="text-center mb-6">
                         <h3 className="text-xl font-semibold mb-2">Create WhatsApp Instance</h3>
                         <p className="text-sm text-muted-foreground">
                           No WhatsApp instances found. Enter a name to create your first instance.
                         </p>
                       </div>
                       <div className="space-y-4 max-w-md mx-auto">
                         <Input
                           value={newInstanceName}
                           onChange={e => handleNewInstanceNameChange(e.target.value)}
                           placeholder="Enter instance name"
                           className="w-full text-center"
                           disabled={isLoading}
                         />
                         {/* Pipeline Selection Dropdown - Added Here for first instance */}
                         <div className="space-y-2">
                           <Label htmlFor="pipeline-select-evo-first" className="text-center block">Assign to Pipeline (Optional)</Label>
                           <Select
                             value={selectedPipelineId}
                             onValueChange={setSelectedPipelineId}
                             disabled={isLoadingPipelines} // Disable while loading pipelines
                           >
                             <SelectTrigger id="pipeline-select-evo-first" className="w-full">
                               <SelectValue placeholder="Select a pipeline..." />
                             </SelectTrigger>
                             <SelectContent>
                               {isLoadingPipelines ? (
                                 <SelectItem value="loading" disabled>Loading pipelines...</SelectItem>
                               ) : pipelineError ? (
                                 <SelectItem value="error" disabled>Error loading pipelines</SelectItem>
                               ) : pipelines.length === 0 ? (
                                 <SelectItem value="no-pipelines" disabled>No pipelines found</SelectItem> // Simplified placeholder
                               ) : (
                                 pipelines.map((pipeline) => (
                                   <SelectItem key={pipeline.id} value={pipeline.id.toString()}>
                                     {pipeline.name}
                                   </SelectItem>
                                 ))
                               )}
                             </SelectContent>
                           </Select>
                           <p className="text-xs text-muted-foreground text-center">
                             Select a pipeline to automatically assign new leads from this WhatsApp instance.
                           </p>
                         </div>
                       </div>
                     </div>
                     {/* Create Button - Fixed at bottom */}
                     <div className="mt-6 pt-4 border-t">
                       <Button
                         variant="default"
                         size="lg"
                         onClick={() => handleCreateAndConnect(selectedPipelineId)} // Wrap in arrow function and pass ID
                         className="w-full h-12 text-lg font-semibold"
                         disabled={!newInstanceName.trim() || isLoading}
                       >
                         {isLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Plus className="mr-2 h-5 w-5" />}
                         Create & Connect
                       </Button>
                     </div>
                   </div>
                 );
               }

              // Instances Exist State
              return (
                <div className="space-y-4 pt-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold">Available WhatsApp Instances</h3>
                      <p className="text-sm text-muted-foreground">
                        Select an instance below to connect or manage.
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleRefreshWebhooks}
                        disabled={isRefreshingWebhooks}
                        title="Refresh Webhook Setup"
                      >
                        {isRefreshingWebhooks ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                        Refresh Webhooks
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          console.log('[IntegrationTabs] Refresh instances button clicked');
                          if (typeof refetchInstances === 'function') {
                            refetchInstances();
                          }
                        }}
                        disabled={isFetchingInstances}
                        title="Refresh Instances"
                      >
                        {isFetchingInstances ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                        Refresh
                      </Button>
                    </div>
                  </div>
                  <div className="border rounded-lg overflow-hidden"> {/* Added container for consistent styling */}
                    <Table>
                      <TableHeader>
                        <TableRow className="hover:bg-transparent bg-muted/50"> {/* Added subtle bg to header row */}
                          <TableHead className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Instance Name</TableHead>
                          <TableHead className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Status</TableHead>
                          <TableHead className="h-12 px-4 text-right align-middle font-medium text-muted-foreground">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {fetchedInstances.map((instance) => (
                          <TableRow key={instance.id || instance.name} className="hover:bg-muted/50"> {/* Added hover state */}
                            <TableCell className="p-4 align-middle font-medium">{instance.name || 'Unnamed Instance'}</TableCell>
                            <TableCell className="p-4 align-middle">{renderStatus(instance.connectionStatus as ConnectionState)}</TableCell>
                            <TableCell className="p-4 align-middle text-right">
                            <div className="flex items-center justify-end space-x-1"> {/* Wrapper div */}
                              {/* Connect Button */}
                              <Button
                                variant="outline"
                                size="sm"
                                // Wrap the call in an arrow function
                                onClick={() => { 
                                  console.log(`[IntegrationTabs] Connect button clicked for instance: ${instance.name}. Pipeline: ${selectedPipelineId}`);
                                  if (instance.name) {
                                    // Pass selectedPipelineId to handleConnect
                                    handleConnect(instance.name, selectedPipelineId); 
                                  } else {
                                    console.warn("[IntegrationTabs] Connect button clicked but instance name is missing.");
                                  }
                                }}
                                // Only disable if open, no name, or delete is loading
                                disabled={!instance.name || instance.connectionStatus === 'open' || isLoading || isDeleteLoading === instance.name}
                                title="Connect Instance"
                              >
                                {isLoading && connectionState === 'connecting' && !isDeleteLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Power className="h-4 w-4" />}
                                <span className="sr-only">Connect</span>
                              </Button> {/* Close Connect Button */}

                              {/* Remove Logout Button */}
                              {/* {instance.connectionStatus === 'open' && ( ... )} */}

                              {/* Delete Button - Now enabled regardless of connection status */}
                              <Button
                                variant="ghost"
                                size="sm"
                                className="px-2" // Keep padding
                                onClick={() => instance.name && handleDelete(instance.name)}
                                disabled={!instance.name || isDeleteLoading === instance.name} // Only disable if delete is loading for this instance
                                title="Delete Instance"
                              >
                                {isDeleteLoading === instance.name ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4 text-red-600" />}
                                 <span className="sr-only">Delete</span>
                              </Button> {/* Close Delete Button */}
                            </div> {/* Close wrapper div */}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  </div> {/* Close container div */}
                  {/* Section to create additional instances */}
                  <div className="pt-4 border-t mt-4">
                    <h4 className="text-md font-semibold mb-2">Create New Instance</h4>
                    <div className="flex gap-2">
                      <Input
                        value={newInstanceName}
                        onChange={e => handleNewInstanceNameChange(e.target.value)}
                        placeholder="Enter new instance name"
                        className="flex-grow"
                        disabled={isLoading}
                      />
                     </div>
                     {/* Pipeline Selection Dropdown - Moved Here */}
                     <div className="space-y-2 pt-4">
                       <Label htmlFor="pipeline-select-evo">Assign to Pipeline (Optional)</Label>
                       <Select
                         value={selectedPipelineId}
                         onValueChange={setSelectedPipelineId}
                         disabled={isLoadingPipelines} // Disable while loading pipelines
                       >
                         <SelectTrigger id="pipeline-select-evo" className="w-full">
                           <SelectValue placeholder="Select a pipeline..." />
                         </SelectTrigger>
                         <SelectContent>
                           {isLoadingPipelines ? (
                             <SelectItem value="loading" disabled>Loading pipelines...</SelectItem>
                           ) : pipelineError ? (
                             <SelectItem value="error" disabled>Error loading pipelines</SelectItem>
                           ) : pipelines.length === 0 ? (
                             <SelectItem value="no-pipelines" disabled>No pipelines found for this integration</SelectItem> // Updated placeholder
                           ) : (
                             pipelines.map((pipeline) => (
                               <SelectItem key={pipeline.id} value={pipeline.id.toString()}>
                                 {pipeline.name}
                               </SelectItem>
                             ))
                           )}
                         </SelectContent>
                       </Select>
                       <p className="text-sm text-muted-foreground">
                         Select a pipeline to automatically assign new leads from this WhatsApp instance.
                       </p>
                     </div>
                     {/* Create Button - Now below pipeline selection */}
                     <Button
                       variant="default"
                       // Wrap the call in an arrow function
                       onClick={() => handleCreateAndConnect(selectedPipelineId)}
                       disabled={!newInstanceName.trim() || isLoading}
                       className="w-full mt-4" // Added margin top
                     >
                       {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                       Create & Connect
                     </Button>
                  </div>
                </div>
              );
            })()}
            {/* --- End Conditional Rendering --- */}
          </TabsContent>

          <TabsContent value="authorization" className="mt-0 pt-4 max-h-[60vh] overflow-y-auto flex flex-col justify-start">
            <div className="space-y-2">
              <h2 className="text-xl font-semibold">WhatsApp Business Authorization</h2>
              <p className="text-sm text-muted-foreground">
                Manage the API key for your WhatsApp connection. This key is required to authenticate with the WhatsApp Business API.
              </p>
            </div>
            <WhatsAppBusinessAuthorization selectedIntegration={selectedIntegration} />
          </TabsContent>
        </>
      {/* Removed the closing parenthesis of the ternary operator that is no longer needed */}

      <div className="mt-6 flex justify-end gap-2">
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" disabled={isClearing}>
              {isClearing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Clearing...
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Clear Data
                </>
              )}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Clear Integration Data</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete all conversations, messages, and participants related to this integration.
                This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleClearData}>
                Yes, Clear Data
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <Button variant="outline" onClick={onClose}>
          Close
        </Button>
      </div>
    </Tabs>
  );
}
