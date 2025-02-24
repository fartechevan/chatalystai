
import { useState } from "react";
import { PipelineSidebar } from "./PipelineSidebar";
import { PipelineContent } from "./PipelineContent";

export function PipelineLayout() {
  const [selectedPipelineId, setSelectedPipelineId] = useState<string | null>(null);
  const [isCollapsed, setIsCollapsed] = useState(false);
  
  return (
    <div className="flex h-screen -mt-8 -mx-8">
      <PipelineSidebar 
        selectedPipelineId={selectedPipelineId}
        onPipelineSelect={setSelectedPipelineId}
        isCollapsed={isCollapsed}
        onCollapse={() => setIsCollapsed(!isCollapsed)}
      />
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-auto">
          <PipelineContent pipelineId={selectedPipelineId} />
        </div>
      </div>
    </div>
  );
}
