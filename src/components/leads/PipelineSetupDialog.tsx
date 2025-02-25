
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState, useEffect } from "react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { X, GripVertical } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { TransferLeadsDialog } from "./TransferLeadsDialog";

interface PipelineSetupDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  pipelineId?: string;
}

export function PipelineSetupDialog({
  isOpen,
  onClose,
  onSave,
  pipelineId
}: PipelineSetupDialogProps) {
  const { toast } = useToast();
  const [stages, setStages] = useState<string[]>([]);
  const [pipelineName, setPipelineName] = useState("");
  const [isTransferDialogOpen, setIsTransferDialogOpen] = useState(false);
  const [stagesToTransfer, setStagesToTransfer] = useState<Array<{ id: string; name: string }>>([]);
  const [originalStages, setOriginalStages] = useState<Array<{ id: string; name: string; position: number }>>([]);

  useEffect(() => {
    if (pipelineId) {
      loadPipeline();
    } else {
      // Initialize with default stages for new pipeline
      setStages(["Incoming leads", "Contacted", "Qualified", "Negotiation"]);
    }
  }, [pipelineId]);

  const loadPipeline = async () => {
    if (!pipelineId) return;

    const { data: pipeline } = await supabase
      .from('pipelines')
      .select('name')
      .eq('id', pipelineId)
      .single();

    if (pipeline) {
      setPipelineName(pipeline.name);
    }

    const { data: stagesData } = await supabase
      .from('pipeline_stages')
      .select('id, name, position')
      .eq('pipeline_id', pipelineId)
      .order('position');

    if (stagesData) {
      setStages(stagesData.map(stage => stage.name));
      setOriginalStages(stagesData);
    }
  };

  const handleDragEnd = (result: any) => {
    if (!result.destination) return;

    const items = Array.from(stages);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    setStages(items);
  };

  const handleStageDelete = async (index: number) => {
    if (pipelineId) {
      // Check if stage has leads
      const stageId = originalStages[index].id;
      const { data: leadsCount } = await supabase
        .from('lead_pipeline')
        .select('lead_id', { count: 'exact' })
        .eq('stage_id', stageId);

      if (leadsCount && leadsCount > 0) {
        setStagesToTransfer([{
          id: stageId,
          name: stages[index]
        }]);
        setIsTransferDialogOpen(true);
        return;
      }
    }

    // If no leads or new pipeline, just remove the stage
    setStages(stages.filter((_, i) => i !== index));
  };

  const handleStageEdit = (index: number, newName: string) => {
    const newStages = [...stages];
    newStages[index] = newName;
    setStages(newStages);
  };

  const handleAddStage = () => {
    setStages([...stages, "New stage"]);
  };

  const handleTransferConfirm = async (transfers: Record<string, string>) => {
    // Update lead_pipeline records with new stage IDs
    for (const [oldStageId, newStageId] of Object.entries(transfers)) {
      await supabase
        .from('lead_pipeline')
        .update({ stage_id: newStageId })
        .eq('stage_id', oldStageId);
    }

    // Now safe to delete the stage
    setStages(stages.filter((_, i) => i !== stagesToTransfer[0].id));
    setIsTransferDialogOpen(false);
  };

  const handleSave = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast({
          title: "Error",
          description: "You must be logged in to modify pipelines",
          variant: "destructive",
        });
        return;
      }

      if (pipelineId) {
        // Update existing pipeline
        await supabase
          .from('pipelines')
          .update({ name: pipelineName })
          .eq('id', pipelineId);

        // Update stages
        for (let i = 0; i < stages.length; i++) {
          if (i < originalStages.length) {
            // Update existing stage
            await supabase
              .from('pipeline_stages')
              .update({
                name: stages[i],
                position: i
              })
              .eq('id', originalStages[i].id);
          } else {
            // Add new stage
            await supabase
              .from('pipeline_stages')
              .insert({
                name: stages[i],
                position: i,
                pipeline_id: pipelineId
              });
          }
        }

        // Delete removed stages
        const remainingStageIds = originalStages
          .slice(0, stages.length)
          .map(stage => stage.id);

        await supabase
          .from('pipeline_stages')
          .delete()
          .eq('pipeline_id', pipelineId)
          .not('id', 'in', remainingStageIds);

      } else {
        // Create new pipeline
        const { data: pipeline, error: pipelineError } = await supabase
          .from('pipelines')
          .insert({
            name: pipelineName,
            user_id: user.id,
          })
          .select()
          .single();

        if (pipelineError) throw pipelineError;

        // Create stages
        const stageData = stages.map((name, position) => ({
          name,
          position,
          pipeline_id: pipeline.id
        }));

        const { error: stagesError } = await supabase
          .from('pipeline_stages')
          .insert(stageData);

        if (stagesError) throw stagesError;
      }

      toast({
        title: "Success",
        description: "Pipeline saved successfully",
      });
      
      onSave();
      onClose();
    } catch (error) {
      console.error('Error saving pipeline:', error);
      toast({
        title: "Error",
        description: "Failed to save pipeline",
        variant: "destructive",
      });
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              {pipelineId ? 'Edit Pipeline' : 'Set up your pipeline'}
            </DialogTitle>
            <p className="text-muted-foreground">
              Customize the stages that you go through when working with leads.
            </p>
          </DialogHeader>

          <div className="space-y-6">
            <div>
              <Input
                value={pipelineName}
                onChange={(e) => setPipelineName(e.target.value)}
                className="text-lg font-medium"
                placeholder="Pipeline name"
              />
            </div>

            <DragDropContext onDragEnd={handleDragEnd}>
              <Droppable droppableId="stages">
                {(provided) => (
                  <div
                    {...provided.droppableProps}
                    ref={provided.innerRef}
                    className="space-y-2"
                  >
                    {stages.map((stage, index) => (
                      <Draggable
                        key={index}
                        draggableId={`stage-${index}`}
                        index={index}
                      >
                        {(provided) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            className="flex items-center gap-2 bg-muted/50 rounded-lg p-2"
                          >
                            <div
                              {...provided.dragHandleProps}
                              className="text-muted-foreground"
                            >
                              <GripVertical size={16} />
                            </div>
                            <Input
                              value={stage}
                              onChange={(e) => handleStageEdit(index, e.target.value)}
                              className="flex-1"
                            />
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => handleStageDelete(index)}
                            >
                              <X size={16} />
                            </Button>
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </DragDropContext>

            <Button
              variant="outline"
              onClick={handleAddStage}
              className="w-full"
            >
              Add stage
            </Button>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button onClick={handleSave}>
                Save pipeline
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <TransferLeadsDialog
        isOpen={isTransferDialogOpen}
        onClose={() => setIsTransferDialogOpen(false)}
        onConfirm={handleTransferConfirm}
        stagesToTransfer={stagesToTransfer}
        availableStages={stages
          .filter((_, i) => !stagesToTransfer.some(s => s.id === originalStages[i]?.id))
          .map((name, i) => ({
            id: originalStages[i]?.id || `new-${i}`,
            name
          }))}
      />
    </>
  );
}
