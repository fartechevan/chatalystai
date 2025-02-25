
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface LeadFormData {
  name: string;
  value: string;
  contact_first_name: string;
  contact_phone: string;
  contact_email: string;
  company_name: string;
  company_address: string;
}

const initialFormData: LeadFormData = {
  name: "",
  value: "",
  contact_first_name: "",
  contact_phone: "",
  contact_email: "",
  company_name: "",
  company_address: ""
};

export function useLeadForm(pipelineStageId: string | null, onSuccess: () => void) {
  const { toast } = useToast();
  const [formData, setFormData] = useState<LeadFormData>(initialFormData);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const resetForm = () => {
    setFormData(initialFormData);
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
      
      onSuccess();
      resetForm();
    } catch (error) {
      console.error('Error adding lead:', error);
      toast({
        title: "Error",
        description: "Failed to add lead",
        variant: "destructive",
      });
    }
  };

  return {
    formData,
    handleChange,
    handleSubmit,
    resetForm
  };
}
