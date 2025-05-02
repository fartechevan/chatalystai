
import React, { useCallback, useState } from "react"; // Import useState
import { useQueryClient } from "@tanstack/react-query"; // Import useQueryClient
import { LeadsHeader } from "./LeadsHeader";
import { usePipelineData } from "./hooks/usePipelineData";
import type { Lead } from "@/components/dashboard/conversations/types"; // Import Lead type
import { useLeadsRealtime } from "./hooks/useLeadsRealtime";
import { EmptyPipelineState } from "./components/EmptyPipelineState";
import { LoadingState } from "./components/LoadingState";
import { PipelineBoard } from "./components/PipelineBoard";
import { LeadPipelineDetailsPanel } from "./components/LeadPipelineDetailsPanel"; // Import the new component

interface LeadsContentProps {
  pipelineId: string | null;
}

export function LeadsContent({ pipelineId }: LeadsContentProps) {
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null); // State for selected lead
  const queryClient = useQueryClient(); // Get queryClient instance
  const { stages, stageLeads, loading, loadStages } = usePipelineData(pipelineId);
  
  // Memoize the callback to prevent unnecessary re-renders
  const handleDataChange = useCallback(() => {
    loadStages();
  }, [loadStages]);

  // Handler for clicking a lead card
  const handleLeadClick = (lead: Lead) => {
    setSelectedLead(lead);
  };
  
  // Setup real-time subscriptions
  useLeadsRealtime(pipelineId, handleDataChange);

  if (!pipelineId) {
    return <EmptyPipelineState />;
  }

  if (loading) {
    return <LoadingState />;
  }

  return (
    // Change main container to horizontal flex
    <div className="flex h-full"> 
      {/* Wrap Header and Board in a flex-1 container */}
      <div className="flex-1 flex flex-col h-full overflow-hidden"> 
        <LeadsHeader selectedPipelineId={pipelineId} />
        {/* PipelineBoard needs flex-1 to take remaining vertical space */}
        <PipelineBoard 
          stages={stages} 
          stageLeads={stageLeads} 
          onLeadMoved={handleDataChange} 
          onLeadClick={handleLeadClick} // Pass the click handler
        />
      </div>
      
      {/* Conditionally render the details panel */}
      {selectedLead && (
        <div className="w-96 border-l bg-background flex-shrink-0 h-full overflow-hidden"> {/* Use overflow-hidden here */}
          {/* Replace placeholder with the actual component */}
          <LeadPipelineDetailsPanel 
            key={selectedLead.id} // Add key prop here
            lead={selectedLead} 
            onClose={() => setSelectedLead(null)} 
            queryClient={queryClient} // Pass queryClient
          />
        </div>
      )}
    </div>
  );
}
