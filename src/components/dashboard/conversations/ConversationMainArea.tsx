
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { ConversationHeader } from "./ConversationHeader";
import { MessageList } from "./MessageList";
import { MessageInput } from "./MessageInput";
import { ConversationSummary } from "./ConversationSummary";
import { ConversationUserDetails } from "./ConversationUserDetails";
import type { Conversation, Message, ConversationSummary as ConversationSummaryType } from "./types";
import { UseMutationResult } from "@tanstack/react-query";

interface ConversationMainAreaProps {
  selectedConversation: Conversation | null;
  isLoading: boolean;
  messages: Message[];
  newMessage: string;
  setNewMessage: (message: string) => void;
  handleSendMessage: () => void;
  sendMessageMutation: UseMutationResult<any, Error, string>;
  summarizeMutation: UseMutationResult<ConversationSummaryType | null, Error, void>;
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
  return (
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
            summaryTimestamp={summaryTimestamp}
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
  );
}
