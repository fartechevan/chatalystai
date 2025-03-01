
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { PipelineStage } from "../types";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface LeadPipelineCardProps {
  leadId: string;
  currentStageId: string | null;
  currentPipelineId: string | null;
  pipelineStages: PipelineStage[];
  onStageUpdate: () => void;
}

export function LeadPipelineCard({ 
  leadId, 
  currentStageId, 
  currentPipelineId, 
  pipelineStages,
  onStageUpdate
}: LeadPipelineCardProps) {
  // Determine current stage info and adjacent stages
  const currentStage = pipelineStages.find(stage => stage.id === currentStageId);
  const currentStageIndex = currentStage ? pipelineStages.findIndex(stage => stage.id === currentStage.id) : -1;
  const prevStage = currentStageIndex > 0 ? pipelineStages[currentStageIndex - 1] : null;
  const nextStage = currentStageIndex >= 0 && currentStageIndex < pipelineStages.length - 1 ? pipelineStages[currentStageIndex + 1] : null;

  const handleStageChange = async (direction: 'next' | 'prev') => {
    if (!leadId || !currentStageId || !currentPipelineId || pipelineStages.length === 0) return;
    
    const currentStageIndex = pipelineStages.findIndex(stage => stage.id === currentStageId);
    if (currentStageIndex === -1) return;
    
    let newStageIndex: number;
    if (direction === 'next' && currentStageIndex < pipelineStages.length - 1) {
      newStageIndex = currentStageIndex + 1;
    } else if (direction === 'prev' && currentStageIndex > 0) {
      newStageIndex = currentStageIndex - 1;
    } else {
      return; // Can't move further
    }
    
    const newStage = pipelineStages[newStageIndex];
    
    try {
      // Update lead_pipeline table
      const { error: pipelineError } = await supabase
        .from('lead_pipeline')
        .update({ stage_id: newStage.id })
        .eq('lead_id', leadId)
        .eq('pipeline_id', currentPipelineId);
      
      if (pipelineError) throw pipelineError;
      
      // Also update the lead's pipeline_stage_id in the leads table
      const { error: leadError } = await supabase
        .from('leads')
        .update({ pipeline_stage_id: newStage.id })
        .eq('id', leadId);
      
      if (leadError) throw leadError;
      
      toast.success(`Lead moved to ${newStage.name}`);
      
      // Call the update callback
      onStageUpdate();
      
    } catch (error) {
      console.error('Error updating lead stage:', error);
      toast.error('Failed to update lead stage');
    }
  };

  if (!currentStage) return null;

  return (
    <Card className="p-4">
      <h4 className="font-medium mb-2">Pipeline Stage</h4>
      <div className="flex justify-between items-center">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => handleStageChange('prev')}
          disabled={!prevStage}
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          {prevStage?.name || 'Back'}
        </Button>
        <span className="text-sm font-medium px-3 py-1.5 bg-muted rounded">
          {currentStage.name}
        </span>
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => handleStageChange('next')}
          disabled={!nextStage}
        >
          {nextStage?.name || 'Forward'}
          <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>
    </Card>
  );
}
