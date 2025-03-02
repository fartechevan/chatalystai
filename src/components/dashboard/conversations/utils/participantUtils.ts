
import { Conversation, ConversationParticipant } from "../types";

export function getMainParticipant(conversation: Conversation | null) {
  if (!conversation || !conversation.participants || conversation.participants.length === 0) {
    return null;
  }
  
  // Find the participant that is not an admin (likely the customer)
  return conversation.participants.find(p => p.role !== 'admin') || conversation.participants[0];
}

export function getCustomerName(conversation: Conversation | null) {
  if (!conversation) return 'Unknown';
  
  if (conversation.customer_name) {
    return conversation.customer_name;
  }
  
  const mainParticipant = getMainParticipant(conversation);
  if (mainParticipant?.profiles?.name) {
    return mainParticipant.profiles.name;
  }
  
  return 'Unknown Customer';
}

export function getCustomerEmail(conversation: Conversation | null) {
  if (!conversation) return '';
  
  const mainParticipant = getMainParticipant(conversation);
  if (mainParticipant?.profiles?.email) {
    return mainParticipant.profiles.email;
  }
  
  return '';
}

export function getFirstInitial(conversation: Conversation | null) {
  const name = getCustomerName(conversation);
  return name.charAt(0) || 'U';
}
