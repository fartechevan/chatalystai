import { useQuery } from "@tanstack/react-query";
import { fetchConversations } from "../api/conversationsApi";

export function useConversationData() {
  const conversationsQuery = useQuery(['conversations'], fetchConversations);

  return {
    conversations: conversationsQuery.data,
    isLoading: conversationsQuery.isLoading,
    error: conversationsQuery.error,
  };
}
