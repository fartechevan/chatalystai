
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { AddLeadDialog } from "./AddLeadDialog";
import { cn } from "@/lib/utils";
import { Draggable, Droppable } from "@hello-pangea/dnd";
// Building, User, DollarSign are now used in LeadCard
import type { Lead } from "@/components/dashboard/conversations/types";
import { LeadCard } from "./components/LeadCard"; // Import the new component

interface LeadsStageProps {
  name: string;
  id: string;
  index?: number;
  leads: Lead[];
  onLeadClick: (lead: Lead) => void; // Add prop for click handling
}

const stageColors = {
  0: "border-gray-400", // Incoming leads - neutral gray
  1: "border-blue-300", // Contacted - light blue
  2: "border-yellow-200", // Qualified - light yellow
  3: "border-orange-200", // Nurturing - light orange
};

export function LeadsStage({ name, id, index = 0, leads, onLeadClick }: LeadsStageProps) { // Add onLeadClick to destructuring
  const [isAddLeadOpen, setIsAddLeadOpen] = useState(false);

  const handleLeadAdded = () => {
    // This will be handled by the realtime subscription in LeadsContent
    setIsAddLeadOpen(false);
  };

  // formatCurrency function moved to LeadCard

  return (
    // Remove flex-1, rely on min-width and parent flex container
    <div className="min-w-[250px]"> 
      <div className={cn(
        "border-b-2 pb-2 mb-4",
        stageColors[index as keyof typeof stageColors] || "border-gray-400"
      )}>
        <div className="flex flex-col">
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
            {name}
          </h3>
          <div className="text-sm">
            {leads.length} leads: {leads.reduce((sum, lead) => sum + (lead.value || 0), 0).toLocaleString()} RM
          </div>
        </div>
      </div>

      <Droppable droppableId={id}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={cn(
              "space-y-2 min-h-[200px] rounded-lg transition-colors p-2",
              snapshot.isDraggingOver && "bg-muted/50"
            )}
          >
            {leads.map((lead, leadIndex) => (
              <Draggable
                key={lead.id}
                draggableId={lead.id}
                index={leadIndex}
              >
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.draggableProps}
                    {...provided.dragHandleProps}
                    className={cn(
                      "transition-all duration-300 ease-in-out", // Changed to ease-in-out
                      snapshot.isDragging && "opacity-50"
                    )}
                    onClick={() => onLeadClick(lead)} // Keep onClick on the wrapper div
                  >
                    {/* Use the LeadCard component */}
                    <LeadCard lead={lead} /> 
                  </div>
                )}
              </Draggable>
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>

      <Button
        variant="ghost"
        className="w-full mt-2 border border-dotted border-black"
        onClick={() => setIsAddLeadOpen(true)}
      >
        Add lead
      </Button>

      <AddLeadDialog
        isOpen={isAddLeadOpen}
        onClose={() => setIsAddLeadOpen(false)}
        pipelineStageId={id}
        onLeadAdded={handleLeadAdded}
      />
    </div>
  );
}
