import type { Conversation, ConversationParticipant } from "../types";
import type { Customer } from "../types/customer";

/**
 * Processes conversations to add customer names based on lead and participant data.
 * @param conversations - The raw list of conversations.
 * @param participantsData - A map of conversation IDs to their participants.
 * @param customersData - A map of customer IDs to customer details.
 * @returns The list of conversations with customer_name added.
 */
export function processConversationsWithCustomerNames(
  conversations: Conversation[],
  participantsData: Record<string, ConversationParticipant[]>,
  customersData: Record<string, Customer>
): Conversation[] {
  return conversations.map(conv => {
    const processedConv: Conversation = {
      ...conv,
      participants: participantsData[conv.conversation_id] || []
    };

    // Priority 1: Use lead's customer data
    if (conv.lead?.customer_id && customersData[conv.lead.customer_id]) {
      processedConv.customer_name = customersData[conv.lead.customer_id].name;
    }
    // Priority 2: Use participant's customer data
    else {
      const conversationParticipants = participantsData[conv.conversation_id] || [];
      const memberParticipant = conversationParticipants.find(p => p.role === 'member');
      if (memberParticipant?.customer_id && customersData[memberParticipant.customer_id]) {
        processedConv.customer_name = customersData[memberParticipant.customer_id].name;
      }
      // Priority 3: Fallback to participant's external identifier (phone number)
      else if (memberParticipant?.external_user_identifier) {
        processedConv.customer_name = memberParticipant.external_user_identifier;
      }
    }
    return processedConv;
  });
}

/**
 * Filters conversations based on a search query.
 * Searches in customer name, customer details (if linked via lead), and lead ID.
 * @param conversations - The list of conversations (ideally already processed with customer names).
 * @param customersData - A map of customer IDs to customer details.
 * @param searchQuery - The search string.
 * @returns The filtered list of conversations.
 */
export function filterConversations(
  conversations: Conversation[],
  customersData: Record<string, Customer>,
  searchQuery: string
): Conversation[] {
  if (!searchQuery.trim()) {
    return conversations; // Return all if no search query
  }

  const searchLower = searchQuery.toLowerCase();

  return conversations.filter(conv => {
    // Search in customer name (already added in processing step)
    if (conv.customer_name && typeof conv.customer_name === 'string' && conv.customer_name.toLowerCase().includes(searchLower)) {
      return true;
    }

    // Search in linked customer data (name, phone)
    if (conv.lead?.customer_id && customersData[conv.lead.customer_id]) {
      const customer = customersData[conv.lead.customer_id];
      if (customer.name && typeof customer.name === 'string' && customer.name.toLowerCase().includes(searchLower)) {
        return true;
      }
      if (customer.phone_number && typeof customer.phone_number === 'string' && customer.phone_number.toLowerCase().includes(searchLower)) {
        return true;
      }
    }

    // Search in lead_id
    if (conv.lead_id && typeof conv.lead_id === 'string' && conv.lead_id.toLowerCase().includes(searchLower)) {
      return true;
    }

    return false;
  });
}
