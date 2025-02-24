
import { useState } from "react";
import { LeadsSidebar } from "./LeadsSidebar";
import { LeadsContent } from "./LeadsContent";

export function LeadsLayout() {
  const [selectedPipelineId, setSelectedPipelineId] = useState<string | null>(null);
  const [isCollapsed, setIsCollapsed] = useState(false);
  
  return (
    <div className="flex h-full">
      <LeadsSidebar 
        selectedPipelineId={selectedPipelineId}
        onPipelineSelect={setSelectedPipelineId}
        isCollapsed={isCollapsed}
        onCollapse={() => setIsCollapsed(!isCollapsed)}
      />
      <div className="flex-1">
        <LeadsContent pipelineId={selectedPipelineId} />
      </div>
    </div>
  );
}
