
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChevronRight, ChevronLeft, Plus } from "lucide-react";
import type { Conversation } from "./types";
import { useLeadData } from "./hooks/useLeadData";
import { usePipelineData } from "./hooks/usePipelineData";
import { LeadBasicInfoCard } from "./lead-details/LeadBasicInfoCard";
import { LeadPipelineCard } from "./lead-details/LeadPipelineCard";
import { LeadCompanyInfoCard } from "./lead-details/LeadCompanyInfoCard";
import { LeadContactInfoCard } from "./lead-details/LeadContactInfoCard";
import { LeadCustomerInfoCard } from "./lead-details/LeadCustomerInfoCard";
import { CreateLeadDialog } from "./lead-details/CreateLeadDialog";
import { EditLeadDialog } from "./lead-details/EditLeadDialog";

interface LeadDetailsPanelProps {
  isExpanded: boolean;
  onToggle: () => void;
  selectedConversation: Conversation | null;
}

export function LeadDetailsPanel({ isExpanded, onToggle, selectedConversation }: LeadDetailsPanelProps) {
  const [isAddLeadDialogOpen, setIsAddLeadDialogOpen] = useState(false);
  const [isEditLeadDialogOpen, setIsEditLeadDialogOpen] = useState(false);
  
  const { leadData, isLoading: isLeadLoading, refetchLeadData } = useLeadData(selectedConversation);
  
  const { 
    currentPipelineId, 
    currentStageId, 
    pipelineStages,
    refetchPipelineData
  } = usePipelineData(leadData?.id || null);

  const handleLeadCreated = () => {
    refetchLeadData();
  };

  const handleLeadUpdated = () => {
    refetchLeadData();
  };

  const handlePipelineUpdated = () => {
    refetchPipelineData();
  };

  const togglePanel = () => {
    onToggle();
  };

  if (!isExpanded) {
    return (
      <div className="border-l relative flex-col h-full hidden md:flex" style={{ width: '40px' }}>
        <Button 
          variant="ghost" 
          size="icon" 
          className="absolute top-6 left-1/2 transform -translate-x-1/2 hover:bg-muted"
          onClick={togglePanel}
        >
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>
    );
  }

  return (
    <div className="border-l relative w-80 flex-col h-full hidden md:flex">
      <Button 
        variant="ghost" 
        size="icon" 
        className="absolute top-6 right-4 hover:bg-muted"
        onClick={togglePanel}
      >
        <ChevronLeft className="h-5 w-5" />
      </Button>

      <div className="p-6 pt-14">
        <h3 className="text-lg font-semibold mb-3">Lead Details</h3>
        
        {isLeadLoading ? (
          <div className="space-y-2">
            <div className="h-12 bg-muted/50 animate-pulse rounded"></div>
            <div className="h-20 bg-muted/50 animate-pulse rounded"></div>
            <div className="h-16 bg-muted/50 animate-pulse rounded"></div>
          </div>
        ) : leadData ? (
          <ScrollArea className="h-[calc(100vh-170px)] pr-4">
            <div className="space-y-4">
              <LeadBasicInfoCard 
                lead={leadData} 
                onEdit={() => setIsEditLeadDialogOpen(true)} 
              />

              {currentStageId && (
                <LeadPipelineCard 
                  leadId={leadData.id}
                  currentStageId={currentStageId}
                  currentPipelineId={currentPipelineId}
                  pipelineStages={pipelineStages}
                  onStageUpdate={handlePipelineUpdated}
                />
              )}

              <LeadCompanyInfoCard lead={leadData} />
              <LeadContactInfoCard lead={leadData} />
              <LeadCustomerInfoCard lead={leadData} />
            </div>
          </ScrollArea>
        ) : (
          <div className="flex flex-col items-center justify-center space-y-4 pt-8">
            <div className="text-center text-muted-foreground">
              <p>No lead associated with this conversation</p>
              <p className="text-sm mt-1">Create a lead to track this opportunity</p>
            </div>
            <Button onClick={() => setIsAddLeadDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Lead
            </Button>
          </div>
        )}
      </div>

      <CreateLeadDialog 
        open={isAddLeadDialogOpen}
        onOpenChange={setIsAddLeadDialogOpen}
        selectedConversation={selectedConversation}
        onLeadCreated={handleLeadCreated}
      />

      <EditLeadDialog 
        open={isEditLeadDialogOpen}
        onOpenChange={setIsEditLeadDialogOpen}
        lead={leadData}
        onLeadUpdated={handleLeadUpdated}
      />
    </div>
  );
}
