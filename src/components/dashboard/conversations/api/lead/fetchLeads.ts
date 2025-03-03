
import { supabase } from "@/integrations/supabase/client";
import type { Lead } from "../../types";

/**
 * Fetches a lead by its ID
 */
export async function fetchLeadById(leadId: string): Promise<Lead | null> {
  if (!leadId) return null;
  
  try {
    // Fetch lead with joined customer data
    const { data, error } = await supabase
      .from('leads')
      .select(`
        *,
        customer:customers(
          name,
          company_name,
          company_address,
          email,
          phone_number
        )
      `)
      .eq('id', leadId)
      .maybeSingle();
    
    if (error) {
      console.error('Error fetching lead:', error);
      return null;
    } 
    
    if (!data) return null;
    
    // Create a properly typed Lead object with all properties explicitly cast
    const lead: Lead = {
      id: data.id,
      created_at: data.created_at,
      updated_at: data.updated_at || undefined,
      user_id: data.user_id,
      pipeline_stage_id: data.pipeline_stage_id || null,
      customer_id: data.customer_id || null,
      value: data.value || null,
      
      // Optional properties derived from customer data if available
      name: data.customer?.name || null,
      company_name: data.customer?.company_name || null,
      company_address: data.customer?.company_address || null,
      contact_email: data.customer?.email || null,
      contact_phone: data.customer?.phone_number || null,
      contact_first_name: data.customer?.name || null // Using customer name as first name
    };
    
    return lead;
  } catch (error) {
    console.error('Error in fetchLeadById:', error);
    return null;
  }
}

/**
 * Fetches a lead associated with a conversation
 */
export async function fetchLeadByConversation(conversationId: string): Promise<Lead | null> {
  if (!conversationId) return null;
  
  try {
    // First get the conversation to find its lead_id
    const { data: conversation, error } = await supabase
      .from('conversations')
      .select('lead_id')
      .eq('conversation_id', conversationId)
      .maybeSingle();
    
    if (error || !conversation?.lead_id) {
      console.log('No lead associated with this conversation:', conversationId);
      return null;
    }
    
    return fetchLeadById(conversation.lead_id);
  } catch (error) {
    console.error('Error in fetchLeadByConversation:', error);
    return null;
  }
}
