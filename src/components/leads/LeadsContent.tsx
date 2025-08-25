
import React, { useCallback, useState } from "react"; // Import useState
import { useQueryClient } from "@tanstack/react-query"; // Import useQueryClient
// import { LeadsHeader } from "./LeadsHeader"; // LeadsHeader is being removed
import { usePipelineData } from "./hooks/usePipelineData";
import type { Lead } from "@/components/dashboard/conversations/types"; // Import Lead type
import { useLeadsRealtime } from "./hooks/useLeadsRealtime";
import { EmptyPipelineState } from "./components/EmptyPipelineState";
import { LoadingState } from "./components/LoadingState";
import { PipelineBoard } from "./components/PipelineBoard";
import { LeadPipelineDetailsPanel } from "./components/LeadPipelineDetailsPanel"; // Import the new component
import type { Dispatch, SetStateAction } from 'react'; // Import Dispatch and SetStateAction

interface LeadsContentProps {
  pipelineId: string | null;
  selectedTagIds: string[] | null; 
  onSelectedTagIdsChange: Dispatch<SetStateAction<string[] | null>>;
  // onAddLeadClick is no longer needed as LeadsHeader is removed
}

export function LeadsContent({ pipelineId, selectedTagIds, onSelectedTagIdsChange }: LeadsContentProps) {
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  // selectedTagIds state is now managed by LeadsLayout and passed as a prop
  // const [selectedTagIds, setSelectedTagIds] = useState<string[] | null>(null); 
  const queryClient = useQueryClient();
  
  // selectedTagIds is now a prop, use it directly in usePipelineData
  const { stages, stageLeads, loading, loadStages } = usePipelineData(pipelineId, selectedTagIds); 

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
    <div className="relative h-full"> 
      {/* Main content area - now takes full width */}
      <div className="flex flex-col h-full overflow-hidden">
        {/* LeadsHeader component has been removed */}
        {/* PipelineBoard needs flex-1 to take remaining vertical space */}
        <PipelineBoard
          stages={stages} 
          stageLeads={stageLeads} 
          onLeadMoved={handleDataChange} 
          onLeadClick={handleLeadClick} // Pass the click handler
        />
      </div>
      
      {/* Floating slide-in panel with backdrop */}
      {selectedLead && (
        <>
          {/* Backdrop overlay */}
          <div 
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 transition-opacity duration-300 ease-in-out"
            onClick={() => setSelectedLead(null)}
          />
          
          {/* Sliding panel */}
          <div className={`
            fixed top-0 right-0 h-full w-96 z-50
            transform transition-transform duration-300 ease-in-out
            ${selectedLead ? 'translate-x-0' : 'translate-x-full'}
          `}>
            <LeadPipelineDetailsPanel 
              key={selectedLead.id} // Add key prop here
              lead={selectedLead} 
              onClose={() => setSelectedLead(null)} 
              queryClient={queryClient} // Pass queryClient
            />
          </div>
        </>
      )}
    </div>
  );
}
