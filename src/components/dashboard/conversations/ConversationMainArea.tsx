
import { MessageList } from "./MessageList";
import { MessageInput } from "./MessageInput";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MoreHorizontal, ChevronLeft, MessageSquare } from "lucide-react";
import type { Conversation, Message } from "./types";
import type { UseMutationResult } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface ConversationMainAreaProps {
  selectedConversation: Conversation | null;
  isLoading: boolean;
  messages: Message[];
  newMessage: string;
  setNewMessage: (message: string) => void;
  handleSendMessage: () => void;
  sendMessageMutation: UseMutationResult<any, Error, string>;
  summarizeMutation: UseMutationResult<any, Error, void>;
  summary: string | null;
  summaryTimestamp: string | null;
}

export function ConversationMainArea({
  selectedConversation,
  isLoading,
  messages,
  newMessage,
  setNewMessage,
  handleSendMessage,
  sendMessageMutation,
  summarizeMutation,
  summary,
  summaryTimestamp
}: ConversationMainAreaProps) {
  const [participantInfo, setParticipantInfo] = useState<Record<string, any>>({});

  useEffect(() => {
    const loadParticipantInfo = async () => {
      if (!selectedConversation?.conversation_id) return;

      try {
        const { data, error } = await supabase
          .from('conversation_participants')
          .select('id, user_id, external_user_identifier, role')
          .eq('conversation_id', selectedConversation.conversation_id);

        if (error) throw error;

        const participantMap: Record<string, any> = {};
        for (const participant of data || []) {
          participantMap[participant.id] = participant;
        }

        setParticipantInfo(participantMap);
      } catch (err) {
        console.error('Error loading participant info:', err);
      }
    };

    loadParticipantInfo();
  }, [selectedConversation?.conversation_id]);

  if (!selectedConversation) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-muted/10">
        <MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
        <p className="text-muted-foreground">Select a conversation to start chatting</p>
      </div>
    );
  }

  const getConversationName = () => {
    // First check participant info for a member role
    const memberParticipant = Object.values(participantInfo).find(
      (p) => p.role === 'member'
    );
    
    if (memberParticipant && memberParticipant.external_user_identifier) {
      return memberParticipant.external_user_identifier;
    }
    
    // Then try to get name from customer_name in conversation
    if (selectedConversation.customer_name) {
      return selectedConversation.customer_name;
    }
    
    // Try to get name from lead
    if (selectedConversation.lead) {
      // Use name from lead (which comes from customer)
      if (selectedConversation.lead.name) {
        return selectedConversation.lead.name;
      }
      
      // Use company name as fallback from lead
      if (selectedConversation.lead.company_name) {
        return selectedConversation.lead.company_name;
      }
    }
    
    // Last resort: use lead_id
    if (selectedConversation.lead_id) {
      return `Lead #${selectedConversation.lead_id.slice(0, 6)}`;
    }
    
    return 'Unknown Customer';
  };

  return (
    <div className="flex-1 flex flex-col bg-background">
      <div className="border-b p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="md:hidden">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div>
              <h2 className="text-lg font-semibold flex items-center gap-2">
                {getConversationName()}
              </h2>
              {selectedConversation.lead_id && (
                <p className="text-xs text-muted-foreground">
                  Lead #{selectedConversation.lead_id.slice(0, 6)}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center">
            <Button variant="ghost" size="icon">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <ScrollArea className="flex-1 p-4">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <p>Loading messages...</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <MessageSquare className="h-10 w-10 text-muted-foreground mb-2" />
            <p className="text-muted-foreground">No messages in this conversation</p>
            <p className="text-xs text-muted-foreground mt-1">Start typing below to send a message</p>
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
        selectedConversation={!!selectedConversation}
      />
    </div>
  );
}
