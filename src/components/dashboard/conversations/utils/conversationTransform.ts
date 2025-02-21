
import type { Conversation } from "../types";

export function transformConversationsData(
  conversationsData: any[],
  profiles: any[],
  customers: any[]
) {
  // Create lookup maps
  const profilesMap = new Map(profiles.map(p => [p.id, p]));
  const customersMap = new Map(customers.map(c => [c.id, c]));

  return conversationsData.map(conv => {
    const sender = conv.sender_type === 'profile' 
      ? profilesMap.get(conv.sender_id)
      : customersMap.get(conv.sender_id);
      
    const receiver = conv.receiver_type === 'profile'
      ? profilesMap.get(conv.receiver_id)
      : customersMap.get(conv.receiver_id);

    return {
      conversation_id: conv.conversation_id,
      sender_id: conv.sender_id,
      receiver_id: conv.receiver_id,
      sender_type: conv.sender_type,
      receiver_type: conv.receiver_type,
      created_at: conv.created_at,
      updated_at: conv.updated_at,
      sender: sender ? {
        id: sender.id,
        name: sender.name,
        email: sender.email
      } : null,
      receiver: receiver ? {
        id: receiver.id,
        name: receiver.name,
        email: receiver.email
      } : null
    } as Conversation;
  });
}
