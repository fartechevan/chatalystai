
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { QueryClient } from "@tanstack/react-query";
import type { Conversation } from "./types";

export function useConversationRealtime(
  queryClient: QueryClient,
  selectedConversation: Conversation | null
) {
  useEffect(() => {
    const conversationsChannel = supabase
      .channel('conversations-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conversations'
        },
        (payload) => {
          queryClient.invalidateQueries({ queryKey: ['conversations'] });
        }
      )
      .subscribe();

    const messagesChannel = supabase
      .channel('messages-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
          filter: selectedConversation 
            ? `conversation_id=eq.${selectedConversation.conversation_id}`
            : undefined
        },
        (payload) => {
          if (selectedConversation) {
            queryClient.invalidateQueries({ 
              queryKey: ['messages', selectedConversation.conversation_id] 
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(conversationsChannel);
      supabase.removeChannel(messagesChannel);
    };
  }, [selectedConversation, queryClient]);
}
