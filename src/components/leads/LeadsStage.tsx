
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { AddLeadDialog } from "./AddLeadDialog";
import { cn } from "@/lib/utils";
import { Draggable, Droppable } from "@hello-pangea/dnd";
import { Building, User, DollarSign } from "lucide-react";

interface Lead {
  id: string;
  name: string;
  value: number;
  company_name: string | null;
  contact_first_name: string | null;
}

interface LeadsStageProps {
  name: string;
  id: string;
  index?: number;
  leads: Lead[];
}

const stageColors = {
  0: "border-gray-400", // Incoming leads - neutral gray
  1: "border-blue-300", // Contacted - light blue
  2: "border-yellow-200", // Qualified - light yellow
  3: "border-orange-200", // Nurturing - light orange
};

export function LeadsStage({ name, id, index = 0, leads }: LeadsStageProps) {
  const [isAddLeadOpen, setIsAddLeadOpen] = useState(false);

  const handleLeadAdded = () => {
    // This will be handled by the realtime subscription in LeadsContent
    setIsAddLeadOpen(false);
  };

  const formatCurrency = (value: number | null | undefined) => {
    if (value === null || value === undefined) return '0 RM';
    return `${value.toLocaleString()} RM`;
  };

  return (
    <div className="flex-1 min-w-[250px]">
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
                      "transition-all",
                      snapshot.isDragging && "opacity-50"
                    )}
                  >
                    <Card className="p-3 hover:shadow-md transition-shadow">
                      <div className="font-medium">{lead.name}</div>
                      
                      <div className="mt-2 flex items-center text-xs text-muted-foreground">
                        {lead.company_name ? (
                          <div className="flex items-center mr-3">
                            <Building className="h-3 w-3 mr-1" />
                            <span>{lead.company_name}</span>
                          </div>
                        ) : null}
                        
                        {lead.contact_first_name ? (
                          <div className="flex items-center">
                            <User className="h-3 w-3 mr-1" />
                            <span>{lead.contact_first_name}</span>
                          </div>
                        ) : null}
                        
                        {!lead.company_name && !lead.contact_first_name && (
                          <span>No additional info</span>
                        )}
                      </div>
                      
                      <div className="text-sm font-medium mt-2 flex items-center">
                        <DollarSign className="h-3.5 w-3.5 mr-1" />
                        {formatCurrency(lead.value)}
                      </div>
                    </Card>
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
