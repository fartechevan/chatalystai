
import { useState, useEffect } from "react";
import { LeadsSidebar } from "./LeadsSidebar";
import { LeadsContent } from "./LeadsContent";
import { useAuth } from "@/components/auth/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export function LeadsLayout() {
  const [selectedPipelineId, setSelectedPipelineId] = useState<string | null>(null);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    // Select the default pipeline when the component loads
    if (user) {
      const fetchDefaultPipeline = async () => {
        try {
          const { data, error } = await supabase
            .from('pipelines')
            .select('id')
            .eq('user_id', user.id)
            .eq('is_default', true)
            .single();

          if (error) {
            // If no default pipeline, try to get any pipeline
            const { data: anyPipeline, error: anyError } = await supabase
              .from('pipelines')
              .select('id')
              .eq('user_id', user.id)
              .order('created_at', { ascending: false })
              .limit(1)
              .single();

            if (!anyError && anyPipeline) {
              setSelectedPipelineId(anyPipeline.id);
            }
          } else if (data) {
            setSelectedPipelineId(data.id);
          }
        } catch (error) {
          console.error('Error fetching default pipeline:', error);
          toast({
            title: "Error",
            description: "Failed to load pipeline data",
            variant: "destructive",
          });
        }
      };

      fetchDefaultPipeline();
    }
  }, [user]);
  
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
