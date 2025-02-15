
import { useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Conversation } from "./types";
import { toast } from "sonner";
import { ConversationLeftPanel } from "./ConversationLeftPanel";
import { MessageList } from "./MessageList";
import { MessageInput } from "./MessageInput";
import { Separator } from "@/components/ui/separator";
import { ConversationHeader } from "./ConversationHeader";
import { ConversationSummary } from "./ConversationSummary";
import { ConversationUserDetails } from "./ConversationUserDetails";
import { useConversationRealtime } from "./useConversationRealtime";

export function ConversationView() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [leftPanelOpen, setLeftPanelOpen] = useState(true);
  const [newMessage, setNewMessage] = useState("");
  const [summary, setSummary] = useState<string | null>(null);
  const queryClient = useQueryClient();

  useConversationRealtime(queryClient, selectedConversation);

  const { data: conversations = [], isLoading } = useQuery({
    queryKey: ['conversations'],
    queryFn: async () => {
      console.log('Fetching conversations...');
      
      const { data, error } = await supabase
        .from('conversations')
        .select(`
          conversation_id,
          sender_id,
          receiver_id,
          created_at,
          updated_at,
          sender:profiles!conversations_sender_id_fkey(id, name, email),
          receiver:profiles!conversations_receiver_id_fkey(id, name, email)
        `)
        .order('updated_at', { ascending: false });

      if (error) {
        console.error('Error fetching conversations:', error);
        throw error;
      }
      
      console.log('Fetched conversations:', data);
      return data as Conversation[];
    },
  });

  const { data: messages = [], refetch: refetchMessages } = useQuery({
    queryKey: ['messages', selectedConversation?.conversation_id],
    queryFn: async () => {
      if (!selectedConversation) return [];
      
      console.log('Fetching messages for conversation:', selectedConversation.conversation_id);
      
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', selectedConversation.conversation_id)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching messages:', error);
        throw error;
      }
      
      console.log('Fetched messages:', data);
      return data;
    },
    enabled: !!selectedConversation,
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user || !selectedConversation) throw new Error('Not authenticated or no conversation selected');

      const { data, error } = await supabase
        .from('messages')
        .insert([{
          conversation_id: selectedConversation.conversation_id,
          sender_id: userData.user.id,
          content
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: async () => {
      setNewMessage("");
      // Immediately refetch messages after sending
      await refetchMessages();
      // Also update the conversations list to reflect the latest message
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      toast.success("Message sent successfully");
    },
    onError: (error) => {
      toast.error("Failed to send message");
      console.error('Error sending message:', error);
    }
  });

  const summarizeMutation = useMutation({
    mutationFn: async () => {
      if (!selectedConversation || messages.length === 0) return null;
      
      const messagesWithConversation = messages.map(msg => ({
        ...msg,
        conversation: selectedConversation
      }));

      const { data, error } = await supabase.functions.invoke('summarize-conversation', {
        body: { messages: messagesWithConversation }
      });

      if (error) throw error;
      return data.summary;
    },
    onSuccess: (summary) => {
      if (summary) {
        setSummary(summary);
        toast.success("Conversation summarized");
      }
    },
    onError: (error) => {
      toast.error("Failed to summarize conversation");
      console.error("Summarization error:", error);
    }
  });

  const filteredConversations = conversations.filter(conv => {
    const searchLower = searchQuery.toLowerCase();
    return (
      conv.sender.name?.toLowerCase().includes(searchLower) ||
      conv.sender.email.toLowerCase().includes(searchLower) ||
      conv.receiver.name?.toLowerCase().includes(searchLower) ||
      conv.receiver.email.toLowerCase().includes(searchLower)
    );
  });

  const handleSendMessage = () => {
    if (!newMessage.trim()) return;
    sendMessageMutation.mutate(newMessage.trim());
  };

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col relative">
      <div className="flex-1 flex min-h-0">
        <ConversationLeftPanel
          leftPanelOpen={leftPanelOpen}
          setLeftPanelOpen={setLeftPanelOpen}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          filteredConversations={filteredConversations}
          selectedConversation={selectedConversation}
          setSelectedConversation={setSelectedConversation}
        />

        <div className="flex-1 flex flex-col min-h-0">
          <ConversationHeader />

          <div className="flex-1 overflow-hidden">
            <ScrollArea className="h-full">
              <div className="px-6 py-4">
                {isLoading ? (
                  <div className="flex items-center justify-center h-full">
                    <p>Loading messages...</p>
                  </div>
                ) : !selectedConversation ? (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-muted-foreground">Select a conversation to view messages.</p>
                  </div>
                ) : (
                  <MessageList
                    messages={messages}
                    selectedConversation={selectedConversation}
                  />
                )}
              </div>
            </ScrollArea>
          </div>

          <MessageInput
            newMessage={newMessage}
            setNewMessage={setNewMessage}
            handleSendMessage={handleSendMessage}
            isLoading={sendMessageMutation.isPending}
            selectedConversation={!!selectedConversation}
          />

          {selectedConversation && (
            <>
              <ConversationSummary
                summarizeMutation={summarizeMutation}
                summary={summary}
                hasMessages={messages.length > 0}
              />
              <Separator />
              <ConversationUserDetails
                conversation={selectedConversation}
                messages={messages}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
