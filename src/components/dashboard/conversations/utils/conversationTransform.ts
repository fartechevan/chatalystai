
import type { Conversation } from "../types";

export function transformConversationsData(
  conversationsData: any[],
  profiles: any[],
  customers: any[]
) {
  // Since the data is already transformed in the API, we just return it
  return conversationsData as Conversation[];
}
