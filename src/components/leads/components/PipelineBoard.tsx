
import React from "react";
import { DragDropContext, DropResult } from "@hello-pangea/dnd";
import { LeadsStage } from "../LeadsStage";
import { StageLeads, PipelineStage } from "../hooks/usePipelineData";
import { moveLead } from "../services/leadService";
import { useToast } from "@/hooks/use-toast";

interface PipelineBoardProps {
  stages: PipelineStage[];
  stageLeads: StageLeads;
  onLeadMoved: () => void;
}

export function PipelineBoard({ stages, stageLeads, onLeadMoved }: PipelineBoardProps) {
  const { toast } = useToast();
 
   const handleDragEnd = async (result: DropResult) => {
     if (!result.destination) return;
     // console.log("Drag end:", result); // Removed log
 
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
      const { success, error } = await moveLead(
        leadId, 
        sourceStageId, 
        destinationStageId, 
        result.destination.index
      );
      
      if (!success) throw error;

      toast({
        title: "Lead moved",
        description: `Lead moved to ${stages[destStageIndex].name}`,
      });
      
      onLeadMoved();
    } catch (error) {
      console.error('Error moving lead:', error);
      toast({
        title: "Error",
        description: "Failed to move lead",
        variant: "destructive",
      });
      onLeadMoved();
    }
  };

  return (
    // DragDropContext should be the outermost wrapper
    <DragDropContext onDragEnd={handleDragEnd}>
      {/* Outer container takes flexible vertical space */}
      <div className="flex-1 overflow-hidden"> 
        {/* Inner container handles horizontal scrolling and padding */}
        <div className="h-full overflow-x-auto p-6"> 
          <div className="flex gap-6 min-w-max h-full"> {/* Ensure inner flex container also takes height */}
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
      </div>
    </DragDropContext>
  );
}
