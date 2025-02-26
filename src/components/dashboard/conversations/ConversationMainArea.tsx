
import { MessageList } from "./MessageList";
import { MessageInput } from "./MessageInput";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MoreHorizontal, ChevronLeft } from "lucide-react";
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
      <div className="flex-1 flex items-center justify-center">
        <p className="text-muted-foreground">Select a conversation to start chatting</p>
      </div>
    );
  }

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
                Lead #{selectedConversation.conversation_id.slice(0, 6)}
              </h2>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Tabs defaultValue="main" className="w-auto">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="main">Main</TabsTrigger>
                <TabsTrigger value="statistics">Statistics</TabsTrigger>
                <TabsTrigger value="media">Media</TabsTrigger>
                <TabsTrigger value="setup">Setup</TabsTrigger>
              </TabsList>
            </Tabs>
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
