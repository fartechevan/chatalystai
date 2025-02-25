
import { Dialog, DialogContent, DialogTitle, DialogHeader } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Settings } from "lucide-react";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface AddLeadDialogProps {
  isOpen: boolean;
  onClose: () => void;
  pipelineStageId: string | null;
  onLeadAdded: () => void;
}

export function AddLeadDialog({ isOpen, onClose, pipelineStageId, onLeadAdded }: AddLeadDialogProps) {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    name: "",
    value: "",
    contact_first_name: "",
    contact_phone: "",
    contact_email: "",
    company_name: "",
    company_address: ""
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!pipelineStageId) {
      toast({
        title: "Error",
        description: "No pipeline stage selected",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast({
          title: "Error",
          description: "You must be logged in to add leads",
          variant: "destructive",
        });
        return;
      }

      // Get the pipeline ID for the stage
      const { data: stageData } = await supabase
        .from('pipeline_stages')
        .select('pipeline_id')
        .eq('id', pipelineStageId)
        .single();

      if (!stageData) {
        throw new Error('Could not find pipeline stage');
      }

      // Start a Supabase transaction by inserting the lead first
      const { data: leadData, error: leadError } = await supabase
        .from('leads')
        .insert({
          ...formData,
          value: parseFloat(formData.value) || 0,
          user_id: user.id
        })
        .select()
        .single();

      if (leadError) throw leadError;

      // Then create the lead_pipeline connection
      const { error: pipelineError } = await supabase
        .from('lead_pipeline')
        .insert({
          lead_id: leadData.id,
          pipeline_id: stageData.pipeline_id,
          stage_id: pipelineStageId,
          position: 0 // Default to the end of the list
        });

      if (pipelineError) throw pipelineError;

      toast({
        title: "Success",
        description: "Lead added successfully",
      });
      
      onLeadAdded();
      onClose();
      setFormData({
        name: "",
        value: "",
        contact_first_name: "",
        contact_phone: "",
        contact_email: "",
        company_name: "",
        company_address: ""
      });
    } catch (error) {
      console.error('Error adding lead:', error);
      toast({
        title: "Error",
        description: "Failed to add lead",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex justify-between items-center">
            Initial Contact
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="value">Value (RM)</Label>
            <Input
              id="value"
              name="value"
              type="number"
              value={formData.value}
              onChange={handleChange}
              placeholder="0"
            />
          </div>
          <div className="space-y-2">
            <Label>Contact Information</Label>
            <Input
              name="contact_first_name"
              value={formData.contact_first_name}
              onChange={handleChange}
              placeholder="First name"
              className="mb-2"
            />
            <Input
              name="contact_phone"
              value={formData.contact_phone}
              onChange={handleChange}
              placeholder="Phone"
              className="mb-2"
            />
            <Input
              name="contact_email"
              type="email"
              value={formData.contact_email}
              onChange={handleChange}
              placeholder="Email"
            />
          </div>
          <div className="space-y-2">
            <Label>Company Information</Label>
            <Input
              name="company_name"
              value={formData.company_name}
              onChange={handleChange}
              placeholder="Company name"
              className="mb-2"
            />
            <Input
              name="company_address"
              value={formData.company_address}
              onChange={handleChange}
              placeholder="Company address"
            />
          </div>
          <div className="flex justify-start gap-2 pt-4">
            <Button type="submit">Add</Button>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
