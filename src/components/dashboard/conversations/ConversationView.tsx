import { MessageSquare } from "lucide-react";
import { useState, useEffect } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Conversation } from "./types";
import { toast } from "sonner";
import { ConversationLeftPanel } from "./ConversationLeftPanel";
import { MessageList } from "./MessageList";
import { MessageInput } from "./MessageInput";
import { ConversationRightPanel } from "./ConversationRightPanel";

export function ConversationView() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [leftPanelOpen, setLeftPanelOpen] = useState(true);
  const [rightPanelOpen, setRightPanelOpen] = useState(true);
  const [newMessage, setNewMessage] = useState("");
  const queryClient = useQueryClient();

  // Set up real-time subscriptions
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
          console.log('Conversation change detected:', payload);
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
          console.log('Message change detected:', payload);
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

  const { data: messages = [] } = useQuery({
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
    onSuccess: () => {
      setNewMessage("");
    },
    onError: (error) => {
      toast.error("Failed to send message");
      console.error('Error sending message:', error);
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
    <div className="h-full">
      <div className="flex h-full">
        <ConversationLeftPanel
          leftPanelOpen={leftPanelOpen}
          setLeftPanelOpen={setLeftPanelOpen}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          filteredConversations={filteredConversations}
          selectedConversation={selectedConversation}
          setSelectedConversation={setSelectedConversation}
        />

        <div className="flex-1 flex flex-col">
          <div className="flex items-center gap-4 border-b px-6 py-4">
            <h2 className="text-xl font-semibold">Chat</h2>
            <MessageSquare className="h-4 w-4" />
          </div>

          <ScrollArea className="flex-1 px-6 py-4">
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
          </ScrollArea>

          <MessageInput
            newMessage={newMessage}
            setNewMessage={setNewMessage}
            handleSendMessage={handleSendMessage}
            isLoading={sendMessageMutation.isPending}
          />
        </div>

        <ConversationRightPanel
          rightPanelOpen={rightPanelOpen}
          setRightPanelOpen={setRightPanelOpen}
          selectedConversation={selectedConversation}
          messages={messages}
        />
      </div>
    </div>
  );
}
