
import React, { useCallback } from "react";
import { LeadsHeader } from "./LeadsHeader";
import { usePipelineData } from "./hooks/usePipelineData";
import { useLeadsRealtime } from "./hooks/useLeadsRealtime";
import { EmptyPipelineState } from "./components/EmptyPipelineState";
import { LoadingState } from "./components/LoadingState";
import { PipelineBoard } from "./components/PipelineBoard";

interface LeadsContentProps {
  pipelineId: string | null;
}

export function LeadsContent({ pipelineId }: LeadsContentProps) {
  const { stages, stageLeads, loading, loadStages } = usePipelineData(pipelineId);
  
  // Memoize the callback to prevent unnecessary re-renders
  const handleDataChange = useCallback(() => {
    loadStages();
  }, [loadStages]);
  
  // Setup real-time subscriptions
  useLeadsRealtime(pipelineId, handleDataChange);

  if (!pipelineId) {
    return <EmptyPipelineState />;
  }

  if (loading) {
    return <LoadingState />;
  }

  return (
    // This container just needs to arrange its children vertically.
    // Height/overflow is managed by the parent in LeadsLayout.
    <div className="flex flex-col h-full"> 
      <LeadsHeader selectedPipelineId={pipelineId} />
      {/* PipelineBoard needs flex-1 to take remaining vertical space */}
      <PipelineBoard 
        stages={stages} 
        stageLeads={stageLeads} 
        onLeadMoved={handleDataChange} 
      />
    </div>
  );
}
