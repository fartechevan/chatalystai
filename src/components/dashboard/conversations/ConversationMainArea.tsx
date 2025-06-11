
import { useState, useEffect } from "react";
import { Loader2, MessagesSquare } from "lucide-react"; // Added MessagesSquare
import { UseMutationResult } from "@tanstack/react-query";
import { Button } from "@/components/ui/button"; // Added Button import

import type { Conversation, Message as MessageType } from "./types";
import { ConversationHeader } from "./ConversationHeader";
import { MessageList } from "./components/MessageList";
import { MessageInput } from "./components/MessageInput";

interface ConversationMainAreaProps {
  selectedConversation: Conversation | null;
  isLoading: boolean; // Overall loading for initial load
  messages: MessageType[];
  isFetchingNextPage?: boolean; // For loading more messages
  hasNextPage?: boolean; // To know if there are more messages to load
  fetchNextPage?: () => void; // Function to fetch next page
  newMessage: string;
  setNewMessage: (message: string) => void;
  handleSendMessage: (messageText: string, file?: File) => void; // Updated signature
  sendMessageMutation: UseMutationResult<unknown, Error, { chatId: string; message: string; file?: File }, unknown>; // Updated to match expected payload
  summarizeMutation: UseMutationResult<unknown, Error, unknown, unknown>; // Changed any to unknown
  summary: string | undefined;
  summaryTimestamp: string | undefined;
  isDesktop?: boolean; // Added isDesktop prop
  partnerName?: string; // Added partnerName prop
  onOpenLeadDetails?: () => void; // Added prop to trigger lead details drawer
}

export function ConversationMainArea({
  selectedConversation,
  isLoading, // This is the general loading state
  messages,
  isFetchingNextPage,
  hasNextPage,
  fetchNextPage,
  newMessage,
  setNewMessage,
  handleSendMessage,
  sendMessageMutation,
  summarizeMutation,
  summary,
  summaryTimestamp,
  isDesktop, // Destructured isDesktop
  partnerName, // Destructured partnerName
  onOpenLeadDetails, // Destructured prop
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
          <ConversationHeader 
            conversation={selectedConversation} 
            partnerName={partnerName} 
            onOpenLeadDetails={onOpenLeadDetails} // Pass prop to header
          />
          
          <MessageList 
            messages={messages} 
            isLoading={isLoading && messages.length === 0} // Show main loader only if no messages yet
            isFetchingNextPage={isFetchingNextPage}
            hasNextPage={hasNextPage}
            fetchNextPage={fetchNextPage}
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
        <div className="flex-1 flex flex-col items-center justify-center text-center p-6">
          <div className="border-border flex size-16 items-center justify-center rounded-full border-2 mb-4">
            <MessagesSquare className="size-8 text-muted-foreground" />
          </div >
          <h1 className="text-xl font-semibold mb-1">Your messages</h1>
          <p className="text-muted-foreground text-sm mb-4">Send a message to start a chat.</p>
          {/* The button below might trigger opening the conversation list on mobile, or be a general CTA */}
          {/* For now, it's a visual placeholder based on the reference */}
          <Button 
            onClick={() => { /* TODO: Define action, e.g., open convo list on mobile */ }}
            className="bg-blue-500 hover:bg-blue-600 text-white"
          >
            Send message
          </Button>
        </div>
      )}
    </div>
  );
}
