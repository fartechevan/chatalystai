
import { supabase } from "@/integrations/supabase/client";
import type { Conversation, Lead } from "../types";
import { fetchLeadById } from "../api/services/leadService";

export async function createMockLeadFromConversation(conversation: Conversation): Promise<Lead | null> {
  if (!conversation) return null;

  try {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) throw new Error('Not authenticated');

    // Create a new lead based on conversation data
    const { data: newLead, error } = await supabase
      .from('leads')
      .insert([{
        name: `Lead from ${conversation.receiver?.name || 'Unknown'}`,
        user_id: userData.user.id,
        contact_email: conversation.receiver?.email || null,
        contact_first_name: conversation.receiver?.name || null,
      }])
      .select()
      .single();

    if (error) throw error;
    
    // Link the lead to the conversation
    await supabase
      .from('conversations')
      .update({ lead_id: newLead.id })
      .eq('conversation_id', conversation.conversation_id);
    
    return newLead;
  } catch (error) {
    console.error('Error creating lead from conversation:', error);
    return null;
  }
}

export async function handleCustomerId(customerId: string, leadId: string): Promise<boolean> {
  try {
    // Link the customer to the lead
    const { error } = await supabase
      .from('leads')
      .update({ customer_id: customerId })
      .eq('id', leadId);
    
    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error linking customer to lead:', error);
    return false;
  }
}

export async function createMockLeadAndCustomer(
  conversation: Conversation, 
  customerName: string, 
  customerEmail: string | null = null,
  customerPhone: string | null = null
): Promise<Lead | null> {
  if (!conversation) return null;

  try {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) throw new Error('Not authenticated');

    // 1. Create a customer first
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .insert([{
        name: customerName,
        email: customerEmail,
        phone_number: customerPhone || 'Unknown',
      }])
      .select()
      .single();

    if (customerError) throw customerError;

    // 2. Now create a lead linked to the customer
    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .insert([{
        name: `Lead for ${customerName}`,
        user_id: userData.user.id,
        customer_id: customer.id,
        contact_email: customerEmail,
        contact_first_name: customerName.split(' ')[0] || null,
      }])
      .select()
      .single();

    if (leadError) throw leadError;
    
    // 3. Update the conversation with the lead ID
    await supabase
      .from('conversations')
      .update({ lead_id: lead.id })
      .eq('conversation_id', conversation.conversation_id);
    
    return lead;
  } catch (error) {
    console.error('Error creating lead and customer:', error);
    return null;
  }
}
