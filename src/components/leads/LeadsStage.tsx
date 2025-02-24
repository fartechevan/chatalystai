
import { Card, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { AddLeadDialog } from "./AddLeadDialog";

interface LeadsStageProps {
  name: string;
  id: string;
}

export function LeadsStage({ name, id }: LeadsStageProps) {
  const [isAddLeadOpen, setIsAddLeadOpen] = useState(false);

  const handleLeadAdded = () => {
    // Refresh leads data
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="flex-row justify-between items-center pb-2">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold tracking-tight">{name}</h3>
          <span className="text-muted-foreground text-sm">0 leads: 0 RM</span>
        </div>
        <Button variant="ghost" size="sm" onClick={() => setIsAddLeadOpen(true)}>
          Quick Add
        </Button>
      </CardHeader>
      <AddLeadDialog
        isOpen={isAddLeadOpen}
        onClose={() => setIsAddLeadOpen(false)}
        pipelineStageId={id}
        onLeadAdded={handleLeadAdded}
      />
    </Card>
  );
}
