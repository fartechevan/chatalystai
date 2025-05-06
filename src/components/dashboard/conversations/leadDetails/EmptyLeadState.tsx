
import { Info } from "lucide-react";
// Removed duplicate Info import
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { createLead } from "@/components/leads/services/leadService";
import { useToast } from "@/components/ui/use-toast";
import type { Database } from "@/types/supabase"; // Import Database type
type PipelineStage = Database['public']['Tables']['pipeline_stages']['Row']; // Define PipelineStage type locally

interface EmptyLeadStateProps {
  conversationId: string;
  onLeadCreated: (leadId: string) => void;
}

export function EmptyLeadState({ conversationId, onLeadCreated }: EmptyLeadStateProps) {
  const [targetPipelineStageId, setTargetPipelineStageId] = useState<string | null>(null); // Renamed state
  const [targetPipelineId, setTargetPipelineId] = useState<string | null>(null); // Renamed state
  const [userId, setUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true); // Start loading true
  const [customerInfo, setCustomerInfo] = useState<{
    id: string | null;
    name: string;
    phone_number: string;
  } | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true); // Ensure loading state is true at the start
      let fetchedPipelineId: string | null = null;
      let fetchedStageId: string | null = null;

      // Fetch customer information and conversation details in parallel
      if (!conversationId) {
        setIsLoading(false);
        return;
      }

      const [participantResult, conversationResult, sessionResult] = await Promise.all([
        supabase
          .from('conversation_participants')
          .select('id, role, customer_id, external_user_identifier')
          .eq('conversation_id', conversationId)
          .eq('role', 'member')
          .maybeSingle(),
        supabase
          .from('conversations')
          .select('integrations_id') // Corrected column name
          .eq('conversation_id', conversationId)
          .single(),
        supabase.auth.getSession()
      ]);

      // Process participant/customer data
      const { data: participantData, error: participantError } = participantResult;
      if (participantError) {
        console.error("Error fetching conversation participant:", participantError);
      } else if (participantData) {
        if (participantData.customer_id) {
          const { data: customerData, error: customerError } = await supabase
            .from('customers')
            .select('*')
            .eq('id', participantData.customer_id)
            .single();
          if (customerError) console.error("Error fetching customer data:", customerError);
          else if (customerData) setCustomerInfo({ id: customerData.id, name: customerData.name, phone_number: customerData.phone_number });
        } else if (participantData.external_user_identifier) {
          setCustomerInfo({ id: null, name: participantData.external_user_identifier || "Unknown", phone_number: participantData.external_user_identifier || "" });
        }
      }

      // Process user session
      setUserId(sessionResult?.data?.session?.user?.id || null);

      // Process conversation and integration config to find target pipeline
      const { data: conversationData, error: conversationError } = conversationResult;
      if (conversationError) {
        console.error("Error fetching conversation data:", conversationError);
      } else if (conversationData?.integrations_id) { // Corrected property access
        const { data: integrationConfig, error: configError } = await supabase
          .from('integrations_config')
          .select('pipeline_id')
          .eq('integration_id', conversationData.integrations_id) // Corrected property access
          .maybeSingle();

        if (configError) {
          console.error("Error fetching integration config:", configError);
        } else if (integrationConfig && 'pipeline_id' in integrationConfig && integrationConfig.pipeline_id) {
          // Type guard: Check integrationConfig exists, has pipeline_id property, and it's truthy
          const pipelineIdToFetch = integrationConfig.pipeline_id; // Safely access the ID

          // Found pipeline_id in config, fetch this specific pipeline
          const { data: specificPipeline, error: specificPipelineError } = await supabase
            .from('pipelines')
            .select('id, stages:pipeline_stages(id, position)')
            .eq('id', pipelineIdToFetch as string) // Explicitly cast to string
            .limit(1)
            .single();

          if (specificPipelineError) {
            console.error("Error fetching integration-specific pipeline:", specificPipelineError);
            // Fallback handled below
          } else if (specificPipeline) {
            fetchedPipelineId = specificPipeline.id;
            if (specificPipeline.stages && specificPipeline.stages.length > 0) {
              const sortedStages = [...(specificPipeline.stages as PipelineStage[])].sort((a, b) => a.position - b.position);
              fetchedStageId = sortedStages[0].id;
            }
          }
        }
      }

      // Fallback: If no integration-specific pipeline was found, fetch default/first pipeline
      if (!fetchedPipelineId || !fetchedStageId) {
        // Fetch default pipeline first
        const { data: defaultPipeline, error: pipelineError } = await supabase
          .from('pipelines')
          .select('id, stages:pipeline_stages(id, position)')
          .eq('is_default', true)
          .limit(1)
          .single();

        if (pipelineError && pipelineError.code !== 'PGRST116') { // PGRST116 = no rows found, which is okay here
          console.error("Error fetching default pipeline:", pipelineError);
        }

        if (defaultPipeline) {
           fetchedPipelineId = defaultPipeline.id;
           if (defaultPipeline.stages && defaultPipeline.stages.length > 0) {
             const sortedStages = [...(defaultPipeline.stages as PipelineStage[])].sort((a, b) => a.position - b.position);
             fetchedStageId = sortedStages[0].id;
           }
        } else {
           // If no default pipeline found (or error fetching it), get any pipeline
           const { data: anyPipeline, error: anyPipelineError } = await supabase
             .from('pipelines')
             .select('id, stages:pipeline_stages(id, position)')
             .limit(1)
             .single();

           if (anyPipelineError) {
             console.error("Error fetching any pipeline:", anyPipelineError);
             toast({ title: "Error", description: "Failed to fetch any pipeline information.", variant: "destructive" });
           } else if (anyPipeline) {
             fetchedPipelineId = anyPipeline.id;
             if (anyPipeline.stages && anyPipeline.stages.length > 0) {
               const sortedStages = [...(anyPipeline.stages as PipelineStage[])].sort((a, b) => a.position - b.position);
               fetchedStageId = sortedStages[0].id;
             }
           }
        }
      } // Closes outer else if (conversationData?.integrations_id)

      // Set the final target pipeline and stage
      setTargetPipelineId(fetchedPipelineId);
      setTargetPipelineStageId(fetchedStageId);
      setIsLoading(false); // Done loading
    };

    fetchData();
  }, [conversationId, toast]);

  const handleCreateLead = async () => {
    const stageToUse = targetPipelineStageId; // Use the determined stage ID

    if (!stageToUse || !userId) {
      toast({
        title: "Error",
        description: "Missing target pipeline stage or user information.",
        variant: "destructive",
      });
      return;
    }

    if (!customerInfo) {
      toast({
        title: "Error",
        description: "No customer information found for this conversation.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true); // Set loading for the creation process

    try {
      // If we already have a customer id, use it directly
      if (customerInfo.id) {
        const result = await createLead({
          name: customerInfo.name || "",
          value: 0,
          pipelineStageId: stageToUse, // Use determined stage
          userId: userId,
          customerId: customerInfo.id
        });

        if (result.success && result.leadId) {
          // Connect the lead to the conversation
          const { error: updateError } = await supabase
            .from('conversations')
            .update({ lead_id: result.leadId })
            .eq('conversation_id', conversationId);

          if (updateError) {
            console.error("Error connecting lead to conversation:", updateError);
            toast({
              title: "Warning",
              description: "Lead created but failed to connect to conversation.",
              variant: "destructive",
            });
          } else {
            toast({
              title: "Success",
              description: "Lead created and connected to conversation!",
            });
          }
          onLeadCreated(result.leadId); // Call callback even if connection fails slightly
        } else {
          toast({
            title: "Error",
            description: `Failed to create lead: ${result.error || 'Unknown error'}`,
            variant: "destructive",
          });
        }
      } else {
        // Create a customer first, then the lead
        const result = await createLead({
          name: customerInfo.name || "",
          value: 0,
          pipelineStageId: stageToUse, // Use determined stage
          userId: userId,
          customerInfo: {
            name: customerInfo.name || "",
            phone_number: customerInfo.phone_number || "",
          },
        });

        if (result.success && result.leadId) {
          // Now connect the lead to the conversation
          const { error: updateError } = await supabase
            .from('conversations')
            .update({ lead_id: result.leadId })
            .eq('conversation_id', conversationId);

          if (updateError) {
            console.error("Error connecting lead to conversation:", updateError);
            toast({
              title: "Warning",
              description: "Lead created but failed to connect to conversation.",
              variant: "destructive",
            });
          } else {
            // Now also update the participant with the new customer_id
            if (result.customerId) {
              const { error: participantError } = await supabase
                .from('conversation_participants')
                .update({ customer_id: result.customerId })
                .eq('conversation_id', conversationId)
                .eq('role', 'member');

              if (participantError) {
                console.error("Error updating participant with customer ID:", participantError);
                // Non-critical, don't block success toast
              }
            }

            toast({
              title: "Success",
              description: "Lead created and connected to conversation!",
            });
          }
          onLeadCreated(result.leadId); // Call callback even if connection fails slightly
        } else {
          toast({
            title: "Error",
            description: `Failed to create lead: ${result.error || 'Unknown error'}`,
            variant: "destructive",
          });
        }
      }
    } catch (error) {
      console.error("Error creating lead:", error);
      toast({
        title: "Error",
        description: "An unexpected error occurred while creating the lead.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false); // Done with creation attempt
    }
  };

  // Determine button state and text based on loading and data availability
  const isButtonDisabled = isLoading || !targetPipelineStageId || !customerInfo || !userId;
  const buttonText = isLoading ? "Loading..." : "Create new lead";

  return (
    <div className="flex flex-col items-center justify-center p-8 h-full space-y-4 text-center">
      <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
        <Info className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="font-medium text-lg">No lead details</h3>
      <p className="text-muted-foreground text-sm max-w-[220px]">
        This conversation is not connected to any lead yet.
      </p>
      <Button
        variant="default"
        size="sm"
        onClick={handleCreateLead}
        disabled={isButtonDisabled}
        className="w-full max-w-[220px]"
      >
        {buttonText}
      </Button>

      {/* Show specific messages if data is missing after initial load */}
      {!isLoading && !targetPipelineStageId && (
        <p className="text-xs text-muted-foreground">
          Could not determine target pipeline. Please check integration settings or create a default pipeline.
        </p>
      )}

      {!isLoading && !customerInfo && (
        <p className="text-xs text-muted-foreground">
          No customer information found for this conversation.
        </p>
      )}
    </div>
  );
}
