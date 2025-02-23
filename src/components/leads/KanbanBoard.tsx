
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Plus, MoreHorizontal, Zap, Settings2, GripVertical } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/auth/AuthProvider";

type PipelineStatus = {
  id: string;
  name: string;
  color: string;
  position: number;
};

export function KanbanBoard() {
  const [pipelineStatuses, setPipelineStatuses] = useState<PipelineStatus[]>([]);
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchPipelineStatuses() {
      if (!user) return;
      
      const { data, error } = await supabase
        .from('pipeline_statuses')
        .select('*')
        .order('position');
      
      if (error) {
        console.error('Error fetching pipeline statuses:', error);
        return;
      }

      if (data.length === 0) {
        // Create default statuses if none exist
        const defaultStatuses = [
          { name: 'Initial Contact', color: 'blue', position: 0 },
          { name: 'Offer Made', color: 'yellow', position: 1 },
          { name: 'Negotiation', color: 'purple', position: 2 },
        ];

        for (const status of defaultStatuses) {
          await supabase
            .from('pipeline_statuses')
            .insert({ ...status, user_id: user.id });
        }

        // Fetch again after creating defaults
        const { data: newData } = await supabase
          .from('pipeline_statuses')
          .select('*')
          .order('position');
          
        setPipelineStatuses(newData || []);
      } else {
        setPipelineStatuses(data);
      }
      
      setIsLoading(false);
    }

    fetchPipelineStatuses();
  }, [user]);

  return (
    <div className="flex h-full">
      {/* Left Panel */}
      <div className="w-64 border-r bg-muted/30 p-4 flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-medium">Pipeline Stages</h2>
          <Button variant="ghost" size="sm">
            <Settings2 className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="space-y-2">
          {pipelineStatuses.map((status) => (
            <div
              key={status.id}
              className="flex items-center gap-2 p-2 rounded-md hover:bg-accent cursor-pointer group"
            >
              <GripVertical className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100" />
              <div className={`w-2 h-2 rounded-full bg-${status.color}-500`} />
              <span className="text-sm flex-1">{status.name}</span>
              <span className="text-xs text-muted-foreground">0</span>
            </div>
          ))}
          
          <Button variant="ghost" size="sm" className="w-full justify-start">
            <Plus className="h-4 w-4 mr-2" />
            Add stage
          </Button>
        </div>
      </div>

      {/* Main Kanban Area */}
      <div className="flex-1 flex flex-col">
        <div className="border-b p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Button variant="secondary" size="sm">
                Active leads
              </Button>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Search and filter" 
                  className="w-[300px] pl-8" 
                />
              </div>
              <span className="text-sm text-muted-foreground">
                0 leads: 0 RM
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
              <Button variant="outline">
                <Zap className="h-4 w-4 mr-2" />
                AUTOMATE
              </Button>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                NEW LEAD
              </Button>
            </div>
          </div>
        </div>

        <div className="flex-1 min-h-0 p-4">
          <div className="grid grid-cols-3 gap-4 h-full">
            {pipelineStatuses.map((status) => (
              <div key={status.id} className="flex flex-col h-full">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium">{status.name}</h3>
                  <span className="text-sm text-muted-foreground">
                    0 leads: 0 RM
                  </span>
                </div>
                <Card className="flex-1 p-4 bg-muted/30">
                  <div className="h-full flex items-center justify-center border-2 border-dashed rounded-lg p-4">
                    <Button variant="ghost" className="text-sm">
                      Quick add
                    </Button>
                  </div>
                </Card>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
