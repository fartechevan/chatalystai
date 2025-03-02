
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ChevronDown } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Pipeline, PipelineStage } from "../types";

interface PipelineSelectorProps {
  selectedPipeline: Pipeline | null;
  selectedStage: PipelineStage | null;
  allPipelines: Pipeline[];
  daysSinceCreation: number;
  onPipelineChange: (pipelineId: string) => void;
  onStageChange: (stageId: string) => void;
}

export function PipelineSelector({ 
  selectedPipeline, 
  selectedStage, 
  allPipelines, 
  daysSinceCreation,
  onPipelineChange,
  onStageChange
}: PipelineSelectorProps) {
  const [isChangingPipeline, setIsChangingPipeline] = useState(false);
  const [stagesPopoverOpen, setStagesPopoverOpen] = useState(false);

  const handlePipelineChange = (pipelineId: string) => {
    onPipelineChange(pipelineId);
    setIsChangingPipeline(false);
  };

  const handleStageChange = (stageId: string) => {
    onStageChange(stageId);
    setStagesPopoverOpen(false);
  };

  return (
    <div className="space-y-2">
      {isChangingPipeline ? (
        <div className="space-y-2">
          <label className="text-xs text-muted-foreground">Select Pipeline</label>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {allPipelines.map((pipeline) => (
              <Card 
                key={pipeline.id} 
                className={cn(
                  "p-2 cursor-pointer hover:bg-accent",
                  pipeline.id === selectedPipeline?.id && "border-primary"
                )}
                onClick={() => handlePipelineChange(pipeline.id)}
              >
                <div className="text-sm font-medium">{pipeline.name}</div>
                <div className="text-xs text-muted-foreground">
                  {pipeline.stages?.length || 0} stages
                </div>
              </Card>
            ))}
          </div>
          <Button variant="outline" size="sm" className="w-full" onClick={() => setIsChangingPipeline(false)}>
            Cancel
          </Button>
        </div>
      ) : (
        <>
          <div className="flex justify-between items-center">
            <label className="text-xs text-muted-foreground">Pipeline</label>
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-6 px-2 text-xs text-muted-foreground"
              onClick={() => setIsChangingPipeline(true)}
            >
              Change
            </Button>
          </div>
          <Popover open={stagesPopoverOpen} onOpenChange={setStagesPopoverOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="w-full justify-between">
                <div className="flex items-center">
                  <span className="font-medium">{selectedStage?.name || 'Select a stage'}</span>
                </div>
                <div className="text-xs text-muted-foreground flex items-center">
                  ({daysSinceCreation} days)
                  <ChevronDown className="h-4 w-4 ml-1" />
                </div>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-72 p-2">
              {selectedPipeline?.stages?.map((stage) => (
                <Card 
                  key={stage.id} 
                  className={cn(
                    "p-2 mb-2 cursor-pointer hover:bg-accent",
                    stage.id === selectedStage?.id && "border-primary"
                  )}
                  onClick={() => handleStageChange(stage.id)}
                >
                  {stage.name}
                </Card>
              ))}
            </PopoverContent>
          </Popover>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            {selectedPipeline?.stages && selectedStage && (
              <div 
                className="bg-primary h-full rounded-full"
                style={{
                  width: `${(
                    ((selectedPipeline.stages.findIndex(s => s.id === selectedStage.id) + 1) / 
                    (selectedPipeline.stages.length || 1)) * 100
                  )}%`
                }}
              ></div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
