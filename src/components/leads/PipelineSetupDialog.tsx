
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { X, GripVertical } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const defaultTemplates = {
  custom: [
    "Incoming leads",
    "Contacted",
    "Qualified",
    "Negotiation",
    "Closed - won",
    "Closed - lost"
  ],
  "Online store": [
    "New order",
    "Processing",
    "Shipped",
    "Delivered",
    "Refunded"
  ],
  "Consulting": [
    "Lead",
    "Discovery call",
    "Proposal sent",
    "Contract signed",
    "Project active",
    "Completed"
  ],
  "Services": [
    "Inquiry",
    "Consultation",
    "Quote sent",
    "Follow up",
    "Service scheduled",
    "Completed"
  ],
  "Marketing": [
    "Lead captured",
    "Nurturing",
    "Meeting scheduled",
    "Proposal sent",
    "Contract sent",
    "Won"
  ],
  "Travel agency": [
    "Inquiry",
    "Planning",
    "Quote sent",
    "Booking",
    "Travel docs sent",
    "Trip completed"
  ]
};

interface PipelineSetupDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
}

export function PipelineSetupDialog({
  isOpen,
  onClose,
  onSave
}: PipelineSetupDialogProps) {
  const { toast } = useToast();
  const [selectedTemplate, setSelectedTemplate] = useState("custom");
  const [stages, setStages] = useState(defaultTemplates.custom);
  const [pipelineName, setPipelineName] = useState("Sales Pipeline");

  const handleDragEnd = (result: any) => {
    if (!result.destination) return;

    const items = Array.from(stages);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    setStages(items);
  };

  const handleTemplateSelect = (template: keyof typeof defaultTemplates) => {
    setSelectedTemplate(template);
    setStages(defaultTemplates[template]);
  };

  const handleStageDelete = (index: number) => {
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

  const handleSave = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast({
          title: "Error",
          description: "You must be logged in to create a pipeline",
          variant: "destructive",
        });
        return;
      }

      // Create the pipeline
      const { data: pipeline, error: pipelineError } = await supabase
        .from('pipelines')
        .insert({
          name: pipelineName,
          user_id: user.id,
        })
        .select()
        .single();

      if (pipelineError) throw pipelineError;

      // Create the stages
      const stageData = stages.map((name, position) => ({
        name,
        position,
        pipeline_id: pipeline.id
      }));

      const { error: stagesError } = await supabase
        .from('pipeline_stages')
        .insert(stageData);

      if (stagesError) throw stagesError;

      toast({
        title: "Success",
        description: "Pipeline created successfully",
      });
      
      onSave();
      onClose();
    } catch (error) {
      console.error('Error creating pipeline:', error);
      toast({
        title: "Error",
        description: "Failed to create pipeline",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Set up your pipeline</DialogTitle>
          <p className="text-muted-foreground">
            Building relationships with clients is a process. Customize the stages that you go
            through when working with clients or choose a pre-built template.
          </p>
        </DialogHeader>

        <div className="grid grid-cols-[250px,1fr] gap-8 pt-4">
          <div className="space-y-4">
            <h3 className="font-medium mb-2">Templates</h3>
            <div className="space-y-1">
              {Object.keys(defaultTemplates).map((template) => (
                <button
                  key={template}
                  onClick={() => handleTemplateSelect(template as keyof typeof defaultTemplates)}
                  className={`w-full text-left px-3 py-1.5 rounded text-sm ${
                    selectedTemplate === template
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-muted"
                  }`}
                >
                  {template}
                </button>
              ))}
            </div>
          </div>

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
        </div>
      </DialogContent>
    </Dialog>
  );
}
