
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { LeadsStage } from "../LeadsStage";
import { PipelineStage, Lead } from "../hooks/usePipelineData";
import { moveLead } from "@/components/leads/services/leadService";

interface PipelineBoardProps {
  stages: PipelineStage[];
  leads: Lead[];
  onDataChange: () => void;
}

export function PipelineBoard({ stages, leads, onDataChange }: PipelineBoardProps) {
  const getLeadsForStage = (stageId: string) => {
    return leads.filter(lead => lead.pipeline_stage_id === stageId);
  };

  const handleDragEnd = async (result: any) => {
    const { destination, source, draggableId } = result;

    // Dropped outside a valid droppable area
    if (!destination) return;

    // Dropped in the same position
    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return;
    }

    // Move lead in the database
    try {
      await moveLead(
        draggableId,
        source.droppableId,
        destination.droppableId,
        destination.index
      );
      
      // Refresh data after successful move
      onDataChange();
    } catch (error) {
      console.error('Error moving lead:', error);
    }
  };

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="flex gap-4 h-full overflow-x-auto pb-4">
        {stages.map((stage) => (
          <Droppable key={stage.id} droppableId={stage.id}>
            {(provided) => (
              <div 
                className="w-72 flex-shrink-0 bg-muted/40 rounded-lg overflow-hidden flex flex-col"
                {...provided.droppableProps}
                ref={provided.innerRef}
              >
                <LeadsStage 
                  stage={stage} 
                  leads={getLeadsForStage(stage.id)} 
                />
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        ))}
      </div>
    </DragDropContext>
  );
}
