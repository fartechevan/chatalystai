
import type { Conversation } from "../types";

/**
 * Transforms raw conversation data from Supabase into a format ready for display
 */
export function transformConversations(rawConversations: any[]): Conversation[] {
  return rawConversations.map(conv => {
    let customerName = 'Unknown Customer';
    
    // First priority: Use customer name from the lead's customer
    if (conv.lead?.customer_id && conv.customers?.[conv.lead.customer_id]) {
      customerName = conv.customers[conv.lead.customer_id].name;
    } 
    // Second priority: Use participant external identifier (for WhatsApp number)
    else if (conv.participants) {
      const memberParticipant = conv.participants.find(
        (p: any) => p.role === 'member' && p.external_user_identifier
      );
      
      if (memberParticipant) {
        customerName = memberParticipant.external_user_identifier;
      }
    }
    
    return {
      ...conv,
      customer_name: customerName,
    };
  });
}

/**
 * Adds profile information to conversation participants
 */
export function addProfilesToParticipants(participants: any[], profiles: any[]) {
  return participants.map(participant => {
    // We don't try to look up profiles by user_id anymore since that relation doesn't exist
    // Instead, we just pass through the participant data as is
    return {
      ...participant,
      // If we have profile data in the future, we can add it here
    };
  });
}
