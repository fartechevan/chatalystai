
import { useState } from "react";
import { LeadsSidebar } from "./LeadsSidebar";
import { LeadsContent } from "./LeadsContent";

export function LeadsLayout() {
  const [selectedPipelineId, setSelectedPipelineId] = useState<string | null>(null);
  const [isCollapsed, setIsCollapsed] = useState(false);
  
  return (
    <div className="flex h-screen -mt-8 -mx-8">
      <LeadsSidebar 
        selectedPipelineId={selectedPipelineId}
        onPipelineSelect={setSelectedPipelineId}
        isCollapsed={isCollapsed}
        onCollapse={() => setIsCollapsed(!isCollapsed)}
      />
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-auto">
          <LeadsContent pipelineId={selectedPipelineId} />
        </div>
      </div>
    </div>
  );
}
