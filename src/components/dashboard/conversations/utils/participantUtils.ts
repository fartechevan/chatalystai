
import type { Conversation } from "../types";
import type { ConversationParticipant } from "../types/conversation";

export const findAdminParticipant = (conversation: Conversation): ConversationParticipant | undefined => {
  if (!conversation.participants || conversation.participants.length === 0) {
    return undefined;
  }
  
  return conversation.participants.find(p => p.role === 'admin') as ConversationParticipant | undefined;
};

export const findMemberParticipant = (conversation: Conversation): ConversationParticipant | undefined => {
  if (!conversation.participants || conversation.participants.length === 0) {
    return undefined;
  }
  
  return conversation.participants.find(p => p.role === 'member') as ConversationParticipant | undefined;
};
