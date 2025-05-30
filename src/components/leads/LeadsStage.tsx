import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card"; // Import Card parts
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { AddLeadDialog } from "./AddLeadDialog";
import { cn } from "@/lib/utils";
import { Draggable, Droppable } from "@hello-pangea/dnd";
import type { Lead } from "@/components/dashboard/conversations/types";
import { LeadCard } from "./components/LeadCard"; // Import the new component
import { Plus } from "lucide-react"; // Import Plus for the button

interface LeadsStageProps {
  name: string;
  id: string;
  index?: number;
  leads: Lead[];
  onLeadClick: (lead: Lead) => void;
}

const stageColors = {
  0: "border-gray-400", // Incoming leads - neutral gray
  1: "border-blue-300", // Contacted - light blue
  2: "border-yellow-200", // Qualified - light yellow
  3: "border-orange-200", // Nurturing - light orange
};

export function LeadsStage({ name, id, index = 0, leads, onLeadClick }: LeadsStageProps) {
  const [isAddLeadOpen, setIsAddLeadOpen] = useState(false);

  const handleLeadAdded = () => {
    setIsAddLeadOpen(false);
  };

  return (
    <Card className="min-w-[280px] w-[280px] h-full flex flex-col bg-muted/60"> {/* Stage as a Card */}
      <CardHeader className={cn(
        "border-b-2 pb-3 pt-4 px-4", // Adjusted padding
        stageColors[index as keyof typeof stageColors] || "border-gray-400"
      )}>
        <div className="flex justify-between items-center">
          <CardTitle className="text-base font-semibold uppercase tracking-wider">{name}</CardTitle>
          <span className="text-xs font-medium text-muted-foreground">
            {leads.length} {leads.length === 1 ? "lead" : "leads"} - {leads.reduce((sum, lead) => sum + (lead.value || 0), 0).toLocaleString()} RM
          </span>
        </div>
      </CardHeader>

      <CardContent className="flex-1 overflow-y-auto p-3 space-y-3"> {/* Content area scrolls */}
        <Droppable droppableId={id}>
          {(provided, snapshot) => (
            <div
              ref={provided.innerRef}
              {...provided.droppableProps}
              className={cn(
                "min-h-[150px] rounded-md transition-colors",
                snapshot.isDraggingOver && "bg-primary/10" 
              )}
            >
              {leads.map((lead, leadIndex) => (
                <Draggable
                  key={lead.id}
                  draggableId={lead.id}
                  index={leadIndex}
                >
                  {(providedDraggable, snapshotDraggable) => (
                    <div
                      ref={providedDraggable.innerRef}
                      {...providedDraggable.draggableProps}
                      {...providedDraggable.dragHandleProps}
                      className={cn(
                        "mb-3", // Add margin bottom to space out cards
                        snapshotDraggable.isDragging && "opacity-50"
                      )}
                      onClick={() => onLeadClick(lead)}
                    >
                      <LeadCard lead={lead} /> 
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </CardContent>

      <CardFooter className="p-3 border-t">
        <Button
          variant="outline"
          className="w-full text-sm"
          onClick={() => setIsAddLeadOpen(true)}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add lead
        </Button>
      </CardFooter>

      <AddLeadDialog
        isOpen={isAddLeadOpen}
        onClose={() => setIsAddLeadOpen(false)}
        pipelineStageId={id}
        onLeadAdded={handleLeadAdded}
      />
    </Card>
  );
}
