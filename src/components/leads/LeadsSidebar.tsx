
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/auth/AuthProvider";
import { PipelineSetupDialog } from "./PipelineSetupDialog";

interface Pipeline {
  id: string;
  name: string;
  is_default: boolean;
}

interface LeadsSidebarProps {
  selectedPipelineId: string | null;
  onPipelineSelect: (id: string) => void;
  isCollapsed: boolean;
  onCollapse: () => void;
}

export function LeadsSidebar({ 
  selectedPipelineId, 
  onPipelineSelect, 
  isCollapsed, 
  onCollapse 
}: LeadsSidebarProps) {
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSetupDialogOpen, setIsSetupDialogOpen] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const fetchPipelines = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('pipelines')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPipelines(data || []);
    } catch (error) {
      console.error('Error fetching pipelines:', error);
      toast({
        title: "Error",
        description: "Failed to load pipelines",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPipelines();

    // Set up a realtime subscription for pipeline changes
    if (user) {
      const subscription = supabase
        .channel('pipelines_changes')
        .on('postgres_changes', 
          { 
            event: '*', 
            schema: 'public', 
            table: 'pipelines',
            filter: `user_id=eq.${user.id}`
          }, 
          () => {
            fetchPipelines();
          }
        )
        .subscribe();

      return () => {
        subscription.unsubscribe();
      };
    }
  }, [user]);

  const handlePipelineCreated = (newPipelineId: string) => {
    fetchPipelines();
    onPipelineSelect(newPipelineId);
  };

  return (
    <div 
      className={`bg-background border-r transition-all duration-300 flex flex-col ${
        isCollapsed ? 'w-16' : 'w-64'
      }`}
    >
      <div className="p-4 flex justify-between items-center border-b">
        {!isCollapsed && <h2 className="font-semibold">Pipelines</h2>}
        <Button 
          variant="ghost" 
          size="sm" 
          className={isCollapsed ? 'mx-auto' : ''}
          onClick={onCollapse}
        >
          {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      </div>
      
      <div className="flex-1 overflow-auto">
        <div className="p-2">
          {!loading && pipelines.map((pipeline) => (
            <Button
              key={pipeline.id}
              variant={selectedPipelineId === pipeline.id ? "secondary" : "ghost"}
              className={`w-full justify-start mb-1 ${isCollapsed ? 'px-2' : ''}`}
              onClick={() => onPipelineSelect(pipeline.id)}
            >
              <div className="truncate">
                {isCollapsed ? pipeline.name.charAt(0) : pipeline.name}
              </div>
            </Button>
          ))}
          
          {loading && Array(3).fill(0).map((_, i) => (
            <div key={i} className="h-9 bg-gray-100 animate-pulse rounded-md mb-1"></div>
          ))}
        </div>
      </div>
      
      <div className="p-2 border-t">
        <Button 
          className={`w-full ${isCollapsed ? 'p-2' : ''}`}
          size={isCollapsed ? "icon" : "default"}
          onClick={() => setIsSetupDialogOpen(true)}
        >
          <Plus className={`h-4 w-4 ${!isCollapsed && 'mr-2'}`} />
          {!isCollapsed && "New Pipeline"}
        </Button>
      </div>

      <PipelineSetupDialog 
        open={isSetupDialogOpen} 
        onOpenChange={setIsSetupDialogOpen}
        onPipelineCreated={handlePipelineCreated}
      />
    </div>
  );
}
