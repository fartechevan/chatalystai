
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { AddLeadDialog } from "./AddLeadDialog";
import { LeadsHeader } from "./LeadsHeader";
import { EmptyPipelineState } from "./components/EmptyPipelineState";
import { LoadingState } from "./components/LoadingState";
import { PipelineBoard } from "./components/PipelineBoard";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/auth/AuthProvider";
import { usePipelineData } from "./hooks/usePipelineData";

export function LeadsContent({ pipelineId }: { pipelineId: string | null }) {
  const [isAddLeadOpen, setIsAddLeadOpen] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  const { 
    pipeline, 
    stages, 
    leads, 
    loading, 
    refreshPipelineData 
  } = usePipelineData(pipelineId);

  if (!pipelineId) {
    return (
      <div className="flex items-center justify-center h-full">
        <EmptyPipelineState message="Select a pipeline from the sidebar or create a new one" />
      </div>
    );
  }

  if (loading) {
    return <LoadingState />;
  }

  if (!pipeline || stages.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <EmptyPipelineState message="This pipeline doesn't have any stages. Add some stages to get started." />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <LeadsHeader 
        pipeline={pipeline} 
        onRefresh={refreshPipelineData}
      />
      
      <div className="p-4 flex-1 overflow-hidden">
        <div className="mb-4 flex justify-between items-center">
          <h2 className="text-2xl font-bold">{pipeline.name}</h2>
          <Button onClick={() => setIsAddLeadOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Lead
          </Button>
        </div>
        
        <PipelineBoard 
          stages={stages} 
          leads={leads} 
          onDataChange={refreshPipelineData} 
        />
      </div>

      <AddLeadDialog 
        open={isAddLeadOpen} 
        onOpenChange={setIsAddLeadOpen} 
        pipelineId={pipelineId}
        stages={stages}
        onLeadAdded={refreshPipelineData}
      />
    </div>
  );
}
