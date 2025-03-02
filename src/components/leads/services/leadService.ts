
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export async function moveLead(
  leadId: string, 
  sourceStageId: string, 
  destinationStageId: string, 
  destinationIndex: number
) {
  try {
    const { error } = await supabase
      .from('lead_pipeline')
      .update({
        stage_id: destinationStageId,
        position: destinationIndex
      })
      .eq('lead_id', leadId);

    if (error) throw error;

    const { error: leadUpdateError } = await supabase
      .from('leads')
      .update({
        pipeline_stage_id: destinationStageId
      })
      .eq('id', leadId);

    if (leadUpdateError) {
      console.error('Error updating lead pipeline_stage_id:', leadUpdateError);
      throw leadUpdateError;
    }

    return { success: true };
  } catch (error) {
    console.error('Error moving lead:', error);
    return { success: false, error };
  }
}

export async function createLead(data: {
  name: string;
  value?: number;
  pipelineStageId: string;
  userId: string;
  customerInfo?: {
    name: string;
    phone_number: string;
    email?: string;
    company_name?: string;
    company_address?: string;
  }
}) {
  try {
    let customerId: string | null = null;
    
    // Create customer first if customer info is provided
    if (data.customerInfo) {
      const { data: customerData, error: customerError } = await supabase
        .from('customers')
        .insert({
          name: data.customerInfo.name,
          phone_number: data.customerInfo.phone_number,
          email: data.customerInfo.email,
          company_name: data.customerInfo.company_name,
          company_address: data.customerInfo.company_address
        })
        .select('id')
        .single();
      
      if (customerError) {
        console.error('Error creating customer:', customerError);
        throw customerError;
      }
      
      customerId = customerData.id;
    }
    
    // Create the lead
    const { data: leadData, error: leadError } = await supabase
      .from('leads')
      .insert({
        user_id: data.userId,
        value: data.value || 0,
        pipeline_stage_id: data.pipelineStageId,
        customer_id: customerId
      })
      .select('id')
      .single();
    
    if (leadError) {
      console.error('Error creating lead:', leadError);
      throw leadError;
    }
    
    // Create lead pipeline entry
    const { error: pipelineError } = await supabase
      .from('lead_pipeline')
      .insert({
        lead_id: leadData.id,
        stage_id: data.pipelineStageId,
        pipeline_id: (await supabase.from('pipeline_stages').select('pipeline_id').eq('id', data.pipelineStageId).single()).data?.pipeline_id,
        position: 999 // High position, will be sorted later
      });
    
    if (pipelineError) {
      console.error('Error creating lead_pipeline entry:', pipelineError);
      throw pipelineError;
    }
    
    return { success: true, leadId: leadData.id, customerId };
  } catch (error) {
    console.error('Error in createLead:', error);
    return { success: false, error };
  }
}
