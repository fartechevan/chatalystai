
import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react"; // Removed User icon, kept Loader2 for summary
import { UseMutationResult } from "@tanstack/react-query"; // Removed useMutation, useQueryClient
// Removed toast, supabase, Button imports

import type { Conversation, Message as MessageType } from "./types";
import { ConversationHeader } from "./ConversationHeader";
import { MessageList } from "./components/MessageList";
import { MessageInput } from "./components/MessageInput";

interface ConversationMainAreaProps {
  selectedConversation: Conversation | null;
  isLoading: boolean;
  messages: MessageType[];
  newMessage: string;
  setNewMessage: (message: string) => void;
  handleSendMessage: () => void;
  sendMessageMutation: UseMutationResult<unknown, Error, string, unknown>; // Changed any to unknown
  summarizeMutation: UseMutationResult<unknown, Error, unknown, unknown>; // Changed any to unknown
  summary: string | undefined;
  summaryTimestamp: string | undefined;
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
  summaryTimestamp,
}: ConversationMainAreaProps) {
  // Removed derivedCustomerId state, queryClient, useEffect for customer ID,
  // createLeadMutation, and handleCreateLead function.

  // Determine if this conversation is a WhatsApp conversation
  const isWhatsAppConversation = selectedConversation?.integrations_id
    ? true
    : false;
  // Removed showCreateLeadButton calculation

  return (
    <div
      className={`flex-1 flex flex-col min-h-0 border-r border-l relative ${
        !selectedConversation ? "items-center justify-center" : ""
      }`}
    >
      {selectedConversation ? (
        <>
          <ConversationHeader conversation={selectedConversation} />
          
          <MessageList 
            messages={messages} 
            isLoading={isLoading} 
            conversation={selectedConversation}
          />

          {/* Removed Create Lead Button Area */}

          <MessageInput
            newMessage={newMessage}
            setNewMessage={setNewMessage}
            handleSendMessage={handleSendMessage}
            sendMessageMutation={sendMessageMutation}
            isWhatsAppConversation={isWhatsAppConversation}
          />
          
          {summarizeMutation.isPending && (
            <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="h-8 w-8 animate-spin" />
                <p>Summarizing conversation...</p>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="text-center p-6">
          <h2 className="text-xl font-semibold mb-2">Select a conversation</h2>
          <p className="text-muted-foreground">Choose a conversation from the list to start chatting</p>
        </div>
      )}
    </div>
  );
}
