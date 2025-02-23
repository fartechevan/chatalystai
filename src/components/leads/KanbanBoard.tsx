
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Plus, MoreHorizontal, Zap, Settings2, GripVertical, ChevronDown } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/auth/AuthProvider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Pipeline = {
  id: string;
  name: string;
  is_default: boolean;
};

type PipelineStage = {
  id: string;
  pipeline_id: string;
  name: string;
  position: number;
};

export function KanbanBoard() {
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [stages, setStages] = useState<PipelineStage[]>([]);
  const [selectedPipelineId, setSelectedPipelineId] = useState<string | null>(null);
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    
    async function fetchPipelines() {
      const { data: pipelinesData, error: pipelinesError } = await supabase
        .from('pipelines')
        .select('*')
        .order('created_at');

      if (pipelinesError) {
        console.error('Error fetching pipelines:', pipelinesError);
        return;
      }

      if (pipelinesData.length === 0) {
        // Create default pipeline
        const { data: defaultPipeline, error: insertError } = await supabase
          .from('pipelines')
          .insert({
            name: 'Default Pipeline',
            is_default: true,
            user_id: user.id
          })
          .select()
          .single();

        if (insertError) {
          console.error('Error creating default pipeline:', insertError);
          return;
        }

        // Create default stages
        const defaultStages = [
          { name: 'Initial Contact', position: 0 },
          { name: 'Offer Made', position: 1 },
          { name: 'Negotiation', position: 2 }
        ];

        const { error: stagesError } = await supabase
          .from('pipeline_stages')
          .insert(
            defaultStages.map(stage => ({
              ...stage,
              pipeline_id: defaultPipeline.id
            }))
          );

        if (stagesError) {
          console.error('Error creating default stages:', stagesError);
          return;
        }

        setPipelines([defaultPipeline]);
        setSelectedPipelineId(defaultPipeline.id);
      } else {
        setPipelines(pipelinesData);
        setSelectedPipelineId(pipelinesData[0]?.id);
      }
    }

    fetchPipelines();
  }, [user]);

  useEffect(() => {
    async function fetchStages() {
      if (!selectedPipelineId) return;

      const { data, error } = await supabase
        .from('pipeline_stages')
        .select('*')
        .eq('pipeline_id', selectedPipelineId)
        .order('position');

      if (error) {
        console.error('Error fetching stages:', error);
        return;
      }

      setStages(data);
      setIsLoading(false);
    }

    fetchStages();
  }, [selectedPipelineId]);

  const handlePipelineChange = (pipelineId: string) => {
    setSelectedPipelineId(pipelineId);
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="flex h-full">
      {/* Left Panel */}
      <div className="w-64 border-r bg-muted/30 p-4 flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <Select
            value={selectedPipelineId || ''}
            onValueChange={handlePipelineChange}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select pipeline" />
            </SelectTrigger>
            <SelectContent>
              {pipelines.map((pipeline) => (
                <SelectItem key={pipeline.id} value={pipeline.id}>
                  {pipeline.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="ghost" size="sm">
            <Settings2 className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="space-y-2">
          {stages.map((stage) => (
            <div
              key={stage.id}
              className="flex items-center gap-2 p-2 rounded-md hover:bg-accent cursor-pointer group"
            >
              <GripVertical className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100" />
              <span className="text-sm flex-1">{stage.name}</span>
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
            {stages.map((stage) => (
              <div key={stage.id} className="flex flex-col h-full">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium">{stage.name}</h3>
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
