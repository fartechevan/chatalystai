import { Skeleton } from "@/components/ui/skeleton";
import { LeadsHeader } from "./LeadsHeader";
import { LeadsStage } from "./LeadsStage";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { DragDropContext } from "@hello-pangea/dnd";
import { useToast } from "@/hooks/use-toast";

interface LeadsContentProps {
  pipelineId: string | null;
}

interface Lead {
  id: string;
  name: string;
  value: number;
  company_name: string | null;
  contact_first_name: string | null;
}

interface StageLeads {
  [key: string]: Lead[];
}

export function LeadsContent({ pipelineId }: LeadsContentProps) {
  const { toast } = useToast();
  const [stages, setStages] = useState<Array<{ id: string; name: string; position: number }>>([]);
  const [stageLeads, setStageLeads] = useState<StageLeads>({});
  const [loading, setLoading] = useState(true);

  const loadStages = async () => {
    if (!pipelineId) return;

    const { data, error } = await supabase
      .from('pipeline_stages')
      .select('id, name, position')
      .eq('pipeline_id', pipelineId)
      .order('position');

    if (!error && data) {
      setStages(data);
      
      const leadsData: StageLeads = {};
      for (const stage of data) {
        const { data: stageLeadsData, error: leadsError } = await supabase
          .from('lead_pipeline')
          .select(`
            lead:leads (
              id,
              name,
              value,
              company_name,
              contact_first_name
            )
          `)
          .eq('stage_id', stage.id)
          .order('position');

        if (leadsError) {
          console.error('Error fetching leads for stage', stage.id, leadsError);
          leadsData[stage.id] = [];
        } else {
          leadsData[stage.id] = stageLeadsData?.map(item => item.lead) || [];
        }
      }
      setStageLeads(leadsData);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadStages();
  }, [pipelineId]);

  useEffect(() => {
    if (!pipelineId) return;

    const channel = supabase
      .channel('lead-pipeline-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'lead_pipeline'
        },
        () => {
          loadStages();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [pipelineId]);

  const handleDragEnd = async (result: any) => {
    if (!result.destination) return;

    const sourceStageId = result.source.droppableId;
    const destinationStageId = result.destination.droppableId;
    const leadId = result.draggableId;

    const sourceStageIndex = stages.findIndex(stage => stage.id === sourceStageId);
    const destStageIndex = stages.findIndex(stage => stage.id === destinationStageId);

    if (sourceStageIndex === 1 && destStageIndex === 0) {
      toast({
        title: "Operation not allowed",
        description: "Cannot move a lead back to the incoming stage",
        variant: "destructive",
      });
      return;
    }

    try {
      const newStageLeads = { ...stageLeads };
      const [movedLead] = newStageLeads[sourceStageId].splice(result.source.index, 1);
      newStageLeads[destinationStageId].splice(result.destination.index, 0, movedLead);
      setStageLeads(newStageLeads);

      const { error } = await supabase
        .from('lead_pipeline')
        .update({
          stage_id: destinationStageId,
          position: result.destination.index
        })
        .eq('lead_id', leadId);

      if (error) throw error;

      const { error: leadUpdateError } = await supabase
        .from('leads')
        .update({
          pipeline_stage_id: destinationStageId
        })
        .eq('id', leadId);

      if (leadUpdateError) {
        console.error('Error updating lead pipeline_stage_id:', leadUpdateError);
      }

      toast({
        title: "Lead moved",
        description: `Lead moved to ${stages[destStageIndex].name}`,
      });
    } catch (error) {
      console.error('Error moving lead:', error);
      loadStages();
      toast({
        title: "Error",
        description: "Failed to move lead",
        variant: "destructive",
      });
    }
  };

  if (!pipelineId) {
    return (
      <div className="p-8">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-2xl font-semibold tracking-tight">
            Select a Pipeline
          </h2>
          <p className="text-muted-foreground mt-2">
            Choose a pipeline from the sidebar to view and manage your leads.
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-8">
        <Skeleton className="h-[40px] w-[300px] mb-6" />
        <div className="flex gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex-1">
              <Skeleton className="h-[200px]" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <LeadsHeader selectedPipelineId={pipelineId} />
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="flex-1 overflow-x-auto p-6">
          <div className="flex gap-6 min-w-max">
            {stages.map((stage, index) => (
              <LeadsStage
                key={stage.id}
                id={stage.id}
                name={stage.name}
                index={index}
                leads={stageLeads[stage.id] || []}
              />
            ))}
          </div>
        </div>
      </DragDropContext>
    </div>
  );
}
