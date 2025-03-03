
import { MessageList } from "./MessageList";
import { MessageInput } from "./MessageInput";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MoreHorizontal, ChevronLeft, MessageSquare } from "lucide-react";
import type { Conversation, Message } from "./types";
import type { UseMutationResult } from "@tanstack/react-query";

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
  if (!selectedConversation) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-muted/10">
        <MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
        <p className="text-muted-foreground">Select a conversation to start chatting</p>
      </div>
    );
  }

  const getConversationName = () => {
    if (selectedConversation.lead) {
      if (selectedConversation.lead.contact_first_name) {
        return selectedConversation.lead.contact_first_name;
      }
      if (selectedConversation.lead.name) {
        return selectedConversation.lead.name;
      }
    }
    
    if (selectedConversation.customer_name) {
      return selectedConversation.customer_name;
    }
    
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
