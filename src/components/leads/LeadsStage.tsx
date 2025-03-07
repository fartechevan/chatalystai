
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building, Phone, Mail } from "lucide-react";
import { Draggable } from "@hello-pangea/dnd";
import { PipelineStage, Lead } from "./hooks/usePipelineData";
import { formatCurrency } from "@/lib/utils";

interface LeadsStageProps {
  stage: PipelineStage;
  leads: Lead[];
}

export function LeadsStage({ stage, leads }: LeadsStageProps) {
  return (
    <>
      <div className="p-3 bg-muted/70 border-b">
        <div className="flex justify-between items-center">
          <h3 className="font-medium truncate">{stage.name}</h3>
          <Badge variant="outline" className="ml-2">{leads.length}</Badge>
        </div>
      </div>
      
      <div className="p-2 flex-1 overflow-y-auto space-y-2 max-h-[calc(100vh-240px)]">
        {leads.map((lead, index) => (
          <Draggable key={lead.id} draggableId={lead.id} index={index}>
            {(provided) => (
              <Card 
                className="p-3 cursor-pointer hover:shadow-md transition-shadow"
                ref={provided.innerRef}
                {...provided.draggableProps}
                {...provided.dragHandleProps}
              >
                <div className="space-y-2">
                  <div>
                    <h4 className="font-medium truncate">{lead.name || "Unnamed Lead"}</h4>
                    {lead.value > 0 && (
                      <div className="text-sm text-muted-foreground font-medium">
                        {formatCurrency(lead.value)}
                      </div>
                    )}
                  </div>
                  
                  {lead.company_name && (
                    <div className="flex items-center text-sm">
                      <Building className="h-3.5 w-3.5 mr-1 text-muted-foreground" />
                      <span className="truncate">{lead.company_name}</span>
                    </div>
                  )}
                  
                  {lead.contact_phone && (
                    <div className="flex items-center text-sm">
                      <Phone className="h-3.5 w-3.5 mr-1 text-muted-foreground" />
                      <span className="truncate">{lead.contact_phone}</span>
                    </div>
                  )}
                  
                  {lead.contact_email && (
                    <div className="flex items-center text-sm">
                      <Mail className="h-3.5 w-3.5 mr-1 text-muted-foreground" />
                      <span className="truncate">{lead.contact_email}</span>
                    </div>
                  )}
                </div>
              </Card>
            )}
          </Draggable>
        ))}
        
        {leads.length === 0 && (
          <div className="text-center py-4 text-sm text-muted-foreground">
            No leads in this stage
          </div>
        )}
      </div>
    </>
  );
}
