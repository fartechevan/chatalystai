
import { useState, useEffect } from "react";
import { Loader2, MessagesSquare } from "lucide-react"; // Added MessagesSquare
import { UseMutationResult } from "@tanstack/react-query";
import { Button } from "@/components/ui/button"; // Added Button import
import { cn } from "@/lib/utils";

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
  onMediaPreviewRequest: (message: MessageType) => void; // Added for media preview
}

export function ConversationMainArea({
  selectedConversation,
  isLoading,
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
  isDesktop,
  partnerName,
  onOpenLeadDetails,
  onMediaPreviewRequest,
}: ConversationMainAreaProps) {
  const isWhatsAppConversation = !!selectedConversation?.integrations_id;

  return (
    <div
      className={cn(
        "flex-1 flex flex-col min-h-0 border-r border-l relative",
        !selectedConversation && "items-center justify-center"
      )}
    >
      {selectedConversation ? (
        <>
          <ConversationHeader
            conversation={selectedConversation}
            partnerName={partnerName}
            onOpenLeadDetails={onOpenLeadDetails}
          />
          <MessageList
            messages={messages}
            isLoading={isLoading && messages.length === 0}
            isFetchingNextPage={isFetchingNextPage}
            hasNextPage={hasNextPage}
            fetchNextPage={fetchNextPage}
            conversation={selectedConversation}
            onMediaPreviewRequest={onMediaPreviewRequest}
          />
          <MessageInput
            newMessage={newMessage}
            setNewMessage={setNewMessage}
            handleSendMessage={handleSendMessage}
            sendMessageMutation={sendMessageMutation}
            isWhatsAppConversation={isWhatsAppConversation}
          />
          {summarizeMutation.isPending && (
            <div className="absolute inset-0 bg-background/80 flex items-center justify-center z-20">
              <div className="flex flex-col items-center gap-2 p-4 bg-card rounded-lg shadow-lg">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-muted-foreground">Summarizing conversation...</p>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="flex flex-col items-center justify-center text-center p-6 max-w-sm mx-auto">
          <div className="border-border flex size-16 items-center justify-center rounded-full border-2 mb-4 bg-muted/50">
            <MessagesSquare className="size-8 text-muted-foreground" />
          </div>
          <h1 className="text-xl font-semibold mb-1">Your Messages</h1>
          <p className="text-muted-foreground text-sm">
            Select a conversation from the left panel to start chatting.
          </p>
        </div>
      )}
    </div>
  );
}
