import { Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { createLead } from "@/components/leads/services/leadService";
import { useToast } from "@/components/ui/use-toast";

interface EmptyLeadStateProps {
  conversationId: string;
  onLeadCreated: (leadId: string) => void;
}

export function EmptyLeadState({ conversationId, onLeadCreated }: EmptyLeadStateProps) {
  const [defaultPipelineStageId, setDefaultPipelineStageId] = useState<string | null>(null);
  const [defaultPipelineId, setDefaultPipelineId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const fetchData = async () => {
      // Fetch default pipeline
      const { data: defaultPipeline, error: pipelineError } = await supabase
        .from('pipelines')
        .select('id, stages:pipeline_stages(id, position)')
        .eq('is_default', true)
        .limit(1)
        .single();

      if (pipelineError) {
        console.error("Error fetching default pipeline:", pipelineError);

        // If no default pipeline found, get any pipeline
        const { data: anyPipeline, error: anyPipelineError } = await supabase
          .from('pipelines')
          .select('id, stages:pipeline_stages(id, position)')
          .limit(1)
          .single();

        if (anyPipelineError) {
          console.error("Error fetching any pipeline:", anyPipelineError);
          toast({
            title: "Error",
            description: "Failed to fetch pipeline information.",
            variant: "destructive",
          });
          return;
        }

        if (anyPipeline) {
          setDefaultPipelineId(anyPipeline.id);

          // Find the first stage in the pipeline
          if (anyPipeline.stages && anyPipeline.stages.length > 0) {
            // Sort stages by position
            const sortedStages = [...anyPipeline.stages].sort((a, b) => a.position - b.position);
            setDefaultPipelineStageId(sortedStages[0].id);
          }
        }
      } else if (defaultPipeline) {
        setDefaultPipelineId(defaultPipeline.id);

        // Find the first stage in the default pipeline
        if (defaultPipeline.stages && defaultPipeline.stages.length > 0) {
          // Sort stages by position
          const sortedStages = [...defaultPipeline.stages].sort((a, b) => a.position - b.position);
          setDefaultPipelineStageId(sortedStages[0].id);
        }
      }

      // Fetch current user
      const { data: session } = await supabase.auth.getSession();
      setUserId(session?.session?.user?.id || null);
    };

    fetchData();
  }, [toast]);

  const handleCreateLead = async () => {
    if (!defaultPipelineStageId || !userId) {
      toast({
        title: "Error",
        description: "Missing pipeline information or user information.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const result = await createLead({
        name: "",
        value: 0,
        pipelineStageId: defaultPipelineStageId,
        userId: userId,
        customerInfo: {
          name: "",
          phone_number: "", // We'll update this later with conversation data
        },
      });

      if (result.success) {
        // Now connect the lead to the conversation
        const { error: updateError } = await supabase
          .from('conversations')
          .update({ lead_id: result.leadId })
          .eq('conversation_id', conversationId);

        if (updateError) {
          console.error("Error connecting lead to conversation:", updateError);
          toast({
            title: "Warning",
            description: "Lead created but not connected to conversation.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Success",
            description: "Lead created and connected to conversation!",
          });
        }

        onLeadCreated(result.leadId);
      } else {
        toast({
          title: "Error",
          description: `Failed to create lead: ${result.error}`,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error creating lead:", error);
      toast({
        title: "Error",
        description: "Failed to create lead.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

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
        disabled={isLoading || !defaultPipelineStageId}
        className="w-full max-w-[220px]"
      >
        {isLoading ? "Creating..." : "Create new lead"}
      </Button>

      {!defaultPipelineStageId && (
        <p className="text-xs text-muted-foreground">
          No pipeline available. Please create a pipeline first.
        </p>
      )}
    </div>
  );
}
