
import { supabase } from "@/integrations/supabase/client";
import type { Lead } from "../types";

/**
 * Fetches a lead by its ID
 */
export async function fetchLeadById(leadId: string): Promise<Lead | null> {
  if (!leadId) return null;
  
  const { data, error } = await supabase
    .from('leads')
    .select('*')
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
    name: data.name,
    created_at: data.created_at,
    updated_at: data.updated_at || undefined,
    user_id: data.user_id,
    pipeline_stage_id: data.pipeline_stage_id || null,
    customer_id: data.customer_id || null,
    value: data.value || null,
    company_name: data.company_name || null,
    company_address: data.company_address || null,
    contact_email: data.contact_email || null,
    contact_phone: data.contact_phone || null,
    contact_first_name: data.contact_first_name || null
  };
  
  return lead;
}

/**
 * Fetches a lead associated with a conversation
 */
export async function fetchLeadByConversation(conversationId: string): Promise<Lead | null> {
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
}
