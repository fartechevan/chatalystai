
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface AddLeadDialogProps {
  isOpen: boolean;
  onClose: () => void;
  pipelineStageId: string;
  onLeadAdded: () => void;
}

export function AddLeadDialog({ isOpen, onClose, pipelineStageId, onLeadAdded }: AddLeadDialogProps) {
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [value, setValue] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [contactName, setContactName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pipelineId, setPipelineId] = useState<string | null>(null);

  useEffect(() => {
    // Get the pipeline_id for the given stage_id
    async function getPipelineId() {
      if (!pipelineStageId) return;
      
      const { data, error } = await supabase
        .from('pipeline_stages')
        .select('pipeline_id')
        .eq('id', pipelineStageId)
        .single();
      
      if (error) {
        console.error('Error fetching pipeline_id:', error);
      } else if (data) {
        setPipelineId(data.pipeline_id);
      }
    }
    
    getPipelineId();
  }, [pipelineStageId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      toast({
        title: "Name is required",
        description: "Please enter a name for the lead",
        variant: "destructive",
      });
      return;
    }

    if (!pipelineId) {
      toast({
        title: "Pipeline not found",
        description: "Could not determine the pipeline for this stage",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // 1. Insert the new lead into the leads table
      const { data: leadData, error: leadError } = await supabase
        .from('leads')
        .insert([{
          name: name.trim(),
          value: parseFloat(value) || 0,
          company_name: companyName.trim() || null,
          contact_first_name: contactName.trim() || null,
          pipeline_stage_id: pipelineStageId,
          user_id: (await supabase.auth.getUser()).data.user?.id || 'unknown'
        }])
        .select();

      if (leadError) {
        throw leadError;
      }

      if (!leadData || leadData.length === 0) {
        throw new Error("Failed to create lead");
      }

      const newLead = leadData[0];

      // 2. Get the current position (max + 1) for the stage
      const { data: positionData, error: positionError } = await supabase
        .from('lead_pipeline')
        .select('position')
        .eq('stage_id', pipelineStageId)
        .order('position', { ascending: false })
        .limit(1);

      if (positionError) {
        throw positionError;
      }

      const position = positionData && positionData.length > 0 
        ? positionData[0].position + 1 
        : 0;

      // 3. Insert the lead into the lead_pipeline table
      const { error: pipelineError } = await supabase
        .from('lead_pipeline')
        .insert({
          lead_id: newLead.id,
          stage_id: pipelineStageId,
          pipeline_id: pipelineId,
          position: position
        });

      if (pipelineError) {
        throw pipelineError;
      }

      toast({
        title: "Lead created",
        description: `${name} has been added to the pipeline`,
      });

      // Reset form
      setName("");
      setValue("");
      setCompanyName("");
      setContactName("");
      
      // Notify parent
      onLeadAdded();
      onClose();
    } catch (error) {
      console.error('Error creating lead:', error);
      toast({
        title: "Error",
        description: "Failed to create lead. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Add New Lead</DialogTitle>
            <DialogDescription>
              Create a new lead in this pipeline stage.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                Name
              </Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="col-span-3"
                placeholder="Lead name or opportunity"
                required
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="value" className="text-right">
                Value (RM)
              </Label>
              <Input
                id="value"
                type="number"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                className="col-span-3"
                placeholder="Estimated value"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="company" className="text-right">
                Company
              </Label>
              <Input
                id="company"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="col-span-3"
                placeholder="Company name (optional)"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="contact" className="text-right">
                Contact
              </Label>
              <Input
                id="contact"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                className="col-span-3"
                placeholder="Contact name (optional)"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Adding..." : "Add Lead"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
