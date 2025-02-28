
import type { Conversation } from "../types";

export function transformConversationsData(
  conversationsData: any[],
  profiles: any[],
  customers: any[]
) {
  // Since the data is already transformed in the API, we just return it
  // Make sure we include the lead_id field in the conversations
  return conversationsData as Conversation[];
}
