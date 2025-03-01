
import type { Conversation } from "../types";
import { supabase } from "@/integrations/supabase/client";

export async function transformConversationsData(data: any) {
  const transformedConversations: Conversation[] = [];
  
  if (!data || !data.conversations) {
    return transformedConversations;
  }
  
  for (const conversation of data.conversations) {
    // Fetch participants for this conversation
    const { data: participants, error: participantsError } = await supabase
      .from('conversation_participants')
      .select('*, profiles:user_id(*)')
      .eq('conversation_id', conversation.conversation_id);
    
    if (participantsError) {
      console.error('Error fetching participants:', participantsError);
      continue;
    }
    
    // Find customer participant (non-admin)
    let customerName = 'Unknown Customer';
    const customerParticipant = participants?.find(p => p.role !== 'admin') || null;
    
    // If we found a customer, try to get their name
    if (customerParticipant) {
      if (customerParticipant.external_user_identifier) {
        // Try to fetch customer data if we have an external identifier
        const { data: customerData, error: customerError } = await supabase
          .from('customers')
          .select('name')
          .eq('id', customerParticipant.external_user_identifier)
          .single();
        
        if (!customerError && customerData) {
          customerName = customerData.name;
        }
      } else if (customerParticipant.profiles) {
        // Use profile name if available
        customerName = customerParticipant.profiles.name || customerParticipant.profiles.email || 'Unknown user';
      }
    }
    
    transformedConversations.push({
      ...conversation,
      participants: participants || [],
      customer_name: customerName
    });
  }
  
  return transformedConversations;
}
