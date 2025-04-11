
import React from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

interface LeadsHeaderProps {
  selectedPipelineId: string | null;
}

export function LeadsHeader({ selectedPipelineId }: LeadsHeaderProps) {
  return (
    <div className="flex justify-between items-center p-4 border-b">
      <h2 className="text-lg font-semibold">Pipeline</h2>
      <Button>
        <Plus className="h-4 w-4 mr-2" />
        ADD LEAD
      </Button>
    </div>
  );
}
