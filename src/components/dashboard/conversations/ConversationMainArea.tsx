
import React from "react";
import { MessageInput } from "./MessageInput";
import { MessageList } from "./MessageList";
import { Button } from "@/components/ui/button";
import { RefreshCcw } from "lucide-react";
import { UseMutationResult } from "@tanstack/react-query";
import type { Conversation, Message } from "./types";

interface ConversationMainAreaProps {
  selectedConversation: Conversation | null;
  isLoading: boolean;
  messages: Message[];
  newMessage: string;
  setNewMessage: (message: string) => void;
  handleSendMessage: () => void;
  sendMessageMutation: UseMutationResult<any, Error, string, unknown>; // Make this generic
  summarizeMutation: UseMutationResult<any, Error, any, unknown>; // Make this generic
  summary?: string | null;
  summaryTimestamp?: string | null;
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
  // Handle the case when no conversation is selected
  if (!selectedConversation) {
    return (
      <div className="flex-1 flex flex-col">
        <div className="flex-1 flex items-center justify-center p-8 text-muted-foreground">
          Select a conversation to view messages
        </div>
      </div>
    );
  }

  const isSummarizing = summarizeMutation.isPending;
  const hasMessages = messages && messages.length > 0;

  return (
    <div className="flex-1 flex flex-col border-l">
      {/* Header */}
      <div className="p-4 border-b flex items-center justify-between bg-muted/30">
        <h2 className="font-medium truncate">
          {selectedConversation?.customer_name || "Conversation"}
        </h2>
        {hasMessages && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => summarizeMutation.mutate()}
            disabled={isSummarizing}
          >
            {isSummarizing ? (
              <>
                <RefreshCcw className="mr-2 h-4 w-4 animate-spin" />
                Summarizing...
              </>
            ) : (
              <>
                <RefreshCcw className="mr-2 h-4 w-4" />
                Generate Summary
              </>
            )}
          </Button>
        )}
      </div>

      {/* Messages area */}
      <MessageList
        messages={messages}
        isLoading={isLoading}
        summary={summary}
        summaryTimestamp={summaryTimestamp}
      />

      {/* Input area */}
      <MessageInput
        newMessage={newMessage}
        setNewMessage={setNewMessage}
        handleSendMessage={handleSendMessage}
        sendMessageMutation={sendMessageMutation}
        selectedConversation={!!selectedConversation}
      />
    </div>
  );
}
