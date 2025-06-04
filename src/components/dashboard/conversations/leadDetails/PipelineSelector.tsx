
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label"; // Added Label
import { Progress } from "@/components/ui/progress"; // Added Progress
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
    <div className="space-y-3"> {/* Slightly increased spacing */}
      {isChangingPipeline ? (
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Select Pipeline</Label>
          <div className="space-y-2 max-h-48 overflow-y-auto border rounded-md p-2"> {/* Added border and padding to scroll area */}
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
            <Label className="text-xs text-muted-foreground">Pipeline</Label>
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
            <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-1"> {/* Adjusted width and padding */}
              {selectedPipeline?.stages?.length ? (
                selectedPipeline.stages.map((stage) => (
                  <Button // Using Button for items for better click handling and styling
                    key={stage.id}
                    variant="ghost"
                    className={cn(
                      "w-full justify-start px-2 py-1.5 text-sm h-auto mb-1",
                      stage.id === selectedStage?.id && "bg-accent text-accent-foreground"
                    )}
                    onClick={() => handleStageChange(stage.id)}
                  >
                    {stage.name}
                  </Button>
                ))
              ) : (
                <div className="p-2 text-sm text-muted-foreground text-center">No stages in this pipeline.</div>
              )}
            </PopoverContent>
          </Popover>
          {selectedPipeline?.stages && selectedStage && selectedPipeline.stages.length > 0 && (
            <Progress 
              value={(
                ((selectedPipeline.stages.findIndex(s => s.id === selectedStage.id) + 1) / 
                (selectedPipeline.stages.length)) * 100
              )} 
              className="h-2 w-full" 
            />
          )}
        </>
      )}
    </div>
  );
}
