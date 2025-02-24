import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus } from "lucide-react";
import { AddLeadDialog } from "./AddLeadDialog";

export function LeadsHeader({ selectedPipelineId }) {
  const [isAddLeadOpen, setIsAddLeadOpen] = useState(false);

  return (
    <div className="border-b px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="secondary" size="sm">
            Active leads
          </Button>
          <Input placeholder="Search leads..." className="w-[300px] pl-8" />
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => setIsAddLeadOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Lead
          </Button>
        </div>
      </div>

      <AddLeadDialog
        isOpen={isAddLeadOpen}
        onClose={() => setIsAddLeadOpen(false)}
        pipelineStageId={getInitialStageId(selectedPipelineId)}
        onLeadAdded={() => {
          // Refresh leads or trigger necessary actions
        }}
      />
    </div>
  );
}

// Helper function to return the initial stage ID
function getInitialStageId(pipelineId) {
  // Retrieve the initial stage (e.g., stage 0) ID for the given pipeline
  // Assume you have logic to get stages - replace 'stageId0' with actual logic to get ID
  return 'stageId0';
}