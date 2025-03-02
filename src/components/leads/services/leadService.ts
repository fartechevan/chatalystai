
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
